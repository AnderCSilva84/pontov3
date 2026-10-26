import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizarProduto,gtinValido,sugerirProdutos,conflitosProdutos,chaveApresentacao} from '../functions/produtos-identidade.mjs';
test('identidade: acentos, abreviações, typo, unidades equivalentes e aliases confirmados',()=>{
 assert.equal(normalizarProduto(' AÇÚCAR  CRISTAL! '),'acucar cristal');
 const p={id:'a',nome:'Açúcar cristal',apresentacao:'Pacote de 1 kg',unidadeCompra:'un',ativo:true};
 assert.equal(sugerirProdutos({nome:'ACUCAR CRISTA',apresentacao:'Pacote de 1000 g'},[p])[0].produto.id,'a');
 assert.equal(chaveApresentacao({...p,apresentacao:'Garrafa de 1 L'}),chaveApresentacao({...p,apresentacao:'Garrafa de 1000 ml'}));
 assert.equal(sugerirProdutos({nome:'AZC CRISTAL'},[{...p,aliasesNomes:['AZC CRISTAL']}])[0].motivo,'Alias confirmado no grupo');
 assert.equal(sugerirProdutos({nome:'Nome anterior'},[p,{id:'b',nome:'Nome anterior',principalId:'a'}])[0].produto.id,'a');
 assert.equal(gtinValido('7894900011517'),true);assert.equal(gtinValido('7894900011518'),false);assert.equal(gtinValido('123'),false);
});
test('identidade: marcas, pesos, sabor, embalagem e dose não equivalem por nome',()=>{
 const p={nome:'Produto',marca:'Marca A',apresentacao:'Caixa c/ 10 comprimidos 500 mg',unidadeCompra:'un'};
 for(const outro of [{...p,marca:'Marca B'},{...p,apresentacao:'Caixa c/ 20 comprimidos 500 mg'},{...p,apresentacao:'Caixa c/ 10 comprimidos 750 mg'},{...p,nome:'Produto gotas',apresentacao:'Frasco 500 mg'},{...p,unidadeCompra:'kg'}])assert.ok(conflitosProdutos(p,outro).length);
 assert.ok(conflitosProdutos({nome:'Iogurte morango 500 g'},{nome:'Iogurte chocolate 1 kg'}).length);
 assert.ok(conflitosProdutos({principioAtivo:'Dipirona'},{principioAtivo:'Paracetamol'}).length);
});
