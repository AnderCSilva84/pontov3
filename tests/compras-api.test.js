import catalogo from '../functions/no-bolso-product-catalog.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import dominio from '../functions/compras-api-dominio.cjs';
import api from '../functions/compras-api.cjs';
const { melhorPrecoLista, compararProduto, caminhoApi } = dominio;
const a = { produtoId: 'a', nomeSnapshot: 'Arroz', apresentacao: '1 kg', unidadeCompra: 'un', estado: 'pendente', quantidadePlanejada: 2 };
const b = { produtoId: 'b', nomeSnapshot: 'Banana', apresentacao: 'A granel', unidadeCompra: 'kg', estado: 'pendente', quantidadePlanejada: 1 };
const preco = (id, produto, mercado, valor, ms) => ({ ...produto, id, supermercadoId: mercado, supermercadoNome: mercado, precoUnitarioCentavos: valor, compradoEmMs: ms });

test('marcas distintas permanecem identificadas e não duplicam a soma do supermercado', () => {
  const registros = [preco('1', { ...a, marca: 'A' }, 'X', 100, 1), preco('2', { ...a, marca: 'B' }, 'X', 200, 2)];
  assert.equal(compararProduto(registros, 'a').length, 2);
  const r = melhorPrecoLista([a], registros);
  assert.equal(r.supermercados[0].itensComPreco, 1);
  assert.equal(r.supermercados[0].totalCentavos, 200);
  assert.equal(r.produtos[0].menorOferta.marca, 'A');
  const comprado = melhorPrecoLista([{ ...a, estado: 'comprado', quantidadeComprada: 1, marca: 'B' }], registros);
  assert.equal(comprado.produtos[0].ofertas.length, 1);
  assert.equal(comprado.totalDistribuidoCentavos, 200);
});
test('melhor preço exige cobertura completa e não mistura embalagens ou observações antigas', () => {
  const registros = [preco('1', a, 'X', 100, 1), preco('2', a, 'X', 150, 2), preco('3', a, 'Y', 120, 3), preco('4', b, 'X', 200, 4), preco('5', { ...a, apresentacao: '5 kg' }, 'Z', 1, 5), { ...preco('6', b, 'Y', 1, 6), valido: false }];
  const r = melhorPrecoLista([a, b], registros);
  assert.equal(r.melhorSupermercado.supermercadoId, 'X');
  assert.equal(r.melhorSupermercado.totalCentavos, 500);
  assert.equal(r.supermercados.find(m => m.supermercadoId === 'Y').totalCentavos, null);
  assert.equal(r.supermercados.find(m => m.supermercadoId === 'Y').totalParcialCentavos, 240);
  assert.equal(r.totalDistribuidoCentavos, 440);
  assert.equal(r.produtos[0].menorOferta.supermercadoId, 'Y');
  assert.equal(r.supermercados.some(m => m.supermercadoId === 'Z'), false);
  assert.equal(compararProduto(registros, 'a').find(p => p.supermercadoId === 'X').precoUnitarioCentavos, 150);
});
test('ausência de preço não vira zero nem indica uma cesta incompleta como mais barata', () => {
  const r = melhorPrecoLista([a, b], [preco('1', a, 'X', 100, 1)]);
  assert.equal(r.melhorSupermercado, null);
  assert.equal(r.totalDistribuidoCentavos, null);
  assert.deepEqual(r.itensSemPreco, ['b']);
  assert.equal(melhorPrecoLista([], []).totalDistribuidoCentavos, null);
  assert.equal(melhorPrecoLista([b], [preco('2', b, 'X', 399, 2)]).totalDistribuidoCentavos, 399);
});
test('rotas não aceitam caminho arbitrário, escrita ou acesso a coleções internas', () => {
  assert.equal(caminhoApi('/v1/listas/a/melhor-preco').tipo, 'melhor-preco');
  assert.equal(caminhoApi('/v1/users'), null);
  assert.equal(caminhoApi('/v1/listas/../../users'), null);
  assert.equal(caminhoApi('/v1/listas/a%2Fb'), null);
});
function resposta() {
  return { code: 200, headers: {}, body: null, set(k, v) { this.headers[k] = v; return this; }, status(c) { this.code = c; return this; }, json(v) { this.body = v; return this; } };
}
const request = (method = 'GET', token = 'x'.repeat(30)) => ({ method, path: '/v1/listas', query: {}, get: () => token ? `Bearer ${token}` : '' });
test('API autentica o servidor, rejeita tokens inválidos e bloqueia todos os métodos de escrita', async () => {
  let leituras = 0;
  const db = () => { leituras++; throw new Error('Não deve chegar ao banco'); };
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
    const handler = api.criarHandlerComprasApi({ db, verificar: async () => ({ email: 'no-bolso-runtime@organizanderson.iam.gserviceaccount.com', email_verified: true }) });
    const res = resposta(); await handler(request(method), res); assert.equal(res.code, 405);
  }
  let res = resposta(); await api.criarHandlerComprasApi({ db })(request('GET', ''), res); assert.equal(res.code, 401);
  res = resposta(); await api.criarHandlerComprasApi({ db, verificar: async () => { throw new Error('JWT expirado'); } })(request(), res); assert.equal(res.code, 401);
  res = resposta(); await api.criarHandlerComprasApi({ db, verificar: async () => ({ email: 'outro@example.test', email_verified: true }) })(request(), res); assert.equal(res.code, 403);
  res = resposta(); await api.criarHandlerComprasApi({ db, verificar: async () => ({ email: 'no-bolso-runtime@organizanderson.iam.gserviceaccount.com', email_verified: false }) })(request(), res); assert.equal(res.code, 403);
  assert.equal(leituras, 0);
});


test('catálogo contém produtos fora do top10 e distingue marcas/embalagens das ofertas', () => {
 const registros=Array.from({length:15},(_,i)=>preco('registro-'+i,{...a,produtoId:'produto-'+i,nomeSnapshot:'Produto '+i,listaId:i<10?'primeira':'fim-semana'},'X',100+i,1000+i));
 const completo=catalogo.catalogoProdutos(registros);
 assert.equal(completo.length,15);
 assert.ok(completo.some(p=>p.produtoId==='produto-14'));
 const variantes=[preco('a',{...a,marca:'A'},'X',100,1000),preco('b',{...a,marca:'B'},'X',200,2000)];
 assert.deepEqual(catalogo.catalogoProdutos(variantes).map(p=>p.apresentacao).sort(),compararProduto(variantes,'a').map(p=>p.apresentacao).sort());
 assert.equal(catalogo.catalogoProdutos([preco('sem',{...a,apresentacao:'',marca:'A'},'X',100,1000)])[0].embalagemInformada,false);
});
