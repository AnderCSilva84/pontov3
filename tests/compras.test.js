import test from 'node:test';
import assert from 'node:assert/strict';
import { itensPendentesParaCompartilhar } from '../src/utils/compras.js';
import { gerarPdfListaCompras } from '../src/utils/exportarPdfListaCompras.js';
import { resolverRotaUsuario, ehRotaCompras } from '../src/utils/rotas.js';
import { readFile } from 'node:fs/promises';

test('funcionária abre a lista dedicada sem liberar acesso ao escritório ou financeiro', () => {
  const user = { role: 'funcionaria', funcionarioId: 'employee' };
  assert.equal(resolverRotaUsuario(user, '/lista-compras'), '/lista-compras');
  assert.equal(resolverRotaUsuario(user, '/ponto'), '/ponto');
  assert.equal(resolverRotaUsuario(user, '/admin'), '/ponto');
  assert.equal(resolverRotaUsuario(user, '/admin/financeiro'), '/ponto');
  assert.equal(resolverRotaUsuario({ role: 'admin' }, '/lista-compras'), '/lista-compras');
  assert.equal(resolverRotaUsuario({ role: 'admin' }, '/lista-compras/categorias'), '/lista-compras/categorias');
  assert.equal(ehRotaCompras('/lista-compras/categorias'), true);
  assert.equal(ehRotaCompras('/lista-compras/catalogo'), true);
  assert.equal(resolverRotaUsuario(user, '/lista-compras/catalogo'), '/lista-compras/catalogo');
  assert.equal(resolverRotaUsuario(user, '/lista-compras/categorias'), '/lista-compras');
});

test('compartilha apenas pendências e não inclui nomes de funcionários ou dados do cadastro', () => {
  const lista = [
    { nome: 'Sabão', categoria: 'Limpeza', solicitado: true, comprado: false, solicitadoPorNome: 'Pessoa privada' },
    { nome: 'Arroz', categoria: 'Mercearia', solicitado: true, comprado: false },
    { nome: 'Banana', categoria: 'Hortifruti', solicitado: true, comprado: false },
    { nome: 'Antigo', categoria: '', comprado: false },
    { nome: 'Comprado', solicitado: false, comprado: true },
    { nome: 'Retirado', solicitado: false, comprado: false },
  ];
  const pendentes = itensPendentesParaCompartilhar(lista);
  assert.deepEqual(pendentes.map((item) => item.nome), ['Banana', 'Arroz', 'Sabão', 'Antigo']);
  assert.ok(pendentes.every((item) => Object.keys(item).sort().join(',') === 'categoria,nome'));
  assert.equal(lista[0].nome, 'Sabão');
});

test('gera PDF como arquivo compartilhável sem consultar dados restritos do Firestore', async () => {
  const logoData = `data:image/png;base64,${(await readFile(new URL('../public/icon-192.png', import.meta.url))).toString('base64')}`;
  const arquivo = await gerarPdfListaCompras([{ nome: 'Arroz', categoria: 'Mercearia' }, { nome: 'Banana', categoria: 'Hortifruti' }], { logoData });
  assert.equal(arquivo.blob.type, 'application/pdf');
  assert.equal(arquivo.nomeArquivo, 'Lista_de_compras.pdf');
  assert.ok(arquivo.blob.size > 1000);
  const bytes = await arquivo.blob.text();
  assert.ok(bytes.startsWith('%PDF'));
  assert.ok(bytes.includes('Arroz'));
  assert.ok(bytes.includes('Banana'));
});
