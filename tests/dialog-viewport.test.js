import test from 'node:test';
import assert from 'node:assert/strict';
import {acompanharDialogViewport} from '../src/utils/dialogViewport.js';

test('teclado reduz janela visível, mantém campo acessível e remove listeners ao sair',()=>{
 const janela=new EventTarget(),viewport=new EventTarget(),dialog=new EventTarget();
 const estilos=new Map(),classes=new Map();let rolou=0,pendente;
 const campo={matches:()=>true,scrollIntoView:()=>rolou++};
 Object.assign(janela,{visualViewport:viewport,innerHeight:800,requestAnimationFrame:fn=>{pendente=fn;return 1;},cancelAnimationFrame:()=>{pendente=null;}});
 Object.assign(viewport,{height:800,offsetTop:0});
 Object.assign(dialog,{style:{setProperty:(k,v)=>estilos.set(k,v)},classList:{toggle:(k,v)=>classes.set(k,v)},ownerDocument:{activeElement:campo},contains:el=>el===campo});
 const parar=acompanharDialogViewport(dialog,janela);
 viewport.height=320;viewport.offsetTop=40;viewport.dispatchEvent(new Event('resize'));
 assert.equal(estilos.get('--dialog-altura-visivel'),'320px');
 assert.equal(estilos.get('--dialog-topo-visivel'),'40px');
 assert.equal(classes.get('compras-dialog-editando'),true);
 pendente();assert.equal(rolou,1);
 parar();viewport.height=800;viewport.dispatchEvent(new Event('resize'));
 assert.equal(estilos.get('--dialog-altura-visivel'),'320px');
 assert.equal(pendente,null);
});
