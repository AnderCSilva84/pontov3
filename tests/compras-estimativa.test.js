import test from 'node:test';
import assert from 'node:assert/strict';
import dominio from '../functions/compras-estimativa-dominio.cjs';
import { calcularEstimativa } from '../src/utils/comprasEstimativa.js';
test('estimativa usa os últimos dez registros válidos do mesmo produto, embalagem e unidade', () => {
  const item = { produtoId: 'a', apresentacao: 'Pacote 1 kg', unidadeCompra: 'un' };
  const preco = { ...item, valido: true, supermercadoNome: 'Mercado fictício' };
  const registros = Array.from({ length: 12 }, (_, i) => ({ ...preco, id: String(i).padStart(2, '0'), precoUnitarioCentavos: (i + 1) * 100, compradoEmMs: i + 1 }));
  registros.push({ ...preco, id: 'invalidado', valido: false, precoUnitarioCentavos: 999999, compradoEmMs: 13 }, { ...preco, id: 'outra-unidade', unidadeCompra: 'kg', precoUnitarioCentavos: 999999, compradoEmMs: 14 }, { ...preco, id: 'outra-embalagem', apresentacao: 'Pacote 5 kg', precoUnitarioCentavos: 999999, compradoEmMs: 15 }, { ...preco, id: 'futuro', precoUnitarioCentavos: 999999, compradoEmMs: 101 });
  const r = dominio.resumirPreco(registros, item, 100);
  assert.equal(r.ultimoCentavos, 1200); assert.equal(r.mediaCentavos, 750); assert.equal(r.amostra, 10);
  assert.equal(dominio.resumirPreco(registros, { ...item, produtoId: 'outro' }, 100), null);
});
test('quantidade fracionária, preços ausentes e valores já informados compõem uma previsão parcial sem gravar compra', () => {
  const itens = [{ id: 'a', estado: 'pendente', unidadeCompra: 'kg', quantidadePlanejada: 1.375 }, { id: 'b', estado: 'pendente', unidadeCompra: 'un', quantidadePlanejada: 2 }, { id: 'sem', estado: 'pendente', unidadeCompra: 'un', quantidadePlanejada: 1 }, { id: 'pago', estado: 'comprado', totalCentavos: 1000 }, { id: 'fora', estado: 'nao_comprado', totalCentavos: 999999 }];
  const referencias = { a: { unidade: 'kg', ultimoCentavos: 699, mediaCentavos: 800 }, b: { unidade: 'un', ultimoCentavos: 1000, mediaCentavos: 900 } };
  const r = calcularEstimativa(itens, referencias);
  assert.equal(r.totalCentavos, 3961); assert.deepEqual(r.semPreco, ['sem']); assert.equal(r.pendentesComPreco, 2);
  assert.equal(calcularEstimativa(itens, referencias, 'media').totalCentavos, 3900);
  assert.equal(itens[0].precoUnitarioCentavos, undefined);
  assert.equal(calcularEstimativa([itens[2]], {}).totalCentavos, null);
  assert.equal(calcularEstimativa([itens[0]], { a: { unidade: 'un', ultimoCentavos: 999 } }).totalCentavos, null);
});
