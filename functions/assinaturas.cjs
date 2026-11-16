const { HttpsError } = require('firebase-functions/v2/https');
const { bancoDoUsuario } = require('./grupos-contexto.cjs');
const { catalogo, resolverAssinatura } = require('./assinaturas-dominio.cjs');

async function consultarAssinatura(raiz, request, agora = Date.now()) {
  const dados = request.data || {};
  if (typeof dados !== 'object' || Array.isArray(dados) || Object.keys(dados).length) throw new HttpsError('invalid-argument', 'A consulta não recebe grupo, plano ou dados de pagamento.');
  const banco = await bancoDoUsuario(raiz, request.auth?.uid);
  if (!banco.grupoId) return { modo: 'legado', assinatura: null, titular: false, catalogo, contratacaoDisponivel: false };
  const grupoRef = raiz.doc(`grupos/${banco.grupoId}`);
  const assinaturaRef = raiz.doc(`assinaturasGrupos/${banco.grupoId}`);
  return raiz.runTransaction(async tx => {
    const [grupo, assinatura, vinculo, perfil, configuracao, exclusao] = await tx.getAll(grupoRef, assinaturaRef,
      raiz.doc(`vinculosUsuarios/${request.auth.uid}`), banco.doc(`users/${request.auth.uid}`),
      raiz.doc('assinaturasConfiguracao/google_play'), raiz.doc(`contaSolicitacoes/${request.auth.uid}`));
    if (grupo.data()?.ativo !== true || vinculo.data()?.ativo !== true
      || vinculo.data()?.grupoId !== banco.grupoId || !perfil.exists || perfil.data().ativo === false) {
      throw new HttpsError('permission-denied', 'O acesso ao grupo mudou. Entre novamente.');
    }
    // Sem corte automático de grupos existentes ou ativação parcial das cotas.
    const modo = grupo.data().assinaturasAtivas === true ? 'ativo' : 'transicao';
    const titular = grupo.data().titularUid === request.auth.uid;
    const c = configuracao.data();
    const homologacaoPlayDisponivel = modo === 'ativo' && titular && perfil.data().role === 'admin' && !exclusao.data()?.etapa
      && c?.homologacaoAtiva === true && c.entregaTesteAtiva === true && c.direitosHomologados === true
      && c.reconhecimentoTesteAtivo === true && Array.isArray(c.gruposPermitidos) && c.gruposPermitidos.includes(banco.grupoId);
    return { modo, assinatura: modo === 'ativo' ? resolverAssinatura(assinatura.data(), agora) : null,
      titular, catalogo, contratacaoDisponivel: false, homologacaoPlayDisponivel };
  });
}

module.exports = { consultarAssinatura };
