const {HttpsError}=require('firebase-functions/v2/https');
const {FieldValue,FieldPath}=require('firebase-admin/firestore');
const {randomUUID}=require('node:crypto');
const {bancoDoGrupo}=require('./grupos-contexto.cjs');
const PAGINA=25,MAX_RODADAS=40,LEASE_MS=120000;
const tempo=()=>FieldValue.serverTimestamp();
const retidos=['historicos_trabalhistas_financeiros','dados_compartilhados_e_autoria','dados_de_terceiros','recibos_seguranca_idempotencia'];
const publico=s=>s.exists?{protocolo:s.id,status:s.data().status,etapa:s.data().etapa||null,motivos:s.data().motivos||[],retidos,atualizadoEm:s.data().atualizadoEm?.toMillis?.()||null}:null;
const erro=(m)=>{throw new HttpsError('failed-precondition',m);};
const codigoSeguro=e=>['INTEGRACAO_INCONSISTENTE','VINCULO_ALTERADO','ETAPA_INVALIDA','LEASE'].includes(e?.message)?e.message:['auth/insufficient-permission','auth/internal-error','auth/network-request-failed',4,7,10,14].includes(e?.code)?String(e.code):'ETAPA_NAO_CONCLUIDA';

// Esta transação é também a barreira contra transferências/exclusões concorrentes.
async function autorizarExclusao(raiz,uid,d,{auth}={}) {
 const ref=raiz.doc('contaSolicitacoes/'+uid);
 return raiz.runTransaction(async tx=>{
  const [pedido,v,legado]=await tx.getAll(ref,raiz.doc('vinculosUsuarios/'+uid),raiz.doc('users/'+uid));
  const p=pedido.data();
  if(!p)erro('Registre a solicitação antes de concluir.');
  if(['concluida','processando'].includes(p.status))return publico(pedido);
  if(p.status==='falha_recuperavel'&&p.etapa){const rodada=(p.rodada||0)+1;tx.update(ref,{status:'processando',rodada,lease:null,leaseAte:0,atualizadoEm:tempo()});tx.set(raiz.doc(`contaExecucoes/${uid}_${rodada}`),{uid,rodada});return {...publico(pedido),status:'processando'};}
  const gid=v.data()?.grupoId||null;
  if(gid!==(p.grupoId||null))erro('O vínculo mudou. A solicitação precisa de revisão operacional.');
  const db=gid?bancoDoGrupo(raiz,gid):raiz;
  const perfil=gid?await tx.get(db.doc('users/'+uid)):legado;
  const grupo=gid?await tx.get(raiz.doc('grupos/'+gid)):null;
  if(v.exists&&v.data().ativo!==true||perfil.data()?.ativo===false)throw new HttpsError('permission-denied','Conta sem acesso para iniciar exclusão.');
  if(gid&&(!perfil.exists||grupo.data()?.ativo!==true))erro('Grupo ou perfil indisponível.');
  // Perfis legados sem campo ativo também têm acesso; não ignorá-los numa query ativo==true.
  const verificarAdministracao=perfil.data()?.role==='admin'||grupo?.data()?.titularUid===uid;
  const membros=verificarAdministracao?await tx.get(db.collection('users').where(FieldPath.documentId(),'!=',uid).limit(101)):{docs:[],size:0};
  if(membros.size===101)erro('Grupo com mais de 100 outros cadastros exige revisão operacional antes da exclusão. Nenhum histórico foi apagado.');
  const outros=membros.docs.filter(s=>s.data().ativo!==false);
  if(outros.length&&grupo?.data()?.titularUid===uid)erro('Transfira a titularidade para outro administrador ativo antes de excluir.');
  let temAdmin=false;
  for(const s of outros.filter(s=>s.data().role==='admin')){
    const identidade=await auth.getUser(s.id).catch(e=>{if(e.code==='auth/user-not-found')return null;throw e;});
    if(identidade&&!identidade.disabled){temAdmin=true;break;}
  }
  if(outros.length&&perfil.data()?.role==='admin'&&!temAdmin)erro('Mantenha outro administrador com perfil e login Auth ativos antes de excluir.');
  if(!gid&&perfil.data()?.role==='admin'&&!temAdmin)erro('O último administrador do conjunto legado precisa preparar a migração de grupo ou cadastrar outro administrador antes de excluir.');
  if(!outros.length&&grupo?.data()?.titularUid===uid&&d.encerrarGrupoVazio!==true)erro('Confirme o encerramento de acesso ao grupo sem outros membros. Seus históricos serão preservados.');
  // Resultado incerto não é descarte; pendências remotas e registros confirmados não bloqueiam.
  const f=d.pendencias;
  if(!f||f.onlineIncerto||f.offlineNaoEnviado)erro('Reconcilie resultados desconhecidos e envie ou descarte explicitamente capturas nunca enviadas neste aparelho.');
  if(grupo)tx.update(grupo.ref,{revisaoConta:FieldValue.increment(1),...(!outros.length&&grupo.data().titularUid===uid?{ativo:false,acessoEncerradoEm:tempo()}: {})});
  if(perfil.exists)tx.update(perfil.ref,{ativo:false,fcmToken:FieldValue.delete()});
  if(v.exists)tx.update(v.ref,{ativo:false});
  tx.update(ref,{status:'processando',etapa:'dispositivos',cursor:null,rodada:1,lease:null,leaseAte:0,retidos,funcionarioId:['funcionario','funcionaria'].includes(perfil.data()?.role)?perfil.data()?.funcionarioId||null:null,motivos:[],atualizadoEm:tempo(),politicaVersao:1});
  tx.set(raiz.doc(`contaExecucoes/${uid}_1`),{uid,rodada:1});
  return {...publico(pedido),status:'processando',etapa:'dispositivos',motivos:[]};
 });
}

// Só servidor. UID vem do documento autenticado já autorizado, nunca de endpoint administrativo.
async function processarExclusao(raiz,auth,uid,{agora=Date.now,aposEtapa=async()=>{}}={}) {
 const ref=raiz.doc('contaSolicitacoes/'+uid),dono=randomUUID();
 const adquirido=await raiz.runTransaction(async tx=>{
  const s=await tx.get(ref),p=s.data();
  if(p?.status!=='processando'||p.leaseAte>agora())return false;
  tx.update(ref,{lease:dono,leaseAte:agora()+LEASE_MS});return true;
 });
 if(!adquirido)return {solicitacao:publico(await ref.get())};
 try {
  for(let n=0;n<12;n++) {
   const snap=await ref.get(),p=snap.data();
   if(p.lease!==dono||p.status!=='processando')return {solicitacao:publico(snap)};
   const db=p.grupoId?bancoDoGrupo(raiz,p.grupoId):raiz;
   const passo=async fn=>raiz.runTransaction(async tx=>{
    const atual=await tx.get(ref);if(atual.data()?.lease!==dono)throw Error('LEASE');
    const mudanca=await fn(tx);tx.update(ref,{...mudanca,atualizadoEm:tempo()});
   });
   if(['dispositivos','dispositivos_legado','instalacoes','tokens'].includes(p.etapa)) {
    const colecao=p.etapa==='dispositivos'?db.collection('pushDispositivos'):raiz.collection(p.etapa==='dispositivos_legado'?'pushDispositivos':p.etapa==='instalacoes'?'pushInstalacoes':'pushTokensNativos');
    await passo(async tx=>{
     let q=colecao.where('uid','==',uid).orderBy(FieldPath.documentId()).limit(PAGINA);if(p.cursor)q=q.startAfter(p.cursor);
     const docs=await tx.get(q);
     // Reservas também são percorridas por UID em etapas próprias: nunca apagar reserva de outro dono.
     docs.docs.forEach(s=>tx.delete(s.ref));
     const proxima={dispositivos:p.grupoId?'dispositivos_legado':'instalacoes',dispositivos_legado:'instalacoes',instalacoes:'tokens',tokens:'integracoes'};
     return docs.size===PAGINA?{cursor:docs.docs.at(-1).id}:{etapa:proxima[p.etapa],cursor:null};
    });
   }else if(p.etapa==='integracoes') {
    await passo(async tx=>{
     const owner=await tx.get(raiz.doc('noBolsoOwners/'+uid));
     const ids=owner.data()?.noBolsoUids??(owner.data()?.noBolsoUid?[owner.data().noBolsoUid]:[]);
     if(!Array.isArray(ids)||ids.length>2||new Set(ids).size!==ids.length||ids.some(x=>typeof x!=='string'||!/^[\w-]{1,128}$/.test(x)))throw Error('INTEGRACAO_INCONSISTENTE');
     const links=await Promise.all(ids.map(id=>tx.get(raiz.doc('noBolsoLinks/'+id))));
     for(const s of links){if(!s.exists)continue;const dados=s.data(),origens=dados.apUids??(dados.apUid?[dados.apUid]:[]);if(!Array.isArray(origens)||origens.length>2||new Set(origens).size!==origens.length||origens.some(x=>typeof x!=='string'||!/^[\w-]{1,128}$/.test(x)))throw Error('INTEGRACAO_INCONSISTENTE');if(!origens.includes(uid))continue;const restantes=origens.filter(x=>x!==uid);if(restantes.length)tx.update(s.ref,{apUids:restantes,apUid:FieldValue.delete()});else tx.delete(s.ref);}
     tx.delete(raiz.doc('noBolsoOwners/'+uid));tx.delete(raiz.doc('noBolsoGrants/'+uid));return {etapa:'perfil'};
    });
   }else if(p.etapa==='perfil') {
    await passo(async tx=>{
     const v=await tx.get(raiz.doc('vinculosUsuarios/'+uid));
     if(v.exists&&(v.data().grupoId||null)!==(p.grupoId||null))throw Error('VINCULO_ALTERADO');
     const f=p.funcionarioId?await tx.get(db.doc('funcionarios/'+p.funcionarioId)):null;
     const compartilhado=f?.exists?await tx.get(db.collection('users').where('funcionarioId','==',p.funcionarioId).where(FieldPath.documentId(),'!=',uid).limit(1)):null;
     tx.delete(db.doc('fotosPerfis/'+uid));
     if(f?.exists&&f.data().fotoPerfilUid===uid)tx.update(f.ref,{fotoPerfilUid:FieldValue.delete(),temFotoPerfil:FieldValue.delete(),fotoPerfilVersao:FieldValue.delete()});
     tx.delete(db.doc('users/'+uid));if(p.grupoId)tx.delete(raiz.doc('users/'+uid));tx.delete(raiz.doc('vinculosUsuarios/'+uid));tx.delete(db.doc('pushTestes/'+uid));if(p.grupoId)tx.delete(raiz.doc('pushTestes/'+uid));
     if(f?.exists&&!compartilhado.size)tx.update(f.ref,{ativo:false,acessoExcluidoEm:tempo()});
     return {etapa:'auth'};
    });
   }else if(p.etapa==='auth') {
    // Não há transação entre Auth/Firestore. user-not-found permite retomar após delete sucedido.
    await auth.deleteUser(uid).catch(e=>{if(e.code!=='auth/user-not-found')throw e;});
    await aposEtapa('auth_removido');
    await passo(async()=>({etapa:'recibo',authRemovido:true}));
   }else if(p.etapa==='recibo') {
    await passo(async()=>({status:'concluida',etapa:'concluida',lease:null,leaseAte:0,concluidaEm:tempo(),cursor:null}));
    return {solicitacao:publico(await ref.get())};
   }else throw Error('ETAPA_INVALIDA');
   await aposEtapa(p.etapa);
  }
  // Continuação por mudança de rodada, com teto; atualizações de lease não geram ciclos.
  await raiz.runTransaction(async tx=>{const s=await tx.get(ref);if(s.data()?.lease===dono){const rodada=(s.data().rodada||0)+1,continuar=s.data().rodada<MAX_RODADAS;tx.update(ref,{lease:null,leaseAte:0,rodada,status:continuar?'processando':'falha_recuperavel',atualizadoEm:tempo()});if(continuar)tx.set(raiz.doc(`contaExecucoes/${uid}_${rodada}`),{uid,rodada});}});
 }catch(e) {
  await raiz.runTransaction(async tx=>{const s=await tx.get(ref);if(s.data()?.lease===dono)tx.update(ref,{status:'falha_recuperavel',lease:null,leaseAte:0,atualizadoEm:tempo(),codigoFalha:codigoSeguro(e)});});
 }
 return {solicitacao:publico(await ref.get())};
}
module.exports={autorizarExclusao,processarExclusao,publico,PAGINA,retidos};
