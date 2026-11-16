// Somente leitura e chamadas sem autenticação: não inicia compra nem altera gates.
const projeto = process.argv[2];
if (projeto !== 'ponto-app-1c55a' || process.argv.length !== 3) throw Error('Informe explicitamente ponto-app-1c55a.');
const { GoogleAuth } = require('../functions/node_modules/google-auth-library');
const admin = require('../functions/node_modules/firebase-admin');
const alvos = [
  ['consultarAssinatura','us-central1',{}],
  ['verificarCompraPlayTeste','us-central1',{token:'homologacao-sem-compra'}],
  ['processarCompraPlayTeste','us-central1',{token:'homologacao-sem-compra'}],
  ['receberRtdnPlay','us-central1'],['retomarRtdnPlay','us-central1'],['reconhecerEntregaPlay','southamerica-east1'],
];
async function verificar() {
  const cliente = await new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform']}).getClient();
  const funcoes = [];
  for (const [nome,regiao,dados] of alvos) {
    let r;
    try { r = await cliente.request({url:`https://cloudfunctions.googleapis.com/v2/projects/${projeto}/locations/${regiao}/functions/${nome}`,timeout:20000}); }
    catch (e) {
      funcoes.push({nome,regiao,estado:'NAO_VERIFICADA',http:Number(e.response?.status)||null});
      continue;
    }
    const f = r.data, servico = f.serviceConfig || {};
    const resultado = {nome,regiao,estado:f.state,identidade:servico.serviceAccountEmail,maxInstancias:servico.maxInstanceCount,
      retry:f.eventTrigger?.retryPolicy || null};
    if (dados) {
      const u = new URL(servico.uri);
      if (u.protocol !== 'https:' || !u.hostname.endsWith('.run.app')) throw Error('Endpoint inesperado.');
      const resposta = await fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:dados}),signal:AbortSignal.timeout(60000)});
      let corpo;try{corpo=await resposta.json();}catch{corpo={};}
      resultado.httpSemAuth = resposta.status;
      resultado.erroSemAuth = corpo.error?.status || 'resposta_inesperada';
      resultado.recusouSemAuth = resposta.status === 401 && corpo.error?.status === 'UNAUTHENTICATED';
    }
    funcoes.push(resultado);
  }
  const jobs = (await cliente.request({url:`https://cloudscheduler.googleapis.com/v1/projects/${projeto}/locations/us-central1/jobs`,timeout:20000})).data.jobs || [];
  const job = jobs.find(j=>j.name.endsWith('/firebase-schedule-retomarRtdnPlay-us-central1'));
  admin.initializeApp({projectId:projeto});
  try {
    const db=admin.firestore();
    const [config,grupo]=await Promise.all([db.doc('assinaturasConfiguracao/google_play').get(),db.doc('grupos/demo_play_ap1303_v1').get()]);
    const c=config.data()||{};
    const gatesDesligados=['homologacaoAtiva','entregaTesteAtiva','direitosHomologados','reconhecimentoTesteAtivo'].every(k=>c[k]!==true);
    const grupoEmTransicao=grupo.exists&&grupo.data().assinaturasAtivas!==true;
    const agendamento={existe:!!job,estado:job?.state||null,frequencia:job?.schedule||null};
    const aprovado=funcoes.every(f=>f.estado==='ACTIVE'&&f.recusouSemAuth!==false)
      && job?.state==='ENABLED'&&gatesDesligados&&grupoEmTransicao;
    console.log(JSON.stringify({projeto,funcoes,agendamento,gatesDesligados,grupoEmTransicao,aprovado},null,2));
    if(!aprovado)process.exitCode=1;
  } finally {await admin.app().delete();}
}
verificar().catch(()=>{console.error('Verificação incompleta. Consulte o estado dos recursos; nenhum dado de compra foi enviado.');process.exitCode=1;});
