const {HttpsError}=require('firebase-functions/v2/https');
const {tipoCompra,validarTipoCompra}=require('./compras-tipo.cjs');
const falha=(c,m)=>{throw new HttpsError(c,m);};
const id=v=>typeof v==='string'&&/^[\w-]{1,128}$/.test(v);
async function lerRelatorioCompras(db,dados={}){
 if(!dados||typeof dados!=='object'||Array.isArray(dados))falha('invalid-argument','Informe os filtros da comparação.');
 const inicio=Number(dados.inicioMs),fim=Number(dados.fimMs),tipo=validarTipoCompra(dados.tipoCompra);
 if(!Number.isFinite(inicio)||!Number.isFinite(fim)||inicio<0||fim<inicio||fim-inicio>366*86400000)falha('invalid-argument','Escolha um período de até um ano.');
 let docs,listas=[],listasLimitadas=false;
 if(dados.listaIds!==undefined){
  if(!Array.isArray(dados.listaIds)||dados.listaIds.length!==2||dados.listaIds.some(v=>!id(v))||dados.listaIds[0]===dados.listaIds[1])falha('invalid-argument','Escolha duas listas diferentes.');
  const snaps=await db.getAll(...dados.listaIds.map(v=>db.doc('comprasListas/'+v)));
  if(snaps.some(s=>!s.exists||s.data().status!=='finalizada'||tipoCompra(s.data())!==tipo))falha('failed-precondition','Escolha duas compras finalizadas da mesma classificação, disponíveis no seu grupo.');
  listas=snaps.map(s=>({id:s.id,titulo:s.data().titulo||'Compra sem título',finalizadaEmMs:s.data().finalizadaEm?.toMillis?.()||null}));
  const precos=await Promise.all(dados.listaIds.map(v=>db.collection('comprasPrecos').where('listaId','==',v).limit(201).get()));
  if(precos.some(s=>s.size>200))falha('resource-exhausted','Uma lista excede o limite de 200 registros de preço. Solicite revisão.');
  docs=precos.flatMap(s=>s.docs);
 }else{
  const snap=await db.collection('comprasPrecos').where('compradoEm','>=',new Date(inicio)).where('compradoEm','<=',new Date(fim)).orderBy('compradoEm').limit(5001).get();
  if(snap.size>5000)falha('resource-exhausted','Há muitos registros. Selecione um período menor.');
  docs=snap.docs;
 }
 const registros=docs.filter(d=>d.data().valido!==false&&tipoCompra(d.data())===tipo).map(d=>{
  const p=d.data();return {id:d.id,nomeOriginal:p.nomeOriginalFiscal||p.nomeOriginal||p.nomeSnapshot,itemId:p.itemId||'',cupomChave:p.cupomChave||'',listaId:p.listaId,produtoId:p.produtoId,nomeSnapshot:p.nomeSnapshot,marca:p.marca||'',apresentacao:p.apresentacao,unidadeCompra:p.unidadeCompra,supermercadoId:p.supermercadoId,supermercadoNome:p.supermercadoNome,quantidadeComprada:p.quantidadeComprada,precoUnitarioCentavos:p.precoUnitarioCentavos,...(p.precoUnitarioOriginalFiscal?{precoUnitarioOriginalFiscal:p.precoUnitarioOriginalFiscal}:{}),compradoEmMs:p.compradoEm.toMillis()};
 });
 if(dados.incluirListas===true&&dados.listaIds===undefined){
  const ids=[...new Set([...registros].sort((a,b)=>b.compradoEmMs-a.compradoEmMs).map(r=>r.listaId).filter(id))];listasLimitadas=ids.length>500;
  const snaps=ids.length?await db.getAll(...ids.slice(0,500).map(v=>db.doc('comprasListas/'+v))):[];
  listas=snaps.filter(s=>s.exists&&s.data().status==='finalizada'&&tipoCompra(s.data())===tipo).map(s=>({id:s.id,titulo:s.data().titulo||'Compra sem título',finalizadaEmMs:s.data().finalizadaEm?.toMillis?.()||null}));
 }
 const associacoes=require('./compras-associacoes.cjs'),mapa=await associacoes.lerMapa(db);
 return {registros:associacoes.aplicarAssociacoes(registros,mapa),associacoesVersao:mapa.versao,...(dados.incluirListas===true||dados.listaIds?{listas,listasLimitadas}: {})};
}
module.exports={lerRelatorioCompras};
