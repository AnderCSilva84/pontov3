import test from 'node:test';
import assert from 'node:assert/strict';
import {pendenciasCupom} from '../src/utils/cupomRevisao.js';
import {reconhecerCupom,conferirAssociacoesCupom,itensAtencaoCupom,embalagemFiscal} from '../src/utils/cupomRevisao.js';
import {opcoesAssociacaoCupom} from '../src/utils/catalogoProdutos.js';

test('revisão exige escolha explícita e confirmação fiscal sem bloquear descartes', () => {
  const itens = [
    {linha: 1, produtoId: 'existente'},
    {linha: 2, itemPlanejadoId: 'planejado'},
    {linha: 3, novoConfirmado: true},
    {linha: 4},
    {linha: 5, produtoId: 'existente', unidadeConferir: true},
    {linha: 6, descartar: true, unidadeConferir: true},
    {linha: 7, produtoId: 'existente', unidadeConferir: true, unidadeConfirmada: true},
    {linha: 8, unidadePendente: true, novoConfirmado: true, unidadeConfirmada: true},
    {linha: 9, unidadePendente: true, descartar: true},
  ];
  const antes = structuredClone(itens);
  assert.deepEqual(pendenciasCupom(itens).map(i => i.linha), [4, 5, 8]);
  assert.deepEqual(itens, antes);
  assert.deepEqual(pendenciasCupom([]), []);
});

test('cupom reconhece nome exato único, separa embalagens e não associa por semelhança',()=>{
 const fiscal={linha:1,nomeOriginal:'SABAO DEMO COCO 1,6KG - UNIDADE',unidadeCompra:'un',quantidade:1,precoUnitarioCentavos:1179,totalCentavos:1179};
 const p={id:'coco',nome:'SABAO DEMO COCO 1,6KG',apresentacao:'Pacote de 1600 g',categoriaId:'limpeza',unidadeCompra:'un',tiposCompra:['supermercado']};
 const errado={...p,id:'menor',apresentacao:'Pacote de 800 g'};
 const antes=structuredClone(fiscal);
 const reconhecidos=reconhecerCupom([fiscal,fiscal],[p,errado],'supermercado',[{id:'planejado',produtoId:'coco',unidadeCompra:'un'}]);
 assert.equal(reconhecidos[0].produtoId,'coco');assert.equal(reconhecidos[1].itemPlanejadoId,'planejado');
 assert.equal(itensAtencaoCupom(reconhecidos).length,0);assert.deepEqual(fiscal,antes);
 assert.equal(reconhecerCupom([fiscal],[p,{...p,id:'duplicado'}],'supermercado')[0].produtoId,undefined);
 assert.equal(reconhecerCupom([fiscal],[{...p,nome:'Sabão coco parecido'}],'supermercado')[0].produtoId,undefined);
 assert.equal(reconhecerCupom([fiscal],[{...p,tiposCompra:['pet']}],'supermercado')[0].produtoId,undefined);
 const opcoes=opcoesAssociacaoCupom([p,errado],{tipoCompra:'supermercado',unidadeCompra:'un',entrada:{...fiscal,apresentacao:errado.apresentacao}});
 assert.deepEqual(opcoes.compativeis.map(p=>p.id),['coco']);assert.deepEqual(opcoes.incompativeis.map(p=>p.id),['menor']);
 const revisao=conferirAssociacoesCupom([{...fiscal,produtoId:'menor'},{...fiscal,linha:2,produtoId:'menor'},{...fiscal,linha:3,produtoId:'menor',descartar:true}],[errado]);
 assert.deepEqual(itensAtencaoCupom(revisao).map(i=>i.linha),[1,2]);assert.match(revisao[0].erroRevisao,/800 g/);
 assert.equal(embalagemFiscal(fiscal),'Embalagem 1,6KG');assert.equal(embalagemFiscal({unidadeCompra:'kg'}),'Venda por kg');
 assert.equal(embalagemFiscal({nomeOriginal:'Produto sem peso',unidadeCompra:'un'}),'Unidade conforme a nota');
});
