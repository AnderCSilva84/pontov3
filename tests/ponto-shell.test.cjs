const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('shell: assets estáticos, fallback offline e limpeza limitada aos próprios caches',async()=>{
  const listeners={},apagados=[],adicionados=[];let ativacoes=0;
  let instalado=false;
  const cache={addAll:async assets=>{adicionados.push(...assets);instalado=true;},match:async path=>instalado&&path==='/index.html'?{html:'shell estático'}:undefined};
  const self={location:{origin:'https://example.test',href:'https://example.test/firebase-messaging-sw.js'},addEventListener:(n,fn)=>listeners[n]=fn,skipWaiting:async()=>ativacoes++,clients:{claim:async()=>{},matchAll:async()=>[]}};
  const ctx={self,URL,importScripts:()=>{self.AP1303_SHELL={versao:'teste',assets:['/index.html','/assets/app.js']};},caches:{open:async()=>cache,keys:async()=>['ap1303-shell-antigo','outro-app'],delete:async key=>apagados.push(key)},fetch:async()=>{throw Error('offline');}};
  vm.runInNewContext(fs.readFileSync('public/firebase-messaging-sw.js','utf8'),ctx);
  let promessa;listeners.install({waitUntil:p=>{promessa=p;}});await promessa;assert.deepEqual(adicionados,['/index.html','/assets/app.js']);assert.equal(ativacoes,1);
  listeners.activate({waitUntil:p=>{promessa=p;}});await promessa;assert.deepEqual(apagados,['ap1303-shell-antigo']);
  for(const url of ['https://example.test/api/privada','https://identitytoolkit.googleapis.com/v1/accounts','https://example.test/firebase-messaging-sw.js?uid=outra']){
    let interceptado=false;listeners.fetch({request:{method:'GET',url,mode:'cors'},respondWith:()=>{interceptado=true;}});assert.equal(interceptado,false);
  }
  listeners.fetch({request:{method:'GET',url:'https://example.test/lembretes?ocorrencia=ficticia',mode:'navigate'},respondWith:p=>{promessa=p;}});
  assert.equal((await promessa).html,'shell estático');
});
