const {HttpsError}=require('firebase-functions/v2/https');
const {tipoCompra,validarTipoCompra,TIPOS}=require('./compras-tipo.cjs');
const {FieldValue}=require('firebase-admin/firestore');
const id=v=>typeof v==='string'&&/^[\w-]{1,128}$/.test(v);
const tiposProduto=p=>Array.isArray(p?.tiposCompra)?p.tiposCompra.filter(t=>Object.hasOwn(TIPOS,t)):[];
const aliasNoTipo=(tipo,chave)=>`${validarTipoCompra(tipo)}_${chave}`;
async function compativel(tx,db,produto,tipo,{planejado=false}={}){
 validarTipoCompra(tipo);
 if(planejado||tiposProduto(produto).includes(tipo))return true;
 const ids=[produto.id,...(produto.membrosIds||[])].filter(id).slice(0,20);
 if(!ids.length)return false;
 // Somente o produto selecionado e seus membros. Amostra limitada, sem varrer histórico.
 const s=await tx.get(db.collection('comprasPrecos').where('produtoId','in',ids).select('tipoCompra','valido').limit(21));
 return s.docs.some(d=>d.data().valido!==false&&tipoCompra(d.data())===tipo);
}
async function exigirCompativel(tx,db,produto,tipo,opcoes){
 if(!await compativel(tx,db,produto,tipo,opcoes))throw new HttpsError('failed-precondition','Produto sem associação comprovada a esta categoria. Peça ao administrador para revisar as categorias do produto.');
}
async function operarCatalogo(tx,db,perfil,uid,d){
 const tipo=validarTipoCompra(d.tipoCompra);
 if(d.operacao==='produtoCategorias'){
  if(perfil.role!=='admin')throw new HttpsError('permission-denied','Somente administradores associam categorias ao catálogo.');
  if(!id(d.produtoId)||!Array.isArray(d.tiposCompra)||!d.tiposCompra.length||d.tiposCompra.length>5||new Set(d.tiposCompra).size!==d.tiposCompra.length||d.tiposCompra.some(t=>!Object.hasOwn(TIPOS,t)))throw new HttpsError('invalid-argument','Escolha ao menos uma categoria válida para o produto.');
  const ref=db.doc('catalogoCompras/'+d.produtoId),p=(await tx.get(ref)).data();if(!p||p.ativo===false)throw new HttpsError('not-found','Produto não encontrado neste grupo.');
  const tipos=[...new Set([...tiposProduto(p),...d.tiposCompra])].sort();
  if(JSON.stringify(tipos)===JSON.stringify([...tiposProduto(p)].sort()))return {ok:true};
  const agora=FieldValue.serverTimestamp();
  tx.update(ref,{tiposCompra:tipos});tx.create(db.collection('catalogoCategoriasAuditoria').doc(),{produtoId:ref.id,antes:tiposProduto(p),depois:tipos,por:uid,em:agora});
  return {ok:true};
 }
 for(const campo of ['cursor','cursorHistorico'])if(d[campo]!=null&&!id(d[campo]))throw new HttpsError('invalid-argument','Cursor inválido.');
 if(d.operacao==='catalogoRevisar'){
  if(perfil.role!=='admin')throw new HttpsError('permission-denied','Somente administradores revisam o catálogo.');
  let q=db.collection('catalogoCompras').orderBy('__name__');if(d.cursor)q=q.startAfter(d.cursor);
  const s=await tx.get(q.limit(26));return {produtos:s.docs.slice(0,25).map(x=>({id:x.id,...x.data()})),cursor:s.size>25?s.docs[24].id:null};
 }
 let q=db.collection('catalogoCompras').where('tiposCompra','array-contains',tipo).orderBy('__name__');if(d.cursor)q=q.startAfter(d.cursor);
 // Firestore não inclui campos ausentes numa igualdade. No legado, ausência
 // de tipoCompra significa supermercado: paginar a mesma coleção por ID e
 // filtrar cada página no servidor preserva essa regra sem migrar históricos.
 let h=db.collection('comprasPrecos');
 if(tipo!=='supermercado')h=h.where('tipoCompra','==',tipo);
 h=h.orderBy('__name__').select('produtoId','valido','tipoCompra');if(d.cursorHistorico)h=h.startAfter(d.cursorHistorico);
 const explicitos=d.fimExplicitos?null:await tx.get(q.limit(26)),historico=d.fimHistorico?null:await tx.get(h.limit(26));
 const produtos=new Map((explicitos?.docs.slice(0,25)||[]).map(x=>[x.id,{id:x.id,...x.data()}]));
 const ids=[...new Set((historico?.docs.slice(0,25)||[]).filter(x=>x.data().valido!==false&&tipoCompra(x.data())===tipo).map(x=>x.data().produtoId).filter(id))].filter(x=>!produtos.has(x));
 const snaps=ids.length?await tx.getAll(...ids.map(x=>db.doc('catalogoCompras/'+x))):[];for(const x of snaps)if(x.exists)produtos.set(x.id,{id:x.id,...x.data()});
 const principais=[...new Set([...produtos.values()].map(p=>p.principalId).filter(id))].filter(x=>!produtos.has(x));
 if(principais.length)for(const x of await tx.getAll(...principais.map(x=>db.doc('catalogoCompras/'+x))))if(x.exists)produtos.set(x.id,{id:x.id,...x.data()});
 return {produtos:[...produtos.values()].filter(p=>p.ativo!==false).map(p=>({...p,contextoComprovado:tipo})),tipoCompra:tipo,cursor:explicitos?.size>25?explicitos.docs[24].id:null,cursorHistorico:historico?.size>25?historico.docs[24].id:null};
}
module.exports={tiposProduto,aliasNoTipo,compativel,exigirCompativel,operarCatalogo};
