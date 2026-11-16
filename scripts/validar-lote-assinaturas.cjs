// Preflight local: não acessa a rede, não faz deploy e não ativa assinaturas.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const raiz=path.resolve(__dirname,'..');
process.chdir(raiz);
const manifesto=require('../docs/mobile/23-lote-rollout-revisao.json');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n')).digest('hex');
try{
 if(process.argv.length!==2)throw Error('Uso: node scripts/validar-lote-assinaturas.cjs');
 if(manifesto.projeto!=='ponto-app-1c55a')throw Error('Projeto inesperado.');
 const nomes=manifesto.entradasCandidatas.map(f=>f.nome);
 if(nomes.length!==42||new Set(nomes).size!==42||nomes.some(n=>!/^\w+$/.test(n)))throw Error('Seleção de Functions divergente.');
 for(const f of [...manifesto.fontesLocais,manifesto.securityRules]){
  if(!/^(functions\/[^/]+\.(?:cjs|js|mjs|json)|firestore\.rules)$/.test(f.arquivo))throw Error('Caminho inesperado.');
  if(hash(f.arquivo)!==f.sha256Normalizado)throw Error('Fonte mudou: '+f.arquivo);
 }
 const arquivos=fs.readdirSync('functions').filter(n=>/\.(cjs|js|mjs|json)$/.test(n)).sort();
 if(JSON.stringify(arquivos)!==JSON.stringify(manifesto.fontesLocais.map(f=>f.arquivo.slice(10))))throw Error('Inventário de fontes mudou.');
 for(const f of manifesto.entradasCandidatas)if(!['us-central1','southamerica-east1'].includes(f.regiao))throw Error('Região inesperada.');
 const arquivosGit=[...manifesto.fontesLocais.map(f=>f.arquivo),'firestore.rules','docs/mobile/23-lote-rollout-revisao.json','scripts/validar-lote-assinaturas.cjs'];
 execFileSync('git',['ls-files','--error-unmatch','--',...arquivosGit],{stdio:'pipe'});
 const diff=execFileSync('git',['diff','HEAD','--name-only','--',...arquivosGit],{encoding:'utf8'}).trim();
 if(diff)throw Error('Backend/regras têm alterações não incluídas no commit.');
 console.log(JSON.stringify({projeto:manifesto.projeto,commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),functions:nomes.length,fontes:manifesto.fontesLocais.length,hashes:'OK (LF normalizado)',versionamento:'OK',publicou:false},null,2));
}catch(e){console.error('Preflight recusado: '+(e.status!==undefined?'arquivos ainda não versionados ou Git indisponível.':e.message));process.exitCode=1;}
