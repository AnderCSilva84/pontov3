const test = require('node:test');
const assert = require('node:assert/strict');
const { iconeCategoriaValido } = require('../functions/compras-icone-validacao.cjs');
const colecao = require('../functions/compras-icones.json');
test('ícones aceitam coleção e um emoji personalizado composto, recusando texto e conteúdo ativo', () => {
  for (const { icone } of colecao) assert.equal(iconeCategoriaValido(icone), true, icone);
  for (const icone of ['🏎️', '👩🏽‍🔧', '🇧🇷']) assert.equal(iconeCategoriaValido(icone), true, icone);
  for (const icone of ['', ' ', 'carro', '🚗🔧', '<svg>', 'https://exemplo.com/a.svg', null, 123, ' 🚗', '🚗'.repeat(40)]) assert.equal(iconeCategoriaValido(icone), false);
});
