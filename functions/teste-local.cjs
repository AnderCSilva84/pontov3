const PROJETOS = new Set(['demo-ap1303', 'ap1303-android-push-teste']);
function exigirEmuladoresLocais(env = process.env) {
  if (!PROJETOS.has(env.GCLOUD_PROJECT) || env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9098' || env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8877') {
    throw new Error('Teste bloqueado: exija projeto de teste, Auth 127.0.0.1:9098 e Firestore 127.0.0.1:8877.');
  }
  if (env.GOOGLE_CLOUD_PROJECT && env.GOOGLE_CLOUD_PROJECT !== env.GCLOUD_PROJECT) throw new Error('Projetos de teste divergentes.');
  return env.GCLOUD_PROJECT;
}
function validarOperacaoQrLocal(dados = {}) {
  const permitidas = new Set(['inicializar', 'consultarCategoriasCompras', 'catalogoPorTipo', 'cupomPreparar', 'cupomConfirmar', 'supermercado', 'criar', 'produto', 'adicionar', 'iniciar', 'item', 'finalizar']);
  if (!permitidas.has(dados.operacao)) throw new Error('Operação indisponível neste teste local de QR.');
  if (dados.operacao === 'cupomPreparar' && dados.automatico === true) throw new Error('Consulta externa bloqueada neste teste. Use o texto da nota para importar localmente.');
}
module.exports = { exigirEmuladoresLocais, validarOperacaoQrLocal };
