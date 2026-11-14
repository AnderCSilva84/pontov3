export const competenciaValida=v=>typeof v==='string'&&/^(20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(v);
export function somarMeses(competencia,meses){
 if(!competenciaValida(competencia)||!Number.isInteger(meses)||meses<0||meses>360)throw Error('Competência ou intervalo inválido.');
 const [ano,mes]=competencia.split('-').map(Number),d=new Date(Date.UTC(ano,mes-1+meses,1));const resultado=d.toISOString().slice(0,7);
 if(!competenciaValida(resultado))throw Error('As parcelas ultrapassam a competência permitida.');return resultado;
}
export function montarParcelas(valor,quantidade,primeiraCompetencia,intervaloMeses=1){
 const centavos=Math.round(Number(valor)*100);
 if(!Number.isSafeInteger(centavos)||centavos<1||centavos>1e10||Math.abs(Number(valor)*100-centavos)>.00001)throw Error('Informe o valor total com até duas casas decimais.');
 if(!Number.isInteger(quantidade)||quantidade<1||quantidade>120||quantidade>centavos||![1,2,3].includes(intervaloMeses))throw Error('Escolha de 1 a 120 parcelas, sem parcelas zeradas, e recorrência mensal, bimestral ou trimestral.');
 const base=Math.floor(centavos/quantidade),resto=centavos%quantidade;
 return Array.from({length:quantidade},(_,i)=>({numero:i+1,competencia:somarMeses(primeiraCompetencia,i*intervaloMeses),centavos:base+(i<resto?1:0)}));
}
// Planos antigos sem marcação explícita continuam manuais. Não adivinhar quais
// vales anteriores já foram descontados em outras folhas.
export function adiantamentosDaCompetencia(lancamentos,funcionarioId,competencia){
 const vistos=new Set(),itens=[];
 for(const l of lancamentos){
  if(!l.id||vistos.has(l.id)||l.funcionarioId!==funcionarioId||!['vale','adiantamento'].includes(l.tipo)||l.parcelamento?.versao!==1)continue;vistos.add(l.id);
  const plano=l.parcelamento;
  if(plano.canceladoAPartir&&competencia>=plano.canceladoAPartir)continue;
  // Reconstruir pelo contrato original, sem confiar em arrays recebidos do cliente.
  let parcelas;try{parcelas=montarParcelas(l.valor,plano.quantidade,plano.primeiraCompetencia,plano.intervaloMeses);}catch{return {itens:[],total:0,erro:'Há um parcelamento inválido. Confira os vales/adiantamentos antes de salvar a folha.'};}
  const p=parcelas.find(p=>p.competencia===competencia);if(!p)continue;
  itens.push({lancamentoId:l.id,numero:p.numero,quantidade:plano.quantidade,competencia,centavos:p.centavos,valor:p.centavos/100,tipo:l.tipo,descricao:String(l.descricao||l.tipoLabel||'Adiantamento').slice(0,300)});
 }
 itens.sort((a,b)=>a.lancamentoId.localeCompare(b.lancamentoId));
 return {itens,total:itens.reduce((s,i)=>s+i.centavos,0)/100};
}
