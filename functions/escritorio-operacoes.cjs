const { HttpsError } = require('firebase-functions/v2/https');
const { FieldValue } = require('firebase-admin/firestore');
const { createHash } = require('node:crypto');
const { bancoDoUsuario } = require('./grupos-contexto.cjs');
const { exigirRecurso } = require('./assinaturas-recursos.cjs');
const falha = (c, m) => { throw new HttpsError(c, m); };
const camposCadastro = ['nome','telefone','email','cpf','ctps','rg','dataNascimento','cargo','dataAdmissao','salarioBase','endereco','cidade','estado','cep','contatoEmergencia','telefoneEmergencia','fotoUrl','esocialUrl','filialId','observacoes','desconsiderarIntervalo','intervaloPrevistoMin'];
const camposFilial = ['nome','cnpj','telefone','endereco','cidade','estado','cep'];
function validarCampos(dados, campos) {
  if (!dados || typeof dados !== 'object' || Array.isArray(dados) || Object.keys(dados).some(k => !campos.includes(k))) falha('invalid-argument', 'Dados do cadastro inválidos.');
  for (const [k, v] of Object.entries(dados)) {
    if (k === 'desconsiderarIntervalo') { if (typeof v !== 'boolean') falha('invalid-argument', 'Confira o intervalo.'); }
    else if (['salarioBase','intervaloPrevistoMin'].includes(k)) { if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > (k === 'salarioBase' ? 1e8 : 1440)) falha('invalid-argument', 'Confira salário e intervalo.'); }
    else if (typeof v !== 'string' || v.length > (k === 'observacoes' ? 3000 : 2000)) falha('invalid-argument', 'Confira os campos do cadastro.');
  }
  return dados;
}
async function operarEscritorio(raiz, request) {
  const uid = request.auth?.uid, d = request.data || {};
  if (!['cadastro','filial','documento','excluirDocumento'].includes(d.operacao) || typeof d.id !== 'string' || !/^[\w-]{1,128}$/.test(d.id)
    || Object.keys(d).some(k => !['operacao','id','dados'].includes(k))) falha('invalid-argument', 'Operação do Escritório inválida.');
  const db = await bancoDoUsuario(raiz, uid);
  return db.runTransaction(async tx => {
    await exigirRecurso(tx, db, uid, 'escritorioContabil');
    const perfil = (await tx.get(db.doc(`users/${uid}`))).data();
    if (perfil?.role !== 'admin' || perfil.ativo === false) falha('permission-denied', 'Acesso restrito ao administrador.');
    const colecao = d.operacao === 'cadastro' ? 'funcionarios' : d.operacao === 'filial' ? 'filiais' : 'documentosTrabalhistas';
    const ref = db.doc(`${colecao}/${d.id}`), anterior = await tx.get(ref), agora = FieldValue.serverTimestamp();
    const operacaoRef = ['filial','documento'].includes(d.operacao) ? db.doc(`escritorioOperacoes/${d.operacao}_${d.id}`) : null;
    const assinatura = operacaoRef ? createHash('sha256').update(JSON.stringify([uid, Object.entries(d.dados || {}).sort(([a],[b]) => a.localeCompare(b))])).digest('hex') : null;
    if (operacaoRef) {
      const operacao = await tx.get(operacaoRef);
      if (operacao.exists) {
        if (operacao.data().assinatura !== assinatura) falha('already-exists', 'Esta tentativa já foi utilizada com outros dados.');
        return { id: ref.id, jaCriado: true };
      }
    }
    if (d.operacao === 'excluirDocumento') { if (anterior.exists) tx.delete(ref); return { id: ref.id }; }
    if (d.operacao === 'cadastro') {
      const dados = validarCampos(d.dados, camposCadastro);
      if (!anterior.exists) falha('not-found', 'Funcionário não encontrado.');
      tx.update(ref, { ...dados, atualizadoEm: agora, atualizadoPor: uid });
    } else if (d.operacao === 'filial') {
      const dados = validarCampos(d.dados, camposFilial);
      if (!dados.nome?.trim()) falha('invalid-argument', 'Informe o nome da filial.');
      if (anterior.exists) {
        if (anterior.data().criadoPor !== uid || Object.entries(dados).some(([k,v]) => anterior.data()[k] !== v)) falha('already-exists', 'Esta identificação já foi utilizada.');
        return { id: ref.id, jaCriado: true };
      }
      tx.create(ref, { ...dados, criadoPor: uid, criadoEm: agora });
    } else {
      const dados = validarCampos(d.dados, ['titulo','tipo','url','mesReferencia','funcionarioId']);
      if (!dados.titulo?.trim() || dados.titulo.length > 300 || !/^\d{4}-(0[1-9]|1[0-2])$/.test(dados.mesReferencia || '') || !/^[\w-]{1,128}$/.test(dados.funcionarioId || '')) falha('invalid-argument', 'Confira o funcionário, título e competência.');
      let url; try { url = new URL(dados.url); } catch { falha('invalid-argument', 'Link do documento inválido.'); }
      if (!['https:','http:'].includes(url.protocol) || url.username || url.password) falha('invalid-argument', 'Use um link válido para o documento.');
      const pessoa = await tx.get(db.doc(`funcionarios/${dados.funcionarioId}`));
      if (!pessoa.exists) falha('not-found', 'Funcionário não encontrado.');
      if (anterior.exists) {
        if (anterior.data().criadoPor !== uid || Object.entries(dados).some(([k,v]) => anterior.data()[k] !== v)) falha('already-exists', 'Esta identificação já foi utilizada.');
        return { id: ref.id, jaCriado: true };
      }
      tx.create(ref, { ...dados, funcionarioNome: pessoa.data().nome || '', criadoPor: uid, criadoEm: agora });
    }
    if (operacaoRef) tx.create(operacaoRef, { assinatura, uid, criadoEm: agora });
    return { id: ref.id };
  });
}
module.exports = { operarEscritorio };
