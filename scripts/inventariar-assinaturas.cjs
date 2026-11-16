const args = process.argv.slice(2);
const permitidos = new Set(['--project','--grupo']);
if (args.length !== 4 || args.some((v,i)=>i%2===0&&!permitidos.has(v)) || new Set([args[0],args[2]]).size!==2) throw Error('Uso: node scripts/inventariar-assinaturas.cjs --project PROJETO --grupo GRUPO. Somente leitura.');
const projeto=args[args.indexOf('--project')+1], grupo=args[args.indexOf('--grupo')+1];
if (!/^[a-z][a-z0-9-]{4,62}$/.test(projeto)) throw Error('Projeto inválido.');
if (!projeto.startsWith('demo-') && process.env.FIRESTORE_EMULATOR_HOST) throw Error('Não combine projeto real com emulador.');
const admin = require('../functions/node_modules/firebase-admin');
const { inventariarAssinaturas } = require('../functions/assinaturas-migracao.cjs');
admin.initializeApp({projectId:projeto});
inventariarAssinaturas(admin.firestore(),grupo).then(r=>console.log(JSON.stringify(r,null,2)))
  .catch(()=>{console.error('Inventário não concluído. Confira projeto, grupo, credenciais e conexão. Nenhuma escrita foi solicitada.');process.exitCode=1;})
  .finally(()=>admin.app().delete());
