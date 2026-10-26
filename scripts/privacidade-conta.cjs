// Operação local por suporte com credencial administrativa (ADC). Não há endpoint.
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const api=require('../functions/privacidade-administrativa.cjs');
function privado(arquivo,{novo=false}={}){
 if(!path.isAbsolute(arquivo||''))throw Error('Use um arquivo privado com caminho absoluto.');
 const raiz=fs.realpathSync(path.resolve(__dirname,'..')),pasta=fs.realpathSync(path.dirname(arquivo));
 const relativo=path.relative(raiz,pasta);
 if(!relativo||!relativo.startsWith('..')&&!path.isAbsolute(relativo))throw Error('Arquivo privado não pode ficar no repositório.');
 if(fs.existsSync(arquivo)&&fs.lstatSync(arquivo).isSymbolicLink())throw Error('Link de arquivo não permitido.');
 const verificar=novo?pasta:fs.realpathSync(arquivo);
 if(process.platform==='win32'){
  const comando="$a=Get-Acl -LiteralPath $env:AP1303_PRIVACIDADE_ARQUIVO; $u=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value; $ok=$true; foreach($r in $a.Access){if($r.AccessControlType -eq 'Allow' -and $r.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -notin @($u,'S-1-5-18')){$ok=$false}};[Console]::Write($ok)";
  const ok=execFileSync('powershell.exe',['-NoProfile','-Command',comando],{encoding:'utf8',windowsHide:true,env:{...process.env,AP1303_PRIVACIDADE_ARQUIVO:verificar}}).trim();
  if(ok!=='True')throw Error('Pasta/arquivo exige ACL restrita ao operador e SYSTEM. Não foi alterada automaticamente.');
 }else if(fs.statSync(verificar).mode&0o077)throw Error('Pasta/arquivo privado deve permitir acesso somente ao operador.');
 return path.join(pasta,path.basename(arquivo));
}
async function main(){
 const [acao,entrada,saida]=process.argv.slice(2);
 if(!['registrar','inventariar','previa','executar','conferir','reinventariar','status'].includes(acao))throw Error('Ação inválida.');
 const projeto=process.env.GCLOUD_PROJECT,emulado=process.env.FIRESTORE_EMULATOR_HOST;
 if(emulado){
  if(!/^demo-[\w-]+$/.test(projeto||'')||![emulado,process.env.FIREBASE_AUTH_EMULATOR_HOST].every(v=>/^(127\.0\.0\.1|localhost):\d+$/.test(v||'')))throw Error('Teste exige projeto demo e Auth/Firestore em loopback.');
 }else if(projeto!=='ponto-app-1c55a'||process.env.AP1303_PRIVACIDADE_PRODUCAO!==projeto)throw Error('Operação remota bloqueada; exige autorização específica futura e projeto explícito.');
 const input=privado(entrada),d=JSON.parse(fs.readFileSync(input,'utf8'));
 const admin=require('../functions/node_modules/firebase-admin'),app=admin.initializeApp({projectId:projeto}),db=app.firestore();
 try{
  if(!emulado&&process.env.AP1303_PRIVACIDADE_CASO!==(d.caso||d.uid))throw Error('Autorização remota deve nomear somente o caso/UID aprovado.');
  let r;
  if(acao==='registrar')r=await api.registrarCaso(db,app.auth(),d);
  if(acao==='inventariar')r=await api.inventariar(db,d.caso);
  if(acao==='previa'){
   r=await api.previa(db,d.caso);
   if(!saida)throw Error('A prévia exige arquivo privado de saída.');
   const arquivo=privado(saida,{novo:true});
   fs.writeFileSync(arquivo,JSON.stringify({...r,operador:'',confirmar:false,decisoes:Object.fromEntries(r.itens.map(e=>[e.id,{acao:'PENDENTE',justificativa:'',campos:e.exatos,revisarEm:'',criterioRevisao:''}]))},null,2),{flag:'wx',mode:0o600});
   r={caso:r.caso,candidatos:r.itens.length,previaGravada:true};
  }
  if(acao==='executar')r=await api.executar(db,app.auth(),d);
  if(acao==='conferir')r=await api.conferir(db,d.caso,d.operador);
  if(acao==='reinventariar')r=await api.reinventariar(db,d.caso,d.operador,d.motivo);
  if(acao==='status'){
   const s=await db.doc('privacidadeCasos/'+d.caso).get();r={caso:d.caso,encontrado:s.exists,status:s.data()?.status};
  }
  console.log(JSON.stringify(r)); // Somente protocolo, estado e contagens. Nunca payloads.
 }finally{await app.delete();}
}
if(require.main===module)main().catch(()=>{console.error('Operação não concluída. Confira contexto, arquivo privado, prévia e decisões; nenhum payload foi registrado.');process.exitCode=1;});
module.exports={privado};
