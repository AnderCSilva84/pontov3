import test from "node:test";
import assert from "node:assert/strict";
import { dataIsoLocal, ehDiaUtil, feriadosBrasil, nomeFeriado } from "../src/utils/feriados.js";

test("reconhece feriados nacionais fixos", () => {
  assert.equal(nomeFeriado(new Date(2026, 8, 7)), "Independência do Brasil");
  assert.equal(feriadosBrasil(2026)["2026-12-25"], "Natal");
});

test("calcula corretamente os feriados móveis de 2026", () => {
  const feriados = feriadosBrasil(2026);
  assert.equal(feriados["2026-02-17"], "Carnaval");
  assert.equal(feriados["2026-04-03"], "Sexta-feira Santa");
  assert.equal(feriados["2026-06-04"], "Corpus Christi");
});

test("domingo e feriado não são dias úteis", () => {
  assert.equal(ehDiaUtil(new Date(2026, 8, 13)), false);
  assert.equal(ehDiaUtil(new Date(2026, 8, 7)), false);
  assert.equal(ehDiaUtil(new Date(2026, 8, 14)), true);
});

test("gera data ISO no fuso local sem deslocamento UTC", () => {
  assert.equal(dataIsoLocal(new Date(2026, 8, 14, 23, 30)), "2026-09-14");
});
