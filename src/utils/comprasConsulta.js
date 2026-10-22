export function compararPrecoConsultado(registros, precoCentavos) {
  const pontos = registros.filter(r => Number.isSafeInteger(r.precoUnitarioCentavos) && r.precoUnitarioCentavos > 0);
  if (!pontos.length) return null;
  const ultimo = [...pontos].sort((a,b) => b.compradoEmMs-a.compradoEmMs || String(b.id).localeCompare(String(a.id)))[0];
  const media = Math.round(pontos.reduce((s,r) => s+r.precoUnitarioCentavos,0)/pontos.length);
  return { ultimo, media, menor: Math.min(...pontos.map(r=>r.precoUnitarioCentavos)), maior: Math.max(...pontos.map(r=>r.precoUnitarioCentavos)), amostra:pontos.length, diferencaPct: (precoCentavos/media-1)*100 };
}
export function agruparHistoricoMensal(listas) {
  const meses = new Map();
  for (const lista of listas) {
    const ms = lista.finalizadaEm?.toMillis?.() ?? lista.finalizadaEmMs;
    const partes = Number.isFinite(ms) ? Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Fortaleza',year:'numeric',month:'2-digit'}).formatToParts(new Date(ms)).map(p=>[p.type,p.value])) : null;
    const chave = partes ? `${partes.year}-${partes.month}` : 'Sem data';
    if (!meses.has(chave)) meses.set(chave,{chave,listas:[],totalCentavos:0});
    const mes=meses.get(chave);mes.listas.push(lista);
    if(lista.status==='finalizada') mes.totalCentavos += Number(lista.totalCentavos || 0);
  }
  return [...meses.values()].sort((a,b)=>b.chave.localeCompare(a.chave));
}
export function gastosUltimosTresMeses(listas, agora=Date.now()) {
  const partes=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Fortaleza',year:'numeric',month:'2-digit'}).formatToParts(new Date(agora)).map(p=>[p.type,p.value]));
  const totais=new Map(agruparHistoricoMensal(listas).map(m=>[m.chave,m.totalCentavos]));
  return [2,1,0].map(atras=>{
    const data=new Date(Date.UTC(Number(partes.year),Number(partes.month)-1-atras,15,12));
    const chave=data.toISOString().slice(0,7);
    return {chave,nome:data.toLocaleDateString('pt-BR',{month:'long',year:'numeric',timeZone:'America/Fortaleza'}),totalCentavos:totais.get(chave)||0};
  });
}
export function filtrarProdutosConsulta(opcoes,busca) {
  const normalizar=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
  const termos=normalizar(busca).trim().split(/\s+/).filter(Boolean);
  return opcoes.filter(([,r])=>termos.every(t=>normalizar(`${r.nomeSnapshot} ${r.marca||''} ${r.apresentacao||''} ${r.categoriaNome||''}`).includes(t)));
}
