const test=require('node:test'),assert=require('node:assert/strict');
const {operarAnexos,validarUrl,validarArquivo,LIMITES}=require('../functions/lembretes-anexos.cjs');
const pdf=Buffer.from('%PDF-1.7\nDocumento sintético /ByteRange assinatura fictícia\n%%EOF\n');
test('anexos: formatos, nomes e links seguros',()=>{
 assert.equal(validarArquivo(pdf.toString('base64'),'assinado.pdf').bytes.equals(pdf),true);
 for(const u of ['javascript:alert(1)','http://example.test','https://u:senha@example.test','https://example.test/a b'])assert.throws(()=>validarUrl(u));
 assert.equal(validarUrl('https://example.test/concurso?a=1'),'https://example.test/concurso?a=1');
 for(const [b,n]of [[pdf,'a.jpg'],[pdf,'../a.pdf'],[Buffer.alloc(20),'a.pdf'],[Buffer.alloc(LIMITES.arquivoBytes+1),'a.pdf']])assert.throws(()=>validarArquivo(b.toString('base64'),n));
 assert.throws(()=>validarArquivo('!notbase64','a.pdf'));
});
test('anexos privados: transações e acesso real no Firestore, storage em memória',{skip:!process.env.FIRESTORE_EMULATOR_HOST},async t=>{
 assert.match(process.env.GCLOUD_PROJECT,/^demo-/);
 const admin=require('../functions/node_modules/firebase-admin'),app=admin.initializeApp({projectId:process.env.GCLOUD_PROJECT+'-anexos'},'anexos');t.after(()=>app.delete());
 const {bancoDoGrupo}=require('../functions/grupos-contexto.cjs'),root=app.firestore(),db=bancoDoGrupo(root,'a');
 for(const uid of ['autor','destino','terceiro','inativo'])await db.doc('users/'+uid).set({nome:uid,role:uid==='destino'?'funcionario':'admin',ativo:uid!=='inativo'});
 const novo=async lid=>db.doc('lembretes/'+lid).set({dominio:'geral',criadaPor:'autor',usuarioId:'destino',titulo:'Teste fictício'});
 const objects=new Map();let failSave=false,delaySave=null;
 const bucket={file:path=>({save:async(bytes,opts)=>{if(delaySave&&bytes.length)await delaySave();if(failSave)throw Error('falha simulada');if(opts.preconditionOpts?.ifGenerationMatch===0&&objects.has(path))throw Object.assign(Error('exists'),{code:412});objects.set(path,{bytes:Buffer.from(bytes),metadata:opts.metadata});},download:async()=>[Buffer.from(objects.get(path).bytes)],getMetadata:async()=>[objects.get(path).metadata]})};
 const op=(acao,d={},uid='autor',options={})=>operarAnexos(db,{auth:{uid},data:{acao,lembreteId:'um',...d}},{bucket,...options});
 const file=(anexoId='original',extra={})=>({anexoId,nome:'assinado.pdf',base64:pdf.toString('base64'),...extra});
 await novo('um');
 await t.test('autenticação, participante, conta ativa e grupo; administrador não participante não acessa',async()=>{
  for(const uid of [null,'terceiro','inativo'])await assert.rejects(op('listar',{},uid),e=>['unauthenticated','permission-denied'].includes(e.code));
  await assert.rejects(operarAnexos(bancoDoGrupo(root,'b'),{auth:{uid:'autor'},data:{acao:'listar',lembreteId:'um'}},{bucket}),e=>e.code==='permission-denied');
 });
 await t.test('envio e retry preservam bytes; metadados não expõem caminho privado; só outro participante notificado',async()=>{
  await op('enviarArquivo',file());await op('enviarArquivo',file());
  const a=await op('listar',{},'destino');assert.equal(a.anexos.length,1);assert.equal(a.arquivosTotal,1);assert.equal(a.bytesTotal,pdf.length);assert.equal(a.anexos[0].podeRemover,false);assert.equal(a.anexos[0].caminho,undefined);
  const b=await op('baixar',{anexoId:'original'},'destino');assert.deepEqual(Buffer.from(b.base64,'base64'),pdf);
  const q=(await db.doc('avisosEnvios/anexo_um_original').get()).data();assert.equal(q.uid,'destino');assert.equal(q.tipo,'anexo');assert.equal(objects.size,1);
  await assert.rejects(op('enviarArquivo',file('original',{nome:'outro.pdf'})),e=>e.code==='already-exists');
 });
 await t.test('destinatário devolve PDF sem sobrescrever o original, link de inscrição e fila ao autor',async()=>{
  await op('enviarArquivo',file('resposta',{respostaDe:'original'}),'destino');await op('adicionarLink',{anexoId:'link',nome:'Inscrição',url:'https://example.test/concurso'});
  const a=await op('listar');assert.equal(a.anexos.length,3);assert.equal(a.anexos.find(a=>a.id==='resposta').respostaNome,'assinado.pdf');assert.equal((await db.doc('avisosEnvios/anexo_um_resposta').get()).data().uid,'autor');
  await assert.rejects(op('remover',{anexoId:'original'},'destino'),e=>e.code==='permission-denied');
  await assert.rejects(op('enviarArquivo',file('orfao',{respostaDe:'inexistente'})),e=>e.code==='failed-precondition');
 });
 await t.test('arquivo arquivado é consultável, lixeira pessoal bloqueia acesso, outro participante conserva acesso',async()=>{
  await db.doc('lembretes/um').update({organizacao:{autor:'arquivado'}});await op('listar');await assert.rejects(op('adicionarLink',{anexoId:'x',nome:'X',url:'https://example.test'}),e=>e.code==='failed-precondition');
  await db.doc('lembretes/um').update({organizacao:{autor:'excluido'}});await assert.rejects(op('baixar',{anexoId:'original'}),e=>e.code==='permission-denied');await op('baixar',{anexoId:'original'},'destino');await db.doc('lembretes/um').update({organizacao:{}});
 });
 await t.test('mudança de grupo durante download impede resposta; conteúdo corrompido é rejeitado',async()=>{
  await assert.rejects(op('baixar',{anexoId:'original'},'destino',{validarContexto:async()=>{throw Error('grupo alterado');}}),/grupo alterado/);
  const o=objects.get('grupos/a/lembretes/um/anexos/original'),b=o.bytes;o.bytes=Buffer.from('corrompido');await assert.rejects(op('baixar',{anexoId:'original'}),e=>e.code==='data-loss');o.bytes=b;
 });
 await t.test('limites são atômicos para uploads concorrentes e links',async()=>{
  await novo('quota');await db.doc('lembretes/quota').update({arquivosTotal:9});
  const r=await Promise.allSettled(['a','b'].map(a=>op('enviarArquivo',{...file(a),lembreteId:'quota'})));assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(r.find(x=>x.status==='rejected').reason.code,'resource-exhausted');
  await db.doc('lembretes/quota').update({anexosBytes:LIMITES.lembreteBytes,arquivosTotal:1});await assert.rejects(op('enviarArquivo',{...file('c'),lembreteId:'quota'}),e=>e.code==='resource-exhausted');
  await db.doc('lembretes/quota').update({linksTotal:10});await assert.rejects(op('adicionarLink',{lembreteId:'quota',anexoId:'z',nome:'Link',url:'https://example.test'}),e=>e.code==='resource-exhausted');
 });
 await t.test('falha no upload pode ser retomada com mesmo id sem duplicar quota; exclusão falha pode ser repetida',async()=>{
  failSave=true;await assert.rejects(op('enviarArquivo',file('retry')),e=>e.code==='unavailable');failSave=false;await op('enviarArquivo',file('retry'));
  const antes=(await op('listar')).arquivosTotal;failSave=true;await assert.rejects(op('remover',{anexoId:'retry'}),e=>e.code==='unavailable');failSave=false;
  assert.equal((await op('listar',{},'destino')).anexos.some(a=>a.id==='retry'),false);await op('remover',{anexoId:'retry'});await op('remover',{anexoId:'retry'});assert.equal((await op('listar')).arquivosTotal,antes-1);assert.equal(objects.get('grupos/a/lembretes/um/anexos/retry').bytes.length,0);
 });
 await t.test('remoção com upload atrasado usa marcador vazio e impede recriação de conteúdo',async()=>{
  let entered,release;const started=new Promise(r=>entered=r);delaySave=async()=>{entered();await new Promise(r=>release=r);};
  const uploading=op('enviarArquivo',file('race'));await started;
  await assert.rejects(op('remover',{anexoId:'race'}),e=>e.code==='failed-precondition');
  await db.doc('lembretes/um/anexos/race').update({leaseAteMs:0});await op('remover',{anexoId:'race'});delaySave=null;release();await assert.rejects(uploading);assert.equal(objects.get('grupos/a/lembretes/um/anexos/race').bytes.length,0);assert.equal((await db.doc('lembretes/um/anexos/race').get()).data().status,'removido');
 });
 await t.test('remoção original mantém resposta separada; notificações usam somente rota geral',async()=>{
  await op('remover',{anexoId:'original'});await assert.rejects(op('baixar',{anexoId:'original'}),e=>e.code==='not-found');const resposta=await op('baixar',{anexoId:'resposta'});assert.deepEqual(Buffer.from(resposta.base64,'base64'),pdf);
  const {processarEnviosGerais}=require('../functions/lembretes-gerais.cjs'),envios=[];await processarEnviosGerais(db,async(...args)=>{envios.push(args);return 1;},Date.now());assert.ok(envios.length);assert.ok(envios.every(a=>a[0]==='Novo anexo no lembrete'&&a[2]==='/avisos'&&['autor','destino'].includes(a[4])));
 });
 await t.test('imagens JPEG e PNG mantêm formato e bytes para abertura e impressão no destinatário',async()=>{
  const jpg=require('node:fs').readFileSync('tests/fixtures/avatar-demo.jpg'),png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aG1UAAAAASUVORK5CYII=','base64');
  for(const [bytes,ext,mime]of [[jpg,'jpg','image/jpeg'],[png,'png','image/png']]){
   await op('enviarArquivo',{anexoId:'imagem-'+ext,nome:'imprimir.'+ext,base64:bytes.toString('base64')},'destino');
   const r=await op('baixar',{anexoId:'imagem-'+ext});assert.equal(r.mime,mime);assert.deepEqual(Buffer.from(r.base64,'base64'),bytes);
  }
 });
});
