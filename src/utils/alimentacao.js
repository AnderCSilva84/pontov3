export function planoNoDia(p,dia){
 return p.dataInicio<=dia&&(!p.dataFim||p.dataFim>=dia)&&(p.repeticao!=='uma_vez'||p.dataInicio===dia)&&(p.repeticao!=='dias'||p.diasSemana.includes(new Date(dia+'T12:00Z').getUTCDay()));
}

export function opcoesDaRefeicao(refeicao){
 return refeicao.opcoes?.length?refeicao.opcoes:[{id:'texto-legado',descricao:refeicao.sugestao||'',choGramas:null}];
}

export function valoresChoCadastrados(refeicao){
 return [...new Set(opcoesDaRefeicao(refeicao).map(o=>o.choGramas).filter(v=>v!==null&&v!==undefined&&String(v).trim()!=='').map(v=>Number(String(v).replace(',','.'))).filter(v=>Number.isFinite(v)&&v>=0&&v<=10000))];
}
export function reaproveitarChoAntigo(refeicao){
 if(refeicao.choModo)return refeicao;
 const valores=valoresChoCadastrados(refeicao);
 if(valores.length!==1)return refeicao;
 return {...refeicao,choModo:'total',choTotalGramas:refeicao.choTotalGramas??valores[0]};
}

// Horários da programação em Brasília (UTC−3). O próximo aviso assume a
// tela exatamente 30 minutos depois do horário da refeição anterior.
export function refeicaoEmDestaque(planos,agora=Date.now()){
 const hoje=new Date(agora-10800000).toISOString().slice(0,10),candidatas=[];
 for(const plano of planos){
  const inicio=plano.dataInicio>hoje?plano.dataInicio:hoje;
  for(let i=0;i<8;i++){
   const data=new Date(inicio+'T12:00:00Z');data.setUTCDate(data.getUTCDate()+i);
   const dia=data.toISOString().slice(0,10);
   if(!planoNoDia(plano,dia))continue;
   for(const refeicao of plano.refeicoes){
    const horarioMs=Date.parse(`${dia}T${refeicao.horario}:00-03:00`);
    if(agora<horarioMs+1800000)candidatas.push({plano,refeicao,dia,horarioMs});
   }
   if(candidatas.some(c=>c.plano===plano))break;
  }
 }
 return candidatas.sort((a,b)=>a.horarioMs-b.horarioMs||a.plano.id.localeCompare(b.plano.id)||a.refeicao.id.localeCompare(b.refeicao.id))[0]||null;
}
