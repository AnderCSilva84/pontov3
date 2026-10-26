export function somarBancoHoras(registros,funcionario,mesYYYYMM,inicioContagem=''){
 const inicio=mesYYYYMM+'-01',fim=mesYYYYMM+'-31';
 const normalizarMinutos=v=>Number.isFinite(Number(String(v??0).replace(',','.')))?Number(String(v??0).replace(',','.')):0;
 const horaParaMinutos=h=>{const [a,b]=h.split(':').map(Number);return a*60+b;};
  return registros.reduce((total, data) => {
    const dataKey = String(data?.dataKey || "");

    if (dataKey < inicio || dataKey > fim || (inicioContagem && dataKey < inicioContagem)) return total;

    if (
      data?.ajusteTipo === "atestado" ||
      data?.ajusteTipo === "dispensa" ||
      data?.ajusteTipo === "ferias" ||
      data?.ajusteTipo === "falta" ||
      data?.ajusteTipo === "saida_mais_cedo"
    ) {
      return total;
    }

    if (!data.calculoVersao && funcionario.desconsiderarIntervalo && data?.entrada && data?.saida) {
      const entradaMin = horaParaMinutos(data.entrada);
      const saidaMin = horaParaMinutos(data.saida);
      const dataLocal = new Date(`${dataKey}T12:00:00`);
      const diaSemana = dataLocal.getDay();
      const chavesDia = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
      const cargaEscala = Number(funcionario?.escala?.[chavesDia[diaSemana]]?.cargaMin);
      const cargaPadrao = diaSemana === 6 ? Number(funcionario.cargaSabadoMin) : Number(funcionario.cargaSegSexMin);
      const cargaPrevista = Number.isFinite(cargaEscala) ? cargaEscala : (Number.isFinite(cargaPadrao) ? cargaPadrao : (diaSemana === 0 ? 0 : 480));
      const intervalo = diaSemana === 6 ? 0 : (Number.isFinite(Number(funcionario.intervaloPrevistoMin)) ? Number(funcionario.intervaloPrevistoMin) : 60);
      return total + (Math.max(0, saidaMin - entradaMin - intervalo) - cargaPrevista);
    }

    return total + normalizarMinutos(data?.saldoMin);
  }, 0);
}
