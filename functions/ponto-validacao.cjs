const CAMPOS = { ENTRADA: 'entrada', SAIDA_INTERVALO: 'saidaIntervalo', ENTRADA_INTERVALO: 'entradaIntervalo', SAIDA: 'saida' };

function proximaAcao(dia, semIntervalo) {
  if (dia?.encerrado || dia?.saida) return 'ENCERRADO';
  if (!dia?.entrada) return 'ENTRADA';
  if (semIntervalo) return 'SAIDA';
  if (!dia.saidaIntervalo) return 'SAIDA_INTERVALO';
  if (!dia.entradaIntervalo) return 'ENTRADA_INTERVALO';
  return 'SAIDA';
}

function minutos(hora) {
  if (typeof hora !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) throw new Error('Horário inválido no dia. Solicite um ajuste ao administrador.');
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

function aplicarAcao(dia, tipo, hora, funcionario, diaSemana) {
  const semIntervalo = diaSemana === 6 || funcionario.desconsiderarIntervalo === true;
  if (!CAMPOS[tipo] || tipo !== proximaAcao(dia, semIntervalo)) throw new Error('Sequência de ponto inválida. Atualize o dia antes de registrar.');
  const anteriores = ['entrada', 'saidaIntervalo', 'entradaIntervalo'].filter((campo) => dia?.[campo]);
  if (anteriores.some((campo) => minutos(dia[campo]) > minutos(hora))) throw new Error('Horário anterior à última marcação. Solicite um ajuste ao administrador.');
  const resultado = { [CAMPOS[tipo]]: hora };
  if (tipo === 'SAIDA') {
    const intervaloConfigurado = Number(funcionario.intervaloPrevistoMin ?? 60);
    const intervalo = diaSemana === 6 ? 0 : funcionario.desconsiderarIntervalo === true
      ? intervaloConfigurado : minutos(dia.entradaIntervalo) - minutos(dia.saidaIntervalo);
    const chaves = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    const carga = Number(funcionario.escala?.[chaves[diaSemana]]?.cargaMin ?? (diaSemana === 0 ? 0 : diaSemana === 6 ? funcionario.cargaSabadoMin ?? 0 : funcionario.cargaSegSexMin ?? 480));
    if (!Number.isFinite(intervalo) || intervalo < 0 || !Number.isFinite(carga) || carga < 0) throw new Error('Configuração da jornada inválida.');
    resultado.totalMin = Math.max(0, minutos(hora) - minutos(dia.entrada) - intervalo);
    resultado.saldoMin = resultado.totalMin - carga;
    resultado.encerrado = true;
    resultado.intervaloDesconsiderado = funcionario.desconsiderarIntervalo === true;
    resultado.calculoVersao = 1;
  }
  return resultado;
}

function distanciaMetros(lat, lng, localLat, localLng) {
  const rad = (n) => n * Math.PI / 180;
  const a = Math.sin(rad(localLat - lat) / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(localLat)) * Math.sin(rad(localLng - lng) / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}

module.exports = { proximaAcao, aplicarAcao, distanciaMetros };

function dataValida(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const data = new Date(`${valor}T12:00:00Z`);
  return Number.isFinite(data.getTime()) && data.toISOString().slice(0, 10) === valor;
}
module.exports.dataValida = dataValida;
