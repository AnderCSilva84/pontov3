// Por padrão apenas inventaria. Execução exige --aplicar e assinatura revisada.
const admin = require('../functions/node_modules/firebase-admin');
const { planejarMigracao, migrarLegado } = require('../functions/grupos-migracao.cjs');
const args = process.argv.slice(2);
function opcao(nome) { const i = args.indexOf(nome); return i < 0 ? undefined : args[i + 1]; }
const projeto = opcao('--project');
if (!projeto) throw Error('Informe --project explicitamente. Não será usado um projeto padrão.');
if (!projeto.startsWith('demo-') && (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST)) throw Error('Não combine projeto real com variáveis de emulador.');
admin.initializeApp({ projectId: projeto });
(async () => {
  const dados = { titularUid: opcao('--titular'), grupoId: opcao('--grupo'), nomeGrupo: opcao('--nome') };
  const plano = await planejarMigracao(admin.firestore(), dados);
  console.log(JSON.stringify({ modo: 'inventario', ...plano }, null, 2));
  if (args.includes('--aplicar')) {
    if (opcao('--assinatura') !== plano.assinatura) throw Error('Falta --assinatura com o valor exato do inventário revisado.');
    console.log('Iniciando manutenção. Aguardando seis minutos para encerrar solicitações anteriores.');
    await migrarLegado(admin.firestore(), dados, { confirmarAssinatura: plano.assinatura });
    console.log('Grupo migrado. Documentos e logins originais foram preservados.');
  }
})().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => admin.app().delete());
