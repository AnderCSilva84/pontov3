import {cuidadosDisponiveis} from './edicaoBuild.js';
const id=v=>typeof v==='string'&&/^[\w-]{1,128}$/.test(v);
export function destinoAviso(d,user,agora=Date.now()) {
 if(!cuidadosDisponiveis && (d?.canal==='cuidados'||d?.tipo==='lembrete'||d?.rota?.startsWith('/lembretes')))return null;
 if(!d||d.versao!=='1'||!user||user.ativo===false||d.uid!==user.uid||(d.grupoId||'')!==(user.grupoId||'')||!Number.isFinite(Number(d.expiraEm))||Number(d.expiraEm)<=agora||Number(d.expiraEm)>agora+86460000||!/^[a-f0-9]{64}$/.test(d.eventId||''))return null;
 const rotas=['/ponto','/lista-compras','/lembretes','/admin'];if(!rotas.includes(d.rota))return null;
 if(d.rota==='/admin'&&user.role!=='admin')return null;
 if(d.rota==='/lembretes'&&!(user.role==='admin'||user.role==='funcionario'&&user.babaCuidadora))return null;
 if(d.tipo&&!['lembrete','tarefa','tarefa_fixa'].includes(d.tipo))return null;
 if(d.tipo&&(!id(d.itemId)||d.tipo==='lembrete'&&!id(d.ocorrenciaId)))return null;
 return d.rota;
}
export function criarControlePushAndroid({ponte,chamar,contexto,armazenamento}) {
 let geracao=0,pendente=null,ultimo=null;
 const chave=()=>{const u=contexto();return u?`${u.uid}:${u.grupoId||''}`:'';};
 const validar=(k,v)=>{if(k!==chave()||v!==geracao)throw new Error('Sessão alterada durante a ativação.');};
 const preferencia=()=>{try{return armazenamento.getItem('pushAndroid:'+chave())==='true';}catch{return false;}};
 function guardar(v){try{armazenamento.setItem('pushAndroid:'+chave(),String(v));}catch{/* Estado local do sistema continua protegendo a entrega. */}}
 async function ativar(pedir=false) {
  if(pendente)return pendente;
  const k=chave(),v=geracao;if(!k)throw new Error('Entre no aplicativo.');
  pendente=(async()=>{
   let estado=await ponte.estado();validar(k,v);
   if(!estado.configurado)throw new Error('Este APK demo ainda não tem Firebase de teste para entrega FCM. O uso do aplicativo continua disponível.');
   if(!pedir&&!preferencia())return;
   if(!estado.permitido&&pedir&&estado.permissao==='prompt')estado=await ponte.permissao();validar(k,v);
   if(!estado.permitido)throw new Error('Avisos recusados ou bloqueados. Permita nas configurações do Android.');
   const u=contexto();await ponte.contexto({uid:u.uid,grupoId:u.grupoId||''});validar(k,v);
   const registro=await ponte.token();validar(k,v);
   const assinatura=k+':'+registro.token;
   if(!registro.registrado&&ultimo!==assinatura){
    await chamar('registrarDispositivoPush',{uid:u.uid,grupoId:u.grupoId||'',token:registro.token,transporte:'fcm-android',plataforma:'android',versao:1,instalacaoId:registro.instalacaoId});validar(k,v);
    await ponte.confirmarCadastro({uid:u.uid,grupoId:u.grupoId||'',token:registro.token});validar(k,v);ultimo=assinatura;
   }
   await ponte.ativar({uid:u.uid,grupoId:u.grupoId||'',token:registro.token});validar(k,v);guardar(true);
  })().finally(()=>{pendente=null;});return pendente;
 }
 async function suspender(manual=false,remoto=true){
  const k=chave();if(manual)guardar(false);geracao++;ultimo=null;
  const u=contexto();
  const registro=await ponte.suspender({uid:u?.uid||'',grupoId:u?.grupoId||''});
  // Revogação remota best-effort, limitada; a suspensão nativa não depende de rede.
  if(registro.instalacaoId&&k===chave())try{let timer;try{if(remoto)await Promise.race([chamar('removerDispositivoPush',{transporte:'fcm-android',instalacaoId:registro.instalacaoId}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Revogação remota indisponível.')),3000);})]);}finally{clearTimeout(timer);}
    await ponte.confirmarRevogacao({instalacaoId:registro.instalacaoId});}catch{/* Não bloqueia logout. Token local deixa de exibir. */}
 }
 return {ativar,suspender,preferencia,invalidar:()=>{geracao++;ultimo=null;}};
}
