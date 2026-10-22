import test from 'node:test';
import assert from 'node:assert/strict';
import { recortesQr } from '../src/utils/cupomImagem.js';

test('recortes preservam a foto inteira e o centro em orientação retrato e paisagem', () => {
  for (const [w, h] of [[4032, 3024], [3024, 4032], [800, 800]]) {
    const recortes = recortesQr(w, h);
    assert.deepEqual(recortes[0], { x: 0, y: 0, largura: w, altura: h });
    for (const r of recortes) {
      assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.largura <= w && r.y + r.altura <= h);
      assert.ok(Math.abs(r.x + r.largura / 2 - w / 2) <= 1);
      assert.ok(Math.abs(r.y + r.altura / 2 - h / 2) <= 1);
    }
    assert.ok(recortes[2].largura < recortes[1].largura);
  }
});
