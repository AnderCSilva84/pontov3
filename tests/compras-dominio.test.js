import test from 'node:test';
import assert from 'node:assert/strict';
import dominio from '../functions/compras-dominio.cjs';
import { lerPreco, compararMercados, seriesPorMercado } from '../src/utils/comprasAnalise.js';
import { ehRotaCompras, resolverRotaUsuario } from '../src/utils/rotas.js';
import { getUserPermissions } from '../src/utils/roles.js';
const { quantidade, totalItem, prepararFechamento, calcularRelatorios, podeComprar, categoriaLegada } = dominio;

test('variação exige mesma marca, embalagem e unidade; marcas diferentes não viram queda', () => {
  const base = { produtoId: 'a', nomeSnapshot: 'Arroz', apresentacao: '1 kg', unidadeCompra: 'un', supermercadoId: 'x', supermercadoNome: 'X' };
  const registros = [{ ...base, id: '1', listaId: '1', marca: 'Marca A', compradoEmMs: 1, precoUnitarioCentavos: 1000 }, { ...base, id: '2', listaId: '2', marca: 'Marca B', compradoEmMs: 2, precoUnitarioCentavos: 500 }];
  assert.equal(calcularRelatorios(registros).variacoes.length, 0);
  registros.push({ ...base, id: '3', listaId: '3', marca: 'MARCA A', compradoEmMs: 3, precoUnitarioCentavos: 900 });
  const r = calcularRelatorios(registros);
  assert.equal(r.variacoes.length, 1);
  assert.equal(r.variacoes[0].inicialCentavos, 1000);
  assert.equal(r.variacoes[0].finalCentavos, 900);
});

test('valores em centavos e quantidades fracionárias não aceitam preço ou quantidade inválida', () => {
  assert.equal(lerPreco('12,99'), 1299);
  assert.equal(totalItem(1999, 1.375), 2749);
  for (const valor of ['0', '-1', '1,234', '1e3', 'NaN']) assert.throws(() => lerPreco(valor));
  assert.equal(totalItem(5395, 0.6221), 3356);
  for (const valor of [0, -1, NaN, Infinity, 1.00001, '2']) assert.throws(() => quantidade(valor));
  assert.throws(() => totalItem(1.5, 1));
});
test('fechamento só conta comprados válidos e exige confirmação das pendências', () => {
  const comprado = { estado: 'comprado', produtoId: 'a', supermercadoId: 'x', compradoEm: 10, precoUnitarioCentavos: 500, quantidadeComprada: 2 };
  assert.throws(() => prepararFechamento([], true));
  assert.throws(() => prepararFechamento([comprado, { estado: 'pendente' }], false));
  assert.equal(prepararFechamento([comprado, { estado: 'pendente' }], true).totalCentavos, 1000);
  assert.throws(() => prepararFechamento([{ ...comprado, supermercadoId: '' }], true));
});
test('comparação usa o último preço de cada supermercado, sem confundir mudança de loja com inflação', () => {
  const base = { produtoId: 'arroz', nomeSnapshot: 'Arroz', apresentacao: '1 kg', unidadeCompra: 'un', quantidadeComprada: 1 };
  const registros = [
    { ...base, id: '1', listaId: 'a', supermercadoId: 'x', supermercadoNome: 'X', precoUnitarioCentavos: 1000, compradoEmMs: 1 },
    { ...base, id: '2', listaId: 'b', supermercadoId: 'y', supermercadoNome: 'Y', precoUnitarioCentavos: 500, compradoEmMs: 2 },
    { ...base, id: '3', listaId: 'c', supermercadoId: 'x', supermercadoNome: 'X', precoUnitarioCentavos: 1200, compradoEmMs: 3 },
  ];
  const r = calcularRelatorios(registros);
  assert.equal(r.frequencias[0].compras, 3);
  assert.ok(Math.abs(r.variacoes[0].percentual - 20) < .000001);
  assert.equal(r.variacoes[0].supermercado, 'X');
  assert.equal(r.precos[0].precoCentavos, 1200);
  assert.deepEqual(compararMercados(registros).map(r => r.precoUnitarioCentavos), [500, 1200]);
  assert.equal(seriesPorMercado(registros).length, 2);
  assert.equal(calcularRelatorios(registros.map(r => ({ ...r, valido: false }))).frequencias.length, 0);
});
test('rankings não duplicam compras e separam unidades, altas, quedas e observações insuficientes', () => {
  const base = { produtoId: 'a', nomeSnapshot: 'A', listaId: 'lista1', supermercadoId: 'x', supermercadoNome: 'X', unidadeCompra: 'kg' };
  const r = calcularRelatorios([
    { ...base, id: '1', precoUnitarioCentavos: 1000, compradoEmMs: 1 },
    { ...base, id: '2', precoUnitarioCentavos: 800, compradoEmMs: 2 },
    { ...base, id: '3', unidadeCompra: 'un', precoUnitarioCentavos: 5000, compradoEmMs: 3 },
  ]);
  assert.equal(r.frequencias[0].compras, 1);
  assert.ok(Math.abs(r.variacoes[0].percentual + 20) < .000001);
  assert.equal(r.variacoes[0].unidade, 'kg');
  const muitos = Array.from({ length: 20 }, (_, i) => ({ ...base, produtoId: `p${i}`, nomeSnapshot: `P${i}`, id: `${i}`, precoUnitarioCentavos: 100 + i, compradoEmMs: 1 }));
  assert.equal(calcularRelatorios(muitos).precos.length, 10);
  assert.equal(calcularRelatorios(muitos).variacoes.length, 0);
});
test('somente admin compra, inclusive se houver uma permissão antiga de funcionária', () => {
  const user = { role: 'funcionario', permissions: { realizarCompras: true, manageUsers: true } };
  assert.equal(podeComprar(user), false);
  assert.equal(podeComprar({ role: 'admin' }), true);
  assert.equal(podeComprar({ role: 'admin', ativo: false }), false);
  assert.equal(podeComprar({ role: 'funcionario' }), false);
  assert.equal(podeComprar({ ...user, ativo: false }), false);
  assert.equal(podeComprar({ role: 'consulta', permissions: { realizarCompras: true } }), false);
  assert.equal(getUserPermissions(user).realizarCompras, false);
  assert.equal(getUserPermissions(user).manageUsers, false);
  assert.equal(resolverRotaUsuario(user, '/lista-compras/listas/abc'), '/lista-compras/listas/abc');
  assert.equal(resolverRotaUsuario(user, '/admin'), '/ponto');
  assert.equal(ehRotaCompras('/lista-compras/../../admin'), false);
  assert.equal(categoriaLegada('Carnes'), 'acougue');
  assert.equal(categoriaLegada('Banheiro'), 'perfumaria');
});
