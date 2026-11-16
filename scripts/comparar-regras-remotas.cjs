// Somente leitura: baixa a release ativa para comparação, sem publicar regras.
const fs=require('node:fs'),crypto=require('node:crypto');
const {GoogleAuth}=require('../functions/node_modules/google-auth-library');
const projeto=process.argv[2];
if(projeto!=='ponto-app-1c55a'||process.argv.length!==3)throw Error('Informe explicitamente ponto-app-1c55a.');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
async function executar(){
 const cliente=await new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform']}).getClient();
 const base='https://firebaserules.googleapis.com/v1/';
 const release=(await cliente.request({url:base+`projects/${projeto}/releases/cloud.firestore`,timeout:20000})).data;
 if(!release.rulesetName?.startsWith(`projects/${projeto}/rulesets/`))throw Error('Ruleset inesperado.');
 const ruleset=(await cliente.request({url:base+release.rulesetName,timeout:20000})).data;
 const arquivo=ruleset.source?.files?.find(f=>f.name==='firestore.rules');
 if(!arquivo||typeof arquivo.content!=='string')throw Error('Fonte firestore.rules ausente.');
 fs.mkdirSync('output',{recursive:true});
 fs.writeFileSync('output/rollout9-firestore-remoto.rules',arquivo.content);
 const local=fs.readFileSync('firestore.rules','utf8'),normalizar=s=>s.replace(/\r\n/g,'\n');
 const resultado={projeto,consultadoEm:new Date().toISOString(),release:release.name,ruleset:release.rulesetName,atualizadoEm:release.updateTime,
  sha256Remoto:hash(arquivo.content),sha256Local:hash(local),iguaisNormalizandoQuebras:normalizar(local)===normalizar(arquivo.content)};
 fs.writeFileSync('output/rollout9-regras-comparacao.json',JSON.stringify(resultado,null,2)+'\n');
 console.log(JSON.stringify(resultado,null,2));
}
executar().catch(e=>{console.error('Comparação incompleta',{http:e.response?.status||null,mensagem:e.response?'Falha de consulta remota.':e.message});process.exitCode=1;});
