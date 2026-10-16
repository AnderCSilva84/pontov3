import test from "node:test";
import assert from "node:assert/strict";
import { obterPosicaoAtual } from "../src/utils/localizacao.js";

test("GPS sem resposta termina e tenta localização por rede", async () => {
  const opcoes = [];
  const coords = { latitude: -1.4, longitude: -48.4 };
  const gps = { getCurrentPosition(ok, _erro, config) {
    opcoes.push(config);
    if (!config.enableHighAccuracy) ok({ coords });
  } };
  assert.deepEqual(await obterPosicaoAtual(gps, 5), coords);
  assert.deepEqual(opcoes.map(o => o.enableHighAccuracy), [true, false]);
  assert.ok(opcoes.every(o => o.maximumAge === 0));
});

test("permissão negada orienta e não solicita novamente", async () => {
  let chamadas = 0;
  const gps = { getCurrentPosition(_ok, erro) { chamadas++; erro({ code: 1 }); } };
  await assert.rejects(obterPosicaoAtual(gps, 5), /Permita a localização/);
  assert.equal(chamadas, 1);
});

test("duas buscas sem resposta liberam a tentativa com erro", async () => {
  await assert.rejects(obterPosicaoAtual({ getCurrentPosition() {} }, 5), /Não conseguimos localizar/);
});
