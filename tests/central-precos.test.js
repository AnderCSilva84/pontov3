import {ehRotaCompras,resolverRotaUsuario} from '../src/utils/rotas.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import D from '../functions/central-precos-dominio.cjs';
import {criarCacheCentral,VALIDADE_CENTRAL} from '../src/utils/centralCache.js';
import {dataExibicao} from '../src/utils/datasExibicao.js';
test('central: cidade IBGE, especificação completa, conversão e preço líquido não estimado',()=>{
 assert.equal(D.cidade('1501402','PA').nome,'Belém');assert.throws(()=>D.cidade('1501402','CE'));
 const base={tipo:'supermercado',nome:'SUCO',marca:'DEMO',variante:'UVA',embalagem:'GARRAFA',unidadeComercial:'un',conteudo:1,unidadeMedida:'l'};
 const p=D.produto(base);for(const mudanca of [{marca:'OUTRA'},{variante:'LARANJA'},{conteudo:.5},{embalagem:'CAIXA'}])assert.notEqual(D.chaveProduto(p),D.chaveProduto(D.produto({...base,...mudanca})));
 assert.equal(D.chaveProduto(p),D.chaveProduto(D.produto({...base,nome:'suco'})));
 assert.throws(()=>D.produto({...base,tipo:'farmacia'}));assert.throws(()=>D.produto({...base,nome:'contato@example.com'}));assert.throws(()=>D.produto({...base,gtin:'12345678'}));
 assert.equal(D.cnpj('11222333000181'),'11222333000181');assert.throws(()=>D.cnpj('11111111111111'));
 assert.equal(D.precoPago({precoUnitarioCentavos:500,quantidadeComprada:2},{origem:'cupom',descontoCentavos:100}),null);
 assert.equal(D.precoPago({precoUnitarioCentavos:2667,precoUnitarioOriginalFiscal:'26,6666666667',quantidadeComprada:.858},{origem:'cupom',descontoCentavos:0}),null);
 assert.equal(D.precoPago({precoUnitarioCentavos:500,quantidadeComprada:2,totalPagoItemCentavos:900},{origem:'cupom',descontoCentavos:100}),null);
 assert.equal(dataExibicao('2026-10-28'),'28-10-26');
});
test('central: cache 15 minutos, deduplicação, offline, expiração, sessão e recusa do servidor',async()=>{
 let chamadas=0,agora=1,online=true;const c=criarCacheCentral({consultar:async()=>{chamadas++;return {itens:[{nome:'FICTÍCIO'}],atualizadoMs:agora};},agora:()=>agora,online:()=>online});c.sessao('a:grupo');
 const pedido={acao:'consultar',codigo:'1501402',tipo:'supermercado',produtoId:'id',dias:30};
 await Promise.all([c.buscar(pedido),c.buscar(pedido)]);assert.equal(chamadas,1);
 assert.equal((await c.buscar(pedido)).cache,true);assert.equal(chamadas,1);
 agora+=VALIDADE_CENTRAL+1;online=false;assert.equal((await c.buscar(pedido)).desatualizado,true);assert.equal(chamadas,1);await assert.rejects(c.buscar({...pedido,produtoId:'outro'}),/sem resultado salvo/);
 online=true;await c.buscar(pedido);assert.equal(chamadas,2);c.sessao('b:outro');await c.buscar(pedido);assert.equal(chamadas,3);c.limpar();online=false;await assert.rejects(c.buscar(pedido),/sem resultado salvo/);
 let resolver;const pendente=criarCacheCentral({consultar:()=>new Promise(r=>resolver=r)});pendente.sessao('a');const promise=pendente.buscar(pedido);await Promise.resolve();pendente.sessao('b');resolver({itens:[]});await assert.rejects(promise,/conta mudou/);
 let falhar=false;const seguro=criarCacheCentral({agora:()=>agora,consultar:async()=>{if(falhar)throw Object.assign(new Error('Negado'),{code:'functions/permission-denied'});return {itens:[]};}});seguro.sessao('a');await seguro.buscar(pedido);agora+=VALIDADE_CENTRAL+1;falhar=true;await assert.rejects(seguro.buscar(pedido),/Negado/);
});
test('central: cache persistido só retorna à mesma conta/grupo e logout remove o salvo',async()=>{
 const m=new Map(),storage={getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)},pedido={acao:'produtos',codigo:'1501402',tipo:'supermercado'};let chamadas=0;
 const opcoes={storage,consultar:async()=>{chamadas++;return {itens:[{id:'produto-publico'}]};}};
 const a=criarCacheCentral(opcoes);a.sessao('a:grupo');await a.buscar(pedido);
 const reaberto=criarCacheCentral({...opcoes,online:()=>false});reaberto.sessao('a:grupo');assert.equal((await reaberto.buscar(pedido)).offline,true);assert.equal(chamadas,1);
 reaberto.sessao('b:grupo');await assert.rejects(reaberto.buscar(pedido),/sem resultado salvo/);assert.equal(m.size,0);
 const outro=criarCacheCentral(opcoes);outro.sessao('a:grupo');await outro.buscar(pedido);outro.limpar();assert.equal(m.size,0);
});

test('central: rota reconhecida e acessível aos perfis autorizados sem liberar caminhos arbitrários',()=>{
 assert.equal(ehRotaCompras('/lista-compras/cidade'),true);
 for(const role of ['admin','funcionario','consulta'])assert.equal(resolverRotaUsuario({role},'/lista-compras/cidade'),'/lista-compras/cidade');
 assert.equal(ehRotaCompras('/lista-compras/cidade/../../admin'),false);
 assert.equal(ehRotaCompras('/lista-compras/cidade/interno'),false);
});
