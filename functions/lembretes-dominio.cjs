const DIA = 86400000, FUSO = 3 * 3600000;
const dataLocal = ms => new Date(ms - FUSO).toISOString().slice(0, 10);
function dataValida(valor) {
  return typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor) && Number.isFinite(Date.parse(valor)) && new Date(`${valor}T12:00:00Z`).toISOString().slice(0, 10) === valor;
}
function proximoDisparo(dados, aposMs) {
  const inicio = Math.max(Date.parse(`${dados.dataInicio}T00:00:00-03:00`), Date.parse(`${dataLocal(aposMs)}T00:00:00-03:00`));
  for (let n = 0; n < 370; n++) {
    const dia = dataLocal(inicio + n * DIA);
    if (dados.repeticao === 'uma_vez' && dia !== dados.dataInicio) return null;
    if (dados.repeticao === 'dias' && !dados.diasSemana.includes(new Date(`${dia}T12:00:00Z`).getUTCDay())) continue;
    for (const horario of [...(dados.horarios || [dados.horario])].sort()) {
      const candidato = Date.parse(`${dia}T${horario}:00-03:00`);
      if (candidato > aposMs) return candidato;
    }
  }
  return null;
}
function validarLembrete(d, agora = Date.now()) {
  const titulo = typeof d.titulo === 'string' ? d.titulo.trim() : '';
  const observacao = typeof d.observacao === 'string' ? d.observacao.trim() : '';
  if (!titulo || titulo.length > 120 || observacao.length > 300) throw Error('Informe um título de até 120 caracteres e observação de até 300.');
  if (!['remedio', 'passeio', 'fisioterapia', 'consulta', 'cuidado', 'outro'].includes(d.tipo)) throw Error('Escolha o tipo do lembrete.');
  const destinatarioCuidado = d.destinatarioCuidado || 'crianca';
  const nomeCuidado = typeof d.nomeCuidado === 'string' ? d.nomeCuidado.trim() : '';
  if (!['crianca', 'idoso', 'adulto', 'cao', 'gato'].includes(destinatarioCuidado) || nomeCuidado.length > 100 || (['cao', 'gato'].includes(destinatarioCuidado) && !nomeCuidado)) throw Error('Informe quem recebe o cuidado e o nome do pet (até 100 caracteres).');
  const horarios = d.horarios === undefined ? [d.horario] : d.horarios;
  if (!Array.isArray(horarios) || !horarios.length || horarios.length > 24 || horarios.some(h => typeof h !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(h)) || new Set(horarios).size !== horarios.length || !dataValida(d.dataInicio)) throw Error('Informe de 1 a 24 horários válidos, sem repetir, e uma data válida.');
  if (d.tipo !== 'remedio' && horarios.length !== 1) throw Error('Use um horário para este tipo de cuidado.');
  if (!['uma_vez', 'diario', 'dias'].includes(d.repeticao)) throw Error('Escolha a repetição do lembrete.');
  const diasSemana = d.repeticao === 'dias' ? d.diasSemana : [];
  if (!Array.isArray(diasSemana) || (d.repeticao === 'dias' && !diasSemana.length) || diasSemana.some(n => !Number.isInteger(n) || n < 0 || n > 6) || new Set(diasSemana).size !== diasSemana.length) throw Error('Selecione os dias da semana.');
  const ordenados = [...horarios].sort();
  const dados = { titulo, observacao, tipo: d.tipo, destinatarioCuidado, nomeCuidado, horario: ordenados[0], horarios: ordenados, dataInicio: d.dataInicio, repeticao: d.repeticao, diasSemana };
  if (d.tipo === 'remedio') {
    const medicamento = typeof d.medicamento === 'string' ? d.medicamento.trim() : '';
    const posologia = typeof d.posologia === 'string' ? d.posologia.trim() : '';
    if (!medicamento || medicamento.length > 120 || !posologia || posologia.length > 200) throw Error('Informe o nome do remédio (até 120 caracteres) e a posologia (até 200).');
    Object.assign(dados, { medicamento, posologia });
  } else Object.assign(dados, { medicamento: '', posologia: '' });
  const proximoMs = proximoDisparo(dados, agora);
  if (!proximoMs) throw Error('Escolha um horário futuro para o lembrete.');
  return { ...dados, proximoMs };
}
const cuidadoraAtiva = perfil => perfil?.role === 'funcionario' && perfil.ativo !== false && perfil.babaCuidadora === true;
const destinatarioAtivo = perfil => cuidadoraAtiva(perfil) || (perfil?.role === 'admin' && perfil.ativo !== false && perfil.lembretesHabilitados === true);
function dentroExpediente(perfil, funcionario, ms) {
  if (perfil?.role === 'admin') return true;
  if (!funcionario || funcionario.ativo === false) return false;
  const dias = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  const local = new Date(ms - FUSO), minuto = local.getUTCHours() * 60 + local.getUTCMinutes();
  const minutos = h => typeof h === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(h) ? Number(h.slice(0, 2)) * 60 + Number(h.slice(3)) : null;
  function intervalo(dia) {
    const escala = funcionario.escala?.[dias[dia]];
    if (!escala || escala.ativo === false || Number(escala.cargaMin) === 0) return null;
    const inicio = minutos(escala.inicio), fim = minutos(escala.fim);
    return inicio !== null && fim !== null && inicio !== fim ? { inicio, fim } : null;
  }
  const hoje = intervalo(local.getUTCDay()), ontem = intervalo((local.getUTCDay() + 6) % 7);
  return Boolean((hoje && (hoje.fim > hoje.inicio ? minuto >= hoje.inicio && minuto < hoje.fim : minuto >= hoje.inicio)) || (ontem && ontem.fim < ontem.inicio && minuto < ontem.fim));
}
module.exports = { dataLocal, dataValida, proximoDisparo, validarLembrete, cuidadoraAtiva, destinatarioAtivo, dentroExpediente };
