export default function CalculoPagamentoEspecial({ tipo, dados, onChange, calculo, erro }) {
  const editar = (campo, valor) => onChange({ ...dados, [campo]: valor, ...(campo === 'dataDesligamento' && valor ? { diasSaldo: Math.min(30, Number(valor.slice(-2))) } : {}) });
  const campo = (id, label, type = 'number', max) => <label className="field" key={id}><span>{label}</span><input type={type} min={type === 'number' ? 0 : undefined} max={max} step={type === 'number' ? '0.01' : undefined} value={dados[id]} onChange={e => editar(id, e.target.value)} /></label>;
  const check = (id, label) => <label className="folha-checkbox"><input type="checkbox" checked={dados[id]} onChange={e => editar(id, e.target.checked)} /><span>{label}</span></label>;
  return <section className="financeiro-descricao card">
    <h2>Cálculo de {tipo === 'decimo_terceiro' ? '13º salário' : tipo === 'ferias' ? 'férias' : 'rescisão'}</h2>
    <div className="financeiro-form">{campo('salario','Salário base')}{campo('mediaVariaveis','Média mensal de verbas variáveis')}
      {tipo === 'decimo_terceiro' && <>
        <label className="field"><span>Parcela</span><select value={dados.parcela} onChange={e => editar('parcela',e.target.value)}><option value="integral">Integral</option><option value="primeira">Primeira parcela · adiantamento</option><option value="segunda">Segunda parcela · quitação</option></select></label>
        {check('avosAutomaticos','Calcular avos pela admissão e data de referência')}
        {dados.avosAutomaticos ? <>{campo('admissao','Admissão','date')}{campo('dataReferencia','Data de referência','date')}</> : campo('avos13','Meses com pelo menos 15 dias trabalhados (avos)', 'number',12)}
      </>}
      {tipo === 'ferias' && <>{campo('periodoInicio','Início do gozo','date')}{campo('periodoFim','Fim do gozo','date')}{campo('diasFerias','Dias de gozo','number',30)}{campo('diasAbono','Dias vendidos (abono)','number',10)}<p className="text-muted financeiro-descricao">O cálculo inclui o adicional de 1/3. A retenção estimada considera somente estas férias; confira a distribuição por competência e a folha do mês no eSocial.</p></>}
      {tipo === 'rescisao' && <>
        <p className="text-muted financeiro-descricao">Contrato doméstico por prazo indeterminado. O cálculo mostra verbas pagas diretamente; guias de FGTS/DAE e indenização compensatória são apuradas no eSocial.</p>
        <label className="field"><span>Motivo do desligamento</span><select value={dados.motivo} onChange={e => onChange({ ...dados, motivo: e.target.value, aviso: e.target.value === 'pedido' || e.target.value === 'justa_causa' ? 'dispensado' : 'indenizado' })}><option value="sem_justa_causa">Dispensa sem justa causa</option><option value="pedido">Pedido de demissão</option><option value="acordo">Acordo entre as partes</option><option value="justa_causa">Dispensa por justa causa</option></select></label>
        {campo('admissao','Admissão','date')}{campo('dataDesligamento','Último dia trabalhado','date')}{campo('inicioAquisitivo','Início do período aquisitivo incompleto','date')}{campo('diasSaldo','Dias de saldo salarial ainda não pagos','number',30)}
        <label className="field"><span>Aviso prévio</span><select value={dados.aviso} onChange={e => editar('aviso',e.target.value)}><option value="trabalhado">Trabalhado</option><option value="indenizado">Indenizado pelo empregador</option><option value="dispensado">Dispensado, sem verba de aviso</option><option value="descontado">Não cumprido · descontar no pedido</option></select></label>
        {check('avisoAutomatico','Calcular dias do aviso pelo tempo de serviço')}{!dados.avisoAutomatico && campo('diasAviso','Dias do aviso','number',90)}
        {check('avosAutomaticos','Calcular avos com a projeção do aviso indenizado')}{!dados.avosAutomaticos && <>{campo('avos13','Avos de 13º, incluindo projeção','number',12)}{campo('avosFerias','Avos de férias proporcionais, incluindo projeção','number',12)}</>}
        {campo('diasFeriasVencidas','Dias de férias vencidas ainda não pagos','number',360)}{check('feriasEmDobro','Férias vencidas informadas com pagamento em dobro')}
      </>}
      {!(tipo === 'decimo_terceiro' && dados.parcela === 'primeira') && campo('adiantado','Adiantamento desta verba já pago')}
      {campo('irrf','IRRF conferido no eSocial')}{campo('outrosDescontos','Outros descontos')}
    </div>
    {erro && <p role="alert" className="mensagem erro">{erro}</p>}
    {calculo && <><h3>Verbas calculadas</h3>{calculo.linhas.map((l,i) => <div className="folha-resumo-linha" key={i}><span>{l.descricao}</span><strong>{(l.desconto ? -l.valor : l.valor).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</strong></div>)}{calculo.dataProjetada && <p>Projeção do aviso: {calculo.dataProjetada.split('-').reverse().join('/')}</p>}<div className="folha-resumo-linha"><strong>Líquido estimado</strong><strong>{calculo.liquido.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</strong></div></>}
    <p className="text-muted">Confira incidências, médias, avos, IRRF e demais vínculos no eSocial. Estes dados afetam o valor a pagar.</p>
  </section>;
}
