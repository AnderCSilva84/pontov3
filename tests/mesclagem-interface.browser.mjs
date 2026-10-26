// Ensaio direcionado: Chrome isolado + PWA e Functions locais, nunca produção.
// Preparar quatro IDs fictícios em tmp/mescla-click-fixture.json e autenticar o demo.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const fixture=JSON.parse(await fs.readFile('tmp/mescla-click-fixture.json','utf8'));
assert.equal(fixture.ids.length,4);assert.ok(fixture.ids.every(id=>/^click-[a-f0-9-]+$/.test(id)));
const tab=(await(await fetch('http://127.0.0.1:9228/json')).json()).find(t=>t.url.startsWith('http://127.0.0.1:5177/'));
assert.ok(tab,'Abrir navegador isolado no PWA demo local');
const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0,held;const pending=new Map(),requests=[],checks=[];let resolveHeld;
const responseHeld=new Promise(r=>resolveHeld=r);
function send(method,params={}){return new Promise((resolve,reject)=>{const n=++id,t=setTimeout(()=>{pending.delete(n);reject(Error('Timeout '+method));},25000);pending.set(n,{resolve:r=>{clearTimeout(t);resolve(r);},reject});ws.send(JSON.stringify({id:n,method,params}));});}
ws.addEventListener('message',e=>{const m=JSON.parse(e.data),p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}
 if(m.method==='Network.requestWillBeSent'&&m.params.request.url.includes('/comprasOperacao')&&m.params.request.postData){const d=JSON.parse(m.params.request.postData).data;if(d.operacao==='mesclarProdutos')requests.push(d);}
 if(m.method==='Fetch.requestPaused'){const d=m.params.request.postData?JSON.parse(m.params.request.postData).data:{};if(d.operacao==='mesclarProdutos'&&!held){held=m.params;resolveHeld();}else send('Fetch.continueRequest',{requestId:m.params.requestId});}
 if(m.method==='Page.javascriptDialogOpening')send('Page.handleJavaScriptDialog',{accept:true});
});
async function ev(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||'Runtime error');return r.result.value;}
const wait=expression=>ev(`new Promise((resolve,reject)=>{const ok=()=>(${expression});if(ok())return resolve(true);const o=new MutationObserver(()=>{if(ok()){clearTimeout(t);o.disconnect();resolve(true);}});const t=setTimeout(()=>{o.disconnect();reject(Error('UI timeout'));},20000);o.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true});})`);
const click=text=>ev(`(()=>{const b=[...document.querySelectorAll('.associacoes-produtos button')].find(b=>b.textContent===${JSON.stringify(text)});if(!b)throw Error('Botão ausente');b.click();return true;})()`);
const alert=()=>ev(`document.querySelector('.associacoes-produtos [role=alert]')?.textContent||''`);
try{
 await send('Runtime.enable');await send('Page.enable');await send('Network.enable');
 await ev(`import('/src/services/firebase.js').then(m=>{if(m.ambiente.config.projectId!=='ap1303-android-push-teste'||!m.ambiente.emuladores)throw Error('Ambiente deve ser demo com emuladores');return true;})`);
 await send('Emulation.setDeviceMetricsOverride',{width:360,height:800,deviceScaleFactor:1,mobile:true});
 await ev(`(()=>{history.pushState({},'','/lista-compras/catalogo');dispatchEvent(new PopStateEvent('popstate'));return true;})()`);
 await wait(`!!document.querySelector('.associacoes-produtos input[type=search]')`);
 await ev(`(()=>{document.querySelector('.associacoes-produtos').closest('details').open=true;const e=document.querySelector('.associacoes-produtos input[type=search]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(fixture.busca)});e.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);
 await wait(`document.querySelectorAll('.associacao-escolha').length===4`);
 await click('Ver prévia da mesclagem');await wait(`!!document.querySelector('.associacoes-produtos [role=alert]')`);assert.match(await alert(),/2 a 20/);checks.push('sem seleção explica requisito');
 for(const produtoId of fixture.ids)await ev(`document.querySelector('.associacao-escolha input[value="${produtoId}"]').click()`);
 await click('Ver prévia da mesclagem');await wait(`!!document.querySelector('.associacoes-produtos [role=alert]')`);assert.match(await alert(),/produto principal/);assert.equal(requests.length,0);checks.push('somente checkboxes explica principal; nenhuma mesclagem enviada');
 await ev(`(()=>{const s=document.querySelector('.associacoes-produtos select');s.value=${JSON.stringify(fixture.ids[0])};s.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`);
 await click('Ver prévia da mesclagem');await wait(`!!document.querySelector('.associacoes-produtos h3')`);
 await click('Confirmar mesclagem');await wait(`!!document.querySelector('.associacoes-produtos [role=alert]')`);assert.match(await alert(),/Marque a caixa/);assert.equal(requests.length,0);checks.push('conferência ausente explica requisito; nada gravado');
 await ev(`document.querySelector('.associacoes-produtos .card input[type=checkbox]').click()`);
 await send('Fetch.enable',{patterns:[{urlPattern:'*127.0.0.1:5007/*/comprasOperacao',requestStage:'Response'}]});
 await click('Confirmar mesclagem');await Promise.race([responseHeld,new Promise((_,j)=>setTimeout(()=>j(Error('No local response intercepted')),20000))]);
 assert.equal(await ev(`!![...document.querySelectorAll('.associacoes-produtos button')].find(b=>b.textContent==='Mesclando…'&&b.disabled)`),true);
 await click('Mesclando…');assert.equal(requests.length,1);checks.push('carregamento visível e segundo clique bloqueado');
 await send('Fetch.failRequest',{requestId:held.requestId,errorReason:'Failed'});await wait(`!!document.querySelector('.associacoes-produtos [role=alert]')`);
 assert.match(await alert(),/pode ter sido salva|seleção foi mantida/);assert.equal(await ev(`document.querySelectorAll('.associacao-escolha input:checked').length`),4);checks.push('resposta perdida informa risco e mantém seleção');
 await click('Confirmar mesclagem');await wait(`document.querySelector('.associacoes-produtos').innerText.includes('Mesclagem concluída: 4')`);
 assert.equal(requests.length,2);assert.deepEqual(requests[1],requests[0]);assert.equal(await ev(`document.querySelectorAll('.associacao-escolha input:checked').length`),0);checks.push('replay reutiliza payload/ID e mostra sucesso');
 await click('Ver associações e desfazer');await wait(`!![...document.querySelectorAll('.associacoes-produtos article')].find(a=>a.textContent.includes(${JSON.stringify(fixture.busca)})&&a.querySelector('button'))`);
 await ev(`(()=>{const a=[...document.querySelectorAll('.associacoes-produtos article')].find(a=>a.textContent.includes(${JSON.stringify(fixture.busca)})&&a.querySelector('button'));a.querySelector('button').click();return true;})()`);
 await wait(`!![...document.querySelectorAll('.associacoes-produtos article')].find(a=>a.textContent.includes(${JSON.stringify(fixture.busca)})&&a.textContent.includes('Desfeita'))`);checks.push('desfazer pela interface permanece funcional');
 assert.equal(await ev('document.documentElement.scrollWidth<=document.documentElement.clientWidth'),true);
 const result={checks,requests:requests.map(d=>({operacao:d.operacao,operacaoId:d.operacaoId,principalId:d.principalId,versao:d.versao,quantidade:d.produtoIds.length})),width:360};
 await fs.writeFile('tmp/mescla-click-after.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await send('Fetch.disable').catch(()=>{});ws.close();}
