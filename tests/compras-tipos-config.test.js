import test from 'node:test';
import assert from 'node:assert/strict';
import {TIPOS_COMPRAS,gastosSeparados,nomeTipoCompra,tipoCompra} from '../src/utils/comprasTipo.js';
import {createRequire} from 'node:module';
import {gastosUltimosTresMeses} from '../src/utils/comprasConsulta.js';
import {gerarPdfGastosCompras} from '../src/utils/exportarPdfGastosCompras.js';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const {PADRAO,configuracaoTipos,ehSupermercado}=require('../functions/compras-tipo.cjs');
test('padrão implícito sem migrar registros e exclusividade de supermercado',()=>{
 assert.deepEqual(configuracaoTipos(),{habilitadas:PADRAO,versao:0});assert.equal(tipoCompra({}),'supermercado');
 for(const tipo of Object.keys(TIPOS_COMPRAS)){assert.equal(ehSupermercado({tipoCompra:tipo}),tipo==='supermercado');assert.equal(nomeTipoCompra({tipoCompra:tipo}),TIPOS_COMPRAS[tipo]);}
 assert.equal(nomeTipoCompra({tipoCompra:'desconhecida'}),'Classificação não reconhecida');
});
test('cinco subtotais conciliam com o total realizado, sem incluir estimativas',()=>{
 const listas=Object.keys(TIPOS_COMPRAS).map((t,i)=>({tipoCompra:t,status:'finalizada',totalCentavos:(i+1)*100}));
 const gastos=gastosSeparados([...listas,{status:'rascunho',totalCentavos:99999},{status:'anulada',totalCentavos:99999}]);
 assert.equal(gastos.total,1500);for(const [i,t]of Object.keys(TIPOS_COMPRAS).entries())assert.equal(gastos[t],(i+1)*100);
});
test('séries mensais e PDF conservam os cinco grupos de gastos',async()=>{
 const momento=Date.UTC(2026,9,28,12);
 const listas=Object.keys(TIPOS_COMPRAS).map((t,i)=>({titulo:'CompraFixture'+i,tipoCompra:t,status:'finalizada',totalCentavos:(i+1)*100,finalizadaEmMs:momento}));
 for(const [i,t]of Object.keys(TIPOS_COMPRAS).entries())assert.equal(gastosUltimosTresMeses(listas.filter(l=>l.tipoCompra===t),momento).at(-1).totalCentavos,(i+1)*100);
 const logoData='data:image/png;base64,'+readFileSync('public/icon-192.png').toString('base64');
 const pdf=await gerarPdfGastosCompras(listas,{inicio:'01-10-26',fim:'28-10-26',logoData});const texto=await pdf.blob.text();
 for(let i=0;i<5;i++)assert.ok(texto.includes('CompraFixture'+i));
 assert.ok(texto.includes('15,00'));
});
