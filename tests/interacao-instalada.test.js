import test from 'node:test';
import assert from 'node:assert/strict';
import {configurarInteracaoInstalada} from '../src/utils/interacaoInstalada.js';
for(const instalada of [false,true])test(`gestos ${instalada?'instalada':'Safari/navegador'} preservam rolagem e restauram viewport`,()=>{
 const eventos={},classes=new Set(),meta={content:'width=device-width, initial-scale=1.0'};
 const doc={querySelector:()=>meta,documentElement:{classList:{toggle:(n,v)=>v?classes.add(n):classes.delete(n),remove:n=>classes.delete(n)}},addEventListener:(n,f)=>eventos[n]=f,removeEventListener:n=>delete eventos[n]};
 const win={navigator:{standalone:instalada},matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}})};
 const parar=configurarInteracaoInstalada(win,doc);let bloqueios=0;
 eventos.gesturestart({preventDefault:()=>bloqueios++});eventos.touchmove({touches:[{},{}],preventDefault:()=>bloqueios++});
 assert.equal(bloqueios,instalada?2:0);
 eventos.touchmove({touches:[{}],preventDefault:()=>{throw Error('Rolagem bloqueada');}});
 assert.equal(meta.content.includes('user-scalable=no'),instalada);
 parar();assert.equal(meta.content,'width=device-width, initial-scale=1.0');assert.equal(Object.keys(eventos).length,0);
});
