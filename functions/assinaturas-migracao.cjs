const { createHash } = require('node:crypto');
const { grupoValido } = require('./grupos-contexto.cjs');
const { resolverAssinatura } = require('./assinaturas-dominio.cjs');

// Inventário consistente e somente leitura. Não concede plano nem ativa cotas.
async function inventariarAssinaturas(raiz, grupoId, agora = Date.now()) {
  if (!grupoValido(grupoId)) throw Error('Informe um grupo válido explicitamente.');
  return raiz.runTransaction(async tx => {
    const grupoRef = raiz.doc(`grupos/${grupoId}`);
    const colecoes = ['users','funcionarios','dias','comprasListas','tarefasSemanais','tarefas','lembretes'];
    const grupo = await tx.get(grupoRef);
    if (!grupo.exists) throw Error('Grupo não encontrado. Migre primeiro os dados legados.');
    const assinatura = await tx.get(raiz.doc(`assinaturasGrupos/${grupoId}`));
    const snapshots = [];
    for (const c of colecoes) snapshots.push(await tx.get(grupoRef.collection(c)));
    const [pessoas, funcionarios, dias, listas, fixas, avulsas, lembretes] = snapshots.map(s => s.docs);
    const ativo = d => d.data().ativo !== false;
    const g = grupo.data(), { plano, direitos } = resolverAssinatura(assinatura.data(), agora);
    const bloqueios = [], alertas = [];
    if (g.ativo !== true) bloqueios.push('grupo_inativo');
    if (!grupoValido(g.titularUid)) bloqueios.push('titular_ausente_ou_invalido');
    const admins = pessoas.filter(p => ativo(p) && p.data().role === 'admin');
    if (admins.length !== 1 || admins[0]?.id !== g.titularUid) bloqueios.push('revisar_administrador_unico');
    const adicionais = [];
    for (const p of pessoas.filter(ativo)) {
      const [vinculo, exclusao] = await tx.getAll(raiz.doc(`vinculosUsuarios/${p.id}`), raiz.doc(`contaSolicitacoes/${p.id}`));
      adicionais.push(vinculo, exclusao);
      if (vinculo.data()?.ativo !== true || vinculo.data()?.grupoId !== grupoId) bloqueios.push('vinculo_inconsistente');
      if (exclusao.data()?.etapa) bloqueios.push('exclusao_em_andamento');
    }
    const uso = { funcionarios: funcionarios.filter(ativo).length,
      listas: listas.filter(d => ['rascunho','em_compra'].includes(d.data().status)).length,
      tarefas: fixas.filter(d => d.data().ativa !== false).length + avulsas.filter(d => d.data().concluida !== true).length,
      lembretes: lembretes.filter(d => d.data().ativo === true).length };
    const excedentes = Object.fromEntries(Object.entries(uso).map(([k,v]) => [k, Math.max(0,v-direitos[k])]));
    if (Object.values(excedentes).some(Boolean)) alertas.push('acima_das_cotas_preservar_dados');
    if (pessoas.some(p => ativo(p) && p.id !== g.titularUid) && plano === 'free') alertas.push('compartilhamento_sera_restrito');
    const abertas = dias.filter(d => d.data().entrada && !d.data().saida);
    if (abertas.length) alertas.push('jornadas_abertas_preservar_e_conciliar');
    if (plano === 'free') alertas.push('titular_deve_confirmar_selecao_do_ponto');
    if (funcionarios.some(p => ativo(p) && (!p.data().nome || !Array.isArray(p.data().locaisPermitidos) || !p.data().locaisPermitidos.length))) alertas.push('revisar_cadastro_e_locais_do_ponto');
    const versoes = [grupo,assinatura,...snapshots.flatMap(s=>s.docs),...adicionais]
      .map(s => [s.ref.path,s.exists ? `${s.updateTime.seconds}:${s.updateTime.nanoseconds}` : null]).sort((a,b)=>a[0].localeCompare(b[0]));
    const assinaturaInventario = createHash('sha256').update(JSON.stringify({grupoId,plano,versoes})).digest('hex');
    return { versao:1, modo:'somente_leitura', grupoId, comercialAtivo:g.assinaturasAtivas===true, plano,
      uso, limites:Object.fromEntries(Object.keys(uso).map(k=>[k,direitos[k]])), excedentes,
      jornadasAbertas:abertas.length, membrosAtivos:pessoas.filter(ativo).length,
      bloqueios:[...new Set(bloqueios)], alertas:[...new Set(alertas)], assinaturaInventario,
      ativacaoDisponivel:false, pendenciasExternas:['homologacao_pwa_android','filas_locais_dos_aparelhos','cobranca_e_notificacoes','revisao_do_titular'] };
  });
}
module.exports = { inventariarAssinaturas };
