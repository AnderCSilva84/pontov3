const {createHash}=require('node:crypto');
const hash=v=>createHash('sha256').update(v).digest('hex');
const id=v=>typeof v==='string'&&/^[\w-]{1,128}$/.test(v);
function revisaoTarefa(t) {return hash(JSON.stringify([t.titulo,t.dataAgendada||'',t.diaSemana,t.turno||'',t.horario||'',t.ativa!==false]));}
function montarMensagem(device,{titulo,mensagem,url,eventoId,grupoId='',ttl=86400,urgency='normal',agora=Date.now(),acao={}}) {
 const base={token:device.token};ttl=Number.isInteger(ttl)&&ttl>=0&&ttl<=86400?ttl:86400;
 if(device.transporte!=='fcm-android')return {...base,data:{title:String(titulo).slice(0,100),body:String(mensagem).slice(0,300),url,tag:hash(eventoId),uid:device.uid,grupoId},webpush:{headers:{TTL:String(ttl),Urgency:urgency==='high'?'high':'normal'}}};
 // O serviço Android próprio é o único responsável por exibir; nunca enviar notification+data.
 const rota=url==='/alimentacao'?'/alimentacao':url==='/avisos'?'/avisos':url==='/tarefas'?'/tarefas':url.startsWith('/lembretes?')?'/lembretes':url.startsWith('/lista-compras')?'/lista-compras':url==='/admin'?'/admin':'/ponto';
 let alvo=acao;
 if(rota==='/lembretes') {const p=new URLSearchParams(url.split('?')[1]);alvo={tipo:'lembrete',id:p.get('lembreteId'),ocorrenciaId:p.get('ocorrenciaId')};}
 const data={versao:'1',eventId:hash(eventoId),uid:device.uid,grupoId,rota,expiraEm:String(agora+ttl*1000),canal:rota==='/lembretes'?'cuidados':(alvo.categoria==='tarefas'||alvo.tipo?.startsWith('tarefa'))?'tarefas':rota==='/lista-compras'?'compras':'ponto'};
 if(alvo.categoria==='alimentacao'&&['/tarefas','/alimentacao'].includes(rota)){data.canal='tarefas';data.conteudo='alimentacao';data.title=String(titulo).slice(0,100);data.body=String(mensagem).slice(0,300);}
 if(['lembrete','tarefa','tarefa_fixa'].includes(alvo.tipo)&&id(alvo.id)) {data.tipo=alvo.tipo;data.itemId=alvo.id;if(alvo.ocorrenciaId&&id(alvo.ocorrenciaId))data.ocorrenciaId=alvo.ocorrenciaId;if(alvo.dataKey)data.dataKey=alvo.dataKey;if(alvo.revisao)data.revisao=alvo.revisao;}
 return {...base,data,android:{priority:'high',ttl:ttl*1000}};
}
// Política do servidor por transporte já persistido: abrange tokens Android antigos.
// Não confia numa flag de edição enviada pelo cliente nem altera destinatários web.
function permiteEnvio(device,url,acao={}) {
 return device.transporte!=='fcm-android'||!(url.startsWith('/lembretes')||acao.tipo==='lembrete'||acao.categoria==='cuidados');
}
module.exports={montarMensagem,revisaoTarefa,id,hash,permiteEnvio};
