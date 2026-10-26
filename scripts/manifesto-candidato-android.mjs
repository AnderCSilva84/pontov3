import {readFileSync,writeFileSync,existsSync,statSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import process from 'node:process';

// Inventário local, sem rede, credenciais ou operações Git de escrita.
const data=process.argv[2];
if(!/^\d{4}-\d{2}-\d{2}$/.test(data||''))throw Error('Informe a data de referência do titular: AAAA-MM-DD.');
const sha=b=>createHash('sha256').update(b).digest('hex');
const git=args=>execFileSync('git',args,{encoding:'utf8'}).trim();
const roots=['src','functions','android','scripts','tests','public','package.json','package-lock.json','vite.config.js','capacitor.config.json','firestore.rules','firestore.indexes.json','firebase.json'];
const arquivos=[...new Set(git(['ls-files','-co','--exclude-standard','--',...roots]).split(/\r?\n/))]
 .filter(p=>p&&!/(^|\/)(node_modules|build|\.gradle)(\/|$)|google-services.*\.json|\.local\.|\.keystore$|\.jks$|local\.properties$/.test(p))
 .filter(p=>existsSync(p)&&statSync(p).isFile()).sort().map(path=>({path,sha256:sha(readFileSync(path))}));
const fonte={head:git(['rev-parse','HEAD']),branch:git(['branch','--show-current']),arvoreLocalComAlteracoes:!!git(['status','--porcelain']),escopo:'Fontes relevantes, locks, recursos e testes; exclui credenciais, configurações locais e outputs gerados.',fingerprint:sha(JSON.stringify(arquivos)),arquivos};
const pasta='docs/mobile/google-play/';
const path='android/app/build/outputs/apk/debug/app-debug.apk',bytes=readFileSync(path),ambiente=JSON.parse(readFileSync('android/app/src/main/assets/public/mobile-build.json','utf8'));
if(ambiente.destino==='producao')throw Error('Este gerador de pacote demo não valida um release de produção.');
writeFileSync(pasta+'inventario-fontes.json',JSON.stringify(fonte,null,2)+'\n');
writeFileSync(pasta+'artefatos.json',JSON.stringify({dataReferenciaUsuario:data,estado:'APK demo para teste interno local; submissão bloqueada',head:fonte.head,branch:fonte.branch,fonteFingerprint:fonte.fingerprint,apk:{path,bytes:bytes.length,sha256:sha(bytes),package:'br.dev.acstech.ap1303.dev',versionCode:1,versionName:'0.1.0-dev',assinatura:'Android Debug, conferida separadamente por apksigner',ambiente},aabGerado:false,chaveDefinitivaGerada:false,publicado:false},null,2)+'\n');
console.log(JSON.stringify({fontes:arquivos.length,fingerprint:fonte.fingerprint,apkSHA256:sha(bytes),bytes:bytes.length}));
