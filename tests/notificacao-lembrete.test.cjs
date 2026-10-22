const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('aviso de cuidado abre ocorrência específica, sem concluir automaticamente e sem aceitar outro destinatário',async()=>{
 const handlers={},avisos=[],abertos=[];let receber;
 const self={location:{origin:'https://app.example',href:'https://app.example/firebase-messaging-sw.js?uid=uid1&config=%7B%7D'},skipWaiting(){},clients:{claim(){},matchAll:async()=>[],openWindow:async url=>abertos.push(url)},registration:{showNotification:async(titulo,opcoes)=>avisos.push({titulo,opcoes})},addEventListener:(nome,fn)=>handlers[nome]=fn};
 const contexto={self,URL,importScripts(){},firebase:{initializeApp(){},messaging:()=>({onBackgroundMessage:fn=>receber=fn})}};
 vm.runInNewContext(fs.readFileSync('public/firebase-messaging-sw.js','utf8'),contexto);
 const url='/lembretes?lembreteId=x&ocorrenciaId=1_123&destinatario=uid1';
 await receber({data:{uid:'outra',url}});assert.equal(avisos.length,0);
 await receber({data:{uid:'uid1',url,title:'Cuidado'}});assert.equal(avisos[0].opcoes.actions[0].title,'Ver e concluir');
 let pronta;handlers.notificationclick({action:'ver-concluir',notification:{close(){},data:avisos[0].opcoes.data},waitUntil:p=>pronta=p});await pronta;
 assert.equal(abertos[0],'https://app.example'+url);
 handlers.notificationclick({notification:{close(){},data:{url:'https://outro.example'}},waitUntil(){throw Error('Não deve navegar');}});assert.equal(abertos.length,1);
});
