const { HttpsError } = require('firebase-functions/v2/https');
const grupoValido = id => typeof id === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(id);

// As coleções e os documentos mantêm seus nomes dentro do grupo.
function bancoDoGrupo(raiz, grupoId) {
  if (!grupoValido(grupoId)) throw new HttpsError('permission-denied', 'Grupo inválido.');
  const prefixo = `grupos/${grupoId}/`;
  return new Proxy(raiz, { get(db, propriedade) {
    if (propriedade === 'grupoId') return grupoId;
    if (propriedade === 'raiz') return raiz;
    if (propriedade === 'doc' || propriedade === 'collection') return caminho => {
      if (typeof caminho !== 'string' || !caminho || caminho.startsWith('/') || caminho.includes('//')) throw new HttpsError('invalid-argument', 'Caminho de dados inválido.');
      return db[propriedade](prefixo + caminho);
    };
    const valor = db[propriedade];
    return typeof valor === 'function' ? valor.bind(db) : valor;
  } });
}

async function bancoDoUsuario(raiz, uid) {
  if (!uid) throw new HttpsError('unauthenticated', 'Entre no app para continuar.');
  const vinculo = (await raiz.doc(`vinculosUsuarios/${uid}`).get()).data();
  if (!vinculo) {
    if ((await raiz.doc('migracoesGrupos/legado').get()).data()?.bloqueada) throw new HttpsError('unavailable', 'O grupo está em manutenção. Tente novamente em alguns minutos.');
    return raiz; // Contas atuais permanecem no conjunto legado até a migração.
  }
  if (vinculo.ativo === false || !grupoValido(vinculo.grupoId)) throw new HttpsError('permission-denied', 'Acesso ao grupo não autorizado.');
  const banco = bancoDoGrupo(raiz, vinculo.grupoId);
  const [grupo, pessoa] = await Promise.all([raiz.doc(`grupos/${vinculo.grupoId}`).get(), banco.doc(`users/${uid}`).get()]);
  if (grupo.data()?.ativo !== true || !pessoa.exists || pessoa.data().ativo === false) throw new HttpsError('permission-denied', 'Conta ou grupo sem acesso.');
  return banco;
}

module.exports = { bancoDoGrupo, bancoDoUsuario, grupoValido };
