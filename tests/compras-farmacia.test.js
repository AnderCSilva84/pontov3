import test from 'node:test';
import assert from 'node:assert/strict';
import {gastosSeparados,nomeAutorLista,tipoCompra} from '../src/utils/comprasTipo.js';
import {readFileSync} from 'node:fs';
import {gerarPdfGastosCompras} from '../src/utils/exportarPdfGastosCompras.js';
test('classificação legada, autoria sem inferência e reconciliação de gastos realizados',()=>{
 assert.equal(tipoCompra({}),'supermercado');assert.equal(nomeAutorLista({}),'Autor não informado');
 assert.equal(nomeAutorLista({criadaPor:'anterior'}),'Autor não informado');
 assert.equal(nomeAutorLista({criadaPor:'a',criadaPorNome:'Anderson'}),'Criado por: Anderson');
 assert.equal(nomeAutorLista({origem:'listaCompras',criadaPor:'importador',criadaPorNome:'Importador'}),'Autor não informado');
 assert.deepEqual(gastosSeparados([{status:'finalizada',totalCentavos:100},{tipoCompra:'farmacia',status:'finalizada',totalCentavos:250},{tipoCompra:'farmacia',status:'anulada',totalCentavos:999},{status:'rascunho',totalCentavos:10000}]),{supermercado:100,farmacia:250,total:350});
});
test('PDF de gastos inclui classificações e somente valores realizados',async()=>{
 const logoData='data:image/png;base64,'+readFileSync('public/icon-192.png').toString('base64');
 const p=await gerarPdfGastosCompras([{titulo:'Farmacia demo',tipoCompra:'farmacia',status:'finalizada',totalCentavos:250},{titulo:'EstimativaNaoDeveEntrar',status:'rascunho',totalCentavos:999}],{inicio:'2026-10-01',fim:'2026-10-23',logoData});
 assert.equal(p.blob.type,'application/pdf');const texto=await p.blob.text();assert.ok(texto.includes('Farmacia demo'));assert.ok(!texto.includes('EstimativaNaoDeveEntrar'));
});
test('etiquetas usam texto, cores semânticas e não consultam perfil por lista/item',()=>{
 const css=readFileSync('src/styles/compras.css','utf8'),ui=readFileSync('src/components/ComprasModulo.jsx','utf8');
 assert.match(css,/compras-estado-pendente\{[^}]*#991b1b/);assert.match(css,/compras-estado-comprado\{[^}]*#166534/);
 assert.match(ui,/comprado\?'Comprado'/);assert.match(ui,/nomeAutorLista\(lista\)/);assert.doesNotMatch(ui,/operarCompras\('autorias'/);
});
