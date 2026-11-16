// Verificação pós-deploy: metadados locais capturados pela CLI + chamadas SEM autenticação.
// Não envia recibo, não chama operações autenticadas nem altera gates.
const fs=require('node:fs'),assert=require('node:assert/strict');
const projeto=process.argv[2];
if(projeto!=='ponto-app-1c55a'||process.argv.length!==3)throw Error('Informe explicitamente ponto-app-1c55a.');
const ler=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const manifesto=ler('docs/mobile/23-lote-rollout-revisao.json');
const antes=ler('output/rollout26-functions-antes.json'),depois=ler('output/rollout26-functions-depois.json');
const evento=e=>e?{...e,eventFilters:[...(e.eventFilters||[])].sort((a,b)=>a.attribute.localeCompare(b.attribute))}:null;
// Algumas entradas validam o formato antes da autenticação. Usar formato válido
// permite testar a barreira de autenticação; sem token, nenhuma operação é autorizada.
const uuid='00000000-0000-4000-8000-000000000026';
const payloads={
 verificarCompraPlayTeste:{token:'homologacao-sem-compra'},
 processarCompraPlayTeste:{token:'homologacao-sem-compra'},
 revisarPendenciaPonto:{acao:'listar',grupoId:null},
 ajustarJornadaPonto:{acao:'detalheDia',grupoId:null},
 cadastrarFuncionario:{operacao:'garantir',id:'smoke_sem_auth'},
 pontoTitular:{acao:'consultar'},
 gerirAcesso:{operacao:'suspender',uid:'smoke_sem_auth',operacaoId:uuid},
 escritorioOperacao:{operacao:'excluirDocumento',id:'smoke_sem_auth'},
 cadastrarTarefa:{operacao:'reabrir',tipo:'avulsa',id:'smoke_sem_auth',operacaoId:uuid},
};
async function verificar(){
 const selecionadas=new Set(manifesto.entradasCandidatas.map(f=>f.nome)),resultados=[];
 assert.equal(depois.length,antes.length,'Número de Functions mudou.');
 for(const candidata of manifesto.entradasCandidatas){
  const nome=candidata.nome,f=depois.find(f=>f.name===`projects/${projeto}/locations/${candidata.regiao}/functions/${nome}`),a=antes.find(anterior=>anterior.name===f?.name);
  assert.ok(f&&a,nome+': recurso ausente');assert.equal(f.state,'ACTIVE',nome);
  assert.equal(f.serviceConfig.serviceAccountEmail,candidata.identidade,nome+': identidade mudou');
  assert.deepEqual(evento(f.eventTrigger),evento(a.eventTrigger),nome+': gatilho mudou');
  assert.notEqual(f.updateTime,a.updateTime,nome+': implantação não atualizou');
  assert.equal(f.buildConfig.runtime,'nodejs24',nome);
  const r={nome,regiao:candidata.regiao,estado:f.state,atualizadoEm:f.updateTime,revisao:f.serviceConfig.revision};
  if(candidata.tipo==='callable'){
   const u=new URL(f.serviceConfig.uri);assert.ok(u.protocol==='https:'&&u.hostname.endsWith('.run.app'));
   const data=payloads[nome]||{};
   const resposta=await fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data}),signal:AbortSignal.timeout(60000)});
   const corpo=await resposta.json();r.httpSemAuth=resposta.status;r.erroSemAuth=corpo.error?.status||null;
   assert.equal(resposta.status,401,nome+': HTTP inesperado');assert.equal(corpo.error?.status,'UNAUTHENTICATED',nome);
  }
  resultados.push(r);
 }
 const fora=depois.filter(f=>!selecionadas.has(f.name.split('/').at(-1)));
 for(const f of fora)assert.equal(f.updateTime,antes.find(a=>a.name===f.name)?.updateTime,'Function fora do lote foi alterada: '+f.name);
 const relatorio={projeto,verificadoEm:new Date().toISOString(),functionsAtualizadas:resultados.length,callablesSemAuthRecusadas:resultados.filter(f=>f.httpSemAuth===401).length,foraDoLotePreservadas:fora.length,resultados,aprovado:true};
 fs.writeFileSync('output/rollout26-verificacao.json',JSON.stringify(relatorio,null,2)+'\n');
 console.log(JSON.stringify({functionsAtualizadas:resultados.length,callablesSemAuthRecusadas:relatorio.callablesSemAuthRecusadas,foraDoLotePreservadas:fora.length,aprovado:true}));
}
verificar().catch(e=>{console.error('Verificação interrompida: '+e.message);process.exitCode=1;});
