// Adapter pequeno de IndexedDB. Não contém sessão, SDK Firebase ou dados de outros módulos.
export const EM_ABERTO = ['pendente','incerta','enviando','conflito','recebida'];
export const escopoPonto = (uid, contexto) => JSON.stringify([uid,contexto.tipo,contexto.id||'']);
export const mesmaJornada = (a,b) => a.uid===b.uid && escopoPonto(a.uid,a.contexto)===escopoPonto(b.uid,b.contexto) && a.funcionarioId===b.funcionarioId && a.jornadaData===b.jornadaData;
export function criarFilaPonto({indexedDB=globalThis.indexedDB,nome='ap1303-ponto-v1',relogio=Date.now,limite=200}={}) {
  let conexao;
  async function abrir() {
    if(!indexedDB)throw Error('Armazenamento indisponível. Nenhuma tentativa foi salva ou enviada.');
    if(!conexao)conexao=new Promise((resolve,reject)=>{
      const r=indexedDB.open(nome,1);
      r.onupgradeneeded=()=>{r.result.createObjectStore('operacoes',{keyPath:'payload.operacaoId'});r.result.createObjectStore('leases',{keyPath:'escopo'});};
      r.onerror=()=>{conexao=null;reject(Error('Não foi possível abrir o armazenamento do ponto.'));};
      r.onblocked=()=>{conexao=null;reject(Error('Feche as outras abas para atualizar o armazenamento do ponto.'));};
      r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();conexao=null;};resolve(r.result);};
    });
    return conexao;
  }
  async function transacao(fn) {
    const db=await abrir();return new Promise((resolve,reject)=>{
      const tx=db.transaction(['operacoes','leases'],'readwrite'),ops=tx.objectStore('operacoes'),leases=tx.objectStore('leases');let resultado,erro;
      tx.oncomplete=()=>resolve(resultado);tx.onabort=()=>reject(erro||Error('Falha ao persistir o ponto. Nada foi anunciado como salvo.'));tx.onerror=()=>{};
      const r=ops.getAll(),l=leases.getAll();let n=0;
      const pronto=()=>{if(++n!==2)return;try{resultado=fn(r.result,l.result,ops,leases);}catch(e){erro=e;tx.abort();}};
      r.onsuccess=pronto;l.onsuccess=pronto;
    });
  }
  const pertence=(o,escopo)=>escopoPonto(o.payload.uid,o.payload.contexto)===escopo;
  return {
    aplicarRevisao:(escopo,resultado)=>transacao((todas,_locks,ops)=>{
      if(resultado?.origem!=='revisao_offline'||!['confirmado','rejeitada'].includes(resultado.status))throw Error('Resultado de revisão inválido.');
      const o=todas.find(o=>pertence(o,escopo)&&o.payload.operacaoId===resultado.operacaoId);
      if(!o)return false;
      if(o.payload.modalidade!=='offline_pendente'||o.payload.jornadaData!==resultado.jornadaData)throw Error('Revisão incompatível com a captura.');
      if(o.resultado?.decisaoId&&o.resultado.decisaoId===resultado.decisaoId&&o.status===resultado.status)return true;
      ops.put({...o,status:resultado.status,resultado,pausada:true,ultimoErro:'',atualizadaEmMs:relogio()});return true;
    }),
    listar:escopo=>transacao(todas=>todas.filter(o=>pertence(o,escopo)).sort((a,b)=>a.payload.capturadoEmMs-b.payload.capturadoEmMs)),
    listarConta:uid=>transacao(todas=>todas.filter(o=>o.payload.uid===uid)),
    inserir:payload=>transacao((todas,_l,ops)=>{
      if(todas.some(o=>o.payload.operacaoId===payload.operacaoId))throw Error('Este ID já foi persistido. Reconcilie a tentativa original.');
      if(todas.filter(o=>pertence(o,escopoPonto(payload.uid,payload.contexto))).length>=limite)throw Error(`A fila atingiu o limite de ${limite} operações. Limpe somente históricos finalizados ou solicite orientação; nenhuma pendência foi apagada.`);
      if(todas.some(o=>mesmaJornada(o.payload,payload)&&EM_ABERTO.includes(o.status)))throw Error('Esta jornada já possui uma tentativa não resolvida. Reconcilie a original.');
      ops.add({payload,status:'pendente',tentativas:0,tentativasCiclo:0,proximaTentativaMs:0,ultimoErro:'',atualizadaEmMs:relogio()});return payload.operacaoId;
    }),
    assumir:(escopo,dono)=>transacao((todas,locks,ops,leases)=>{
      const agora=relogio(),lock=locks.find(l=>l.escopo===escopo);
      if(lock&&lock.ateMs>agora)return null;
      const o=todas.filter(o=>pertence(o,escopo)&&!o.pausada&&['pendente','incerta','enviando'].includes(o.status)&&o.proximaTentativaMs<=agora).sort((a,b)=>a.payload.capturadoEmMs-b.payload.capturadoEmMs)[0];
      if(!o)return null;
      leases.put({escopo,dono,ateMs:agora+60000});o.status='enviando';o.tentativas++;o.tentativasCiclo=(o.tentativasCiclo||0)+1;o.atualizadaEmMs=agora;ops.put(o);return o;
    }),
    concluir:(escopo,dono,id,alteracoes)=>transacao((todas,locks,ops,leases)=>{
      if(!locks.some(l=>l.escopo===escopo&&l.dono===dono))return false;
      const o=todas.find(o=>o.payload.operacaoId===id&&pertence(o,escopo));
      if(o&&!(o.resultado?.origem==='revisao_offline'&&alteracoes.resultado?.origem!=='revisao_offline'))ops.put({...o,...alteracoes,payload:o.payload,atualizadaEmMs:relogio()});leases.delete(escopo);return true;
    }),
    // Somente históricos finalizados podem ser removidos por ação explícita; nunca pendências.
    limparFinalizados:escopo=>transacao((todas,_l,ops)=>{for(const o of todas)if(pertence(o,escopo)&&['confirmado','rejeitada'].includes(o.status))ops.delete(o.payload.operacaoId);}),
    retomarPausadas:escopo=>transacao((todas,_l,ops)=>{for(const o of todas)if(pertence(o,escopo)&&o.status==='incerta')ops.put({...o,pausada:false,tentativasCiclo:0,proximaTentativaMs:0});}),
    descartarNaoEnviadas:escopo=>transacao((todas,locks,ops)=>{
      if(locks.some(l=>l.escopo===escopo&&l.ateMs>relogio()))throw Error('Há um envio em andamento. Aguarde e reconcilie antes de descartar.');
      let n=0;for(const o of todas)if(pertence(o,escopo)&&o.payload.modalidade==='offline_pendente'&&o.status==='pendente'&&o.tentativas===0){ops.delete(o.payload.operacaoId);n++;}return n;
    }),
    assumirReconciliacao:(escopo,dono,id)=>transacao((todas,locks,_ops,leases)=>{
      if(locks.some(l=>l.escopo===escopo&&l.ateMs>relogio()))throw Error('Há envio em andamento. Aguarde antes de reconciliar.');
      const o=todas.find(o=>o.payload.operacaoId===id&&pertence(o,escopo));
      if(!o||!['pendente','incerta','enviando'].includes(o.status))return null;
      leases.put({escopo,dono,ateMs:relogio()+60000});return o;
    }),
    limparConta:uid=>transacao((todas,locks,ops,leases)=>{
      if(todas.some(o=>o.payload.uid===uid&&['pendente','incerta','enviando'].includes(o.status)))throw Error('Uma captura ainda não reconciliada foi preservada neste aparelho.');
      for(const o of todas)if(o.payload.uid===uid)ops.delete(o.payload.operacaoId);
      for(const l of locks){try{if(JSON.parse(l.escopo)[0]===uid)leases.delete(l.escopo);}catch{/* Não apagar escopo desconhecido. */}}
    }),
    fechar:async()=>{(await abrir()).close();conexao=null;},
  };
}
export const filaPonto=criarFilaPonto();
