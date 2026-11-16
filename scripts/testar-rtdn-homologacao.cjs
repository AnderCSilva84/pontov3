// Publica somente testNotification sem token/compra e confere recebimento privado.
const {createHash}=require('node:crypto');
const {GoogleAuth}=require('../functions/node_modules/google-auth-library');
const admin=require('../functions/node_modules/firebase-admin');
const projeto=process.argv[2];
if(projeto!=='ponto-app-1c55a'||process.argv.length!==3)throw Error('Informe explicitamente ponto-app-1c55a.');
async function executar(){
  admin.initializeApp({projectId:projeto});
  try{
    const db=admin.firestore(),c=(await db.doc('assinaturasConfiguracao/google_play').get()).data()||{};
    if(['homologacaoAtiva','entregaTesteAtiva','direitosHomologados','reconhecimentoTesteAtivo'].some(k=>c[k]===true))throw Error('Exige gates desligados.');
    const cliente=await new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform']}).getClient();
    const mensagem={version:'1.0',packageName:'br.dev.acstech.ap1303',eventTimeMillis:String(Date.now()),testNotification:{version:'1.0'}};
    const r=await cliente.request({url:`https://pubsub.googleapis.com/v1/projects/${projeto}/topics/assinaturas-play-rtdn:publish`,method:'POST',
      data:{messages:[{data:Buffer.from(JSON.stringify(mensagem)).toString('base64')}]},timeout:20000});
    const mensagemId=r.data.messageIds?.[0];
    if(typeof mensagemId!=='string'||!/^\d+$/.test(mensagemId))throw Error('Mensagem não confirmada.');
    const registroId='rtdn_'+createHash('sha256').update(mensagemId).digest('hex');
    let estado=null;
    for(let n=0;n<30;n++){
      estado=(await db.doc('assinaturasEventos/'+registroId).get()).data()?.estado||null;
      if(estado==='teste_recebido')break;
      await new Promise(r=>setTimeout(r,1000));
    }
    console.log(JSON.stringify({projeto,mensagemId,registroId,estado,recebido:estado==='teste_recebido'},null,2));
    if(estado!=='teste_recebido')process.exitCode=1;
  }finally{await admin.app().delete();}
}
executar().catch(()=>{console.error('Teste não confirmado. Verifique o consumidor; nenhuma compra/token foi enviado.');process.exitCode=1;});
