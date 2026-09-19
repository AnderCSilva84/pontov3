const FIXOS = {
  "01-01": "Confraternização Universal",
  "04-21": "Tiradentes",
  "05-01": "Dia do Trabalho",
  "09-07": "Independência do Brasil",
  "10-12": "Nossa Senhora Aparecida",
  "11-02": "Finados",
  "11-15": "Proclamação da República",
  "11-20": "Consciência Negra",
  "12-25": "Natal",
};

function iso(data) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

function somarDias(data, dias) {
  const copia = new Date(data);
  copia.setDate(copia.getDate() + dias);
  return copia;
}

// Algoritmo de Meeus/Jones/Butcher para a Páscoa no calendário gregoriano.
function dataPascoa(ano) {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

export function feriadosBrasil(ano) {
  const resultado = {};
  Object.entries(FIXOS).forEach(([diaMes, nome]) => {
    resultado[`${ano}-${diaMes}`] = nome;
  });
  const pascoa = dataPascoa(ano);
  resultado[iso(somarDias(pascoa, -48))] = "Carnaval";
  resultado[iso(somarDias(pascoa, -47))] = "Carnaval";
  resultado[iso(somarDias(pascoa, -2))] = "Sexta-feira Santa";
  resultado[iso(pascoa)] = "Páscoa";
  resultado[iso(somarDias(pascoa, 60))] = "Corpus Christi";
  return resultado;
}

export function nomeFeriado(data) {
  return feriadosBrasil(data.getFullYear())[iso(data)] || "";
}

export function ehDiaUtil(data) {
  return data.getDay() !== 0 && !nomeFeriado(data);
}

export function dataIsoLocal(data = new Date()) {
  return iso(data);
}
