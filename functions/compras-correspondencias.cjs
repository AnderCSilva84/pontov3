const { exigirOperacaoCompartilhada } = require('./compartilhamento.cjs');
const {HttpsError}=require('firebase-functions/v2/https');
const {FieldValue}=require('firebase-admin/firestore');const {createHash}=require('node:crypto');
const contexto=require('./catalogo-contexto.cjs'),{validarTipoCompra,tipoCompra}=require('./compras-tipo.cjs');
const id=v=>typeof v==='string'&&/^[\w-]{1,128}$/.test(v),falha=(c,m,detalhes)=>{throw new HttpsError(c,m,detalhes);};
const publico=m=>({vinculos:m.vinculos||{},nomes:m.nomes||{},itens:m.itens||{},identidades:m.identidades||{}});
async function operarCorrespondencias(db,request){
 const uid=request.auth?.uid,d=request.data||{},tipo=validarTipoCompra(d.tipoCompra);if(!uid)falha('unauthenticated','Entre no aplicativo.');
 const lib=await import('./produtos-identidade.mjs');
 return db.runTransaction(async tx=>{
    await exigirOperacaoCompartilhada(tx, db, uid);
  const perfil=(await tx.get(db.doc('users/'+uid))).data();if(!perfil||perfil.ativo===false||perfil.role!=='admin')falha('permission-denied','Somente administradores confirmam correspondências.');
  const catalogo=d.operacao.startsWith('catalogoMescla'),origens=catalogo?d.produtoIds:d.precoIds;
  if(!Array.isArray(origens)||origens.length!==2||origens.some(v=>!id(v))||origens[0]===origens[1])falha('invalid-argument','Escolha duas observações diferentes.');
  const mr=db.doc('comprasAssociacoes/estado'),m=(await tx.get(mr)).data()||{versao:0,vinculos:{},nomes:{},itens:{}};m.identidades||={};
  const confirmar=['correspondenciaConfirmar','catalogoMesclaConfirmar'].includes(d.operacao);let or,hash;
  if(confirmar){if(!id(d.operacaoId)||d.confirmado!==true)falha('invalid-argument','Confira os dados antes de confirmar.');or=db.doc('comprasAssociacoesOperacoes/'+d.operacaoId);hash=createHash('sha256').update(JSON.stringify(d)).digest('hex');const anterior=(await tx.get(or)).data();if(anterior){if(anterior.uid!==uid||anterior.hash!==hash)falha('already-exists','Esta tentativa já possui outro conteúdo.');if(anterior.resultado.catalogoAtualizado){const atuais=await tx.getAll(...anterior.resultado.catalogoIds.map(id=>db.doc('catalogoCompras/'+id)));return {...anterior.resultado,catalogoAtualizado:atuais.filter(s=>s.exists).map(s=>({...s.data(),id:s.id})),versao:m.versao,associacoes:require('./compras-correspondencias.cjs').publico(m)};}return anterior.resultado.associacoes?{...anterior.resultado,versao:m.versao,associacoes:require('./compras-correspondencias.cjs').publico(m)}:anterior.resultado;}}
  const precos=catalogo?[]:await tx.getAll(...d.precoIds.map(v=>db.doc('comprasPrecos/'+v)));
  if(precos.some(s=>!s.exists||s.data().valido===false||tipoCompra(s.data())!==tipo))falha('not-found','Compra indisponível nesta classificação e grupo.');
  const raiz=v=>m.vinculos?.[v]||v;
  const roots=[...new Set(catalogo?origens.map(raiz):precos.map(s=>raiz(m.itens?.[s.id]?.produtoId||s.data().produtoId)))];
  if(roots.some(v=>!id(v)))falha('failed-precondition','Cadastro incompleto; revise o produto no Catálogo.');
  if(catalogo&&origens.some(v=>raiz(v)!==v))falha('failed-precondition','Este par ficou desatualizado: um produto já foi mesclado. Execute a verificação novamente.',{motivo:'catalogo_desatualizado',produtoIds:origens});
  const ids=[...new Set([...roots,...Object.keys(m.vinculos||{}).filter(v=>roots.includes(raiz(v)))])].sort();
  if(ids.length>20)falha('resource-exhausted','Esta família já tem mais de 20 cadastros; revise pelo Catálogo.');
  const snaps=await tx.getAll(...ids.map(v=>db.doc('catalogoCompras/'+v)));
  if(snaps.some(s=>!s.exists||s.data().ativo===false))falha('not-found','Um cadastro deste par foi excluído ou está indisponível. Atualize a verificação.',{motivo:'catalogo_desatualizado',produtoIds:origens});
  if(catalogo&&snaps.some(s=>origens.includes(s.id)&&s.data().principalId))falha('failed-precondition','Este par já foi mesclado. Atualize a verificação.',{motivo:'catalogo_desatualizado',produtoIds:origens});
  if(catalogo&&snaps.some(s=>origens.includes(s.id)&&s.data().excluidoEm))falha('failed-precondition','Este par contém um cadastro antigo ou fora do catálogo atual. Atualize a análise.',{motivo:'catalogo_desatualizado',produtoIds:origens});
  for(const s of snaps){const membroJaAssociado=catalogo&&!origens.includes(s.id)&&!contexto.tiposProduto(s.data()).length&&roots.includes(m.vinculos?.[s.id]);if(!membroJaAssociado){const compativel=await contexto.compativel(tx,db,{...s.data(),id:s.id},tipo);if(!compativel&&catalogo)falha('failed-precondition','Este cadastro não está disponível no catálogo atual desta classificação. Atualize a análise.',{motivo:'catalogo_desatualizado',produtoIds:[s.id]});if(!compativel)await contexto.exigirCompativel(tx,db,{...s.data(),id:s.id},tipo);}}
  const observacoes=catalogo?origens.map(v=>{const s=snaps.find(s=>s.id===raiz(v)),p=s.data();return{id:v,produtoId:s.id,nome:p.nome,marca:p.marca||'',apresentacao:p.apresentacao||'',unidadeCompra:p.unidadeCompra||''};}):precos.map(s=>{const p={...s.data(),...(m.itens?.[s.id]||{})};return {id:s.id,produtoId:raiz(p.produtoId),nome:p.nomeOriginalFiscal||p.nomeOriginal||p.nomeSnapshot,marca:p.marca||'',apresentacao:p.apresentacao||'',unidadeCompra:p.unidadeCompra};});
  const fontes=[...snaps.map(s=>s.data()),...observacoes],conflitos=[];
  if(observacoes.some(o=>!['un','kg','l','m'].includes(o.unidadeCompra)))conflitos.push('Unidade de compra pendente no cadastro');
  for(let i=0;i<fontes.length;i++)for(let j=i+1;j<fontes.length;j++)conflitos.push(...lib.conflitosProdutos(fontes[i],fontes[j]));
  const atributos=[...fontes.map(lib.atributosProduto),...roots.map(v=>m.identidades[v]).filter(Boolean)];
  for(const k of ['marca','principio','dosagem','medidas','packs','sabores','formas']){const conhecidos=atributos.map(a=>a[k]).filter(v=>v?.length);if(new Set(conhecidos.map(v=>JSON.stringify(v))).size>1)conflitos.push('Dados divergentes de '+k);}
  const identidade={unidadeCompra:observacoes[0].unidadeCompra};
  for(const k of ['marca','principio','dosagem','medidas','packs','sabores','formas'])identidade[k]=atributos.find(a=>a[k]?.length)?.[k]||(Array.isArray(atributos[0][k])?[]:'');
  const produtos=snaps.map(s=>({id:s.id,...s.data()}));
  const assinatura=createHash('sha256').update(JSON.stringify({produtos,observacoes,identidade})).digest('hex');
  const faltantes=observacoes.flatMap((o,i)=>[!o.marca?'Marca não informada na compra '+(i+1):'',!lib.atributosProduto(o).medidas.length?'Peso/volume não informado na compra '+(i+1):''].filter(Boolean));
  if(!confirmar)return {versao:m.versao||0,assinatura,produtos:catalogo?produtos.filter(p=>origens.includes(p.id)):produtos,observacoes,conflitos:[...new Set(conflitos)],faltantes,principalSugerido:roots[0]};
  if(d.versao!==(m.versao||0)||d.assinatura!==assinatura)falha('aborted','Os produtos mudaram. Abra a conferência novamente.');
  if(!(catalogo?origens:ids).includes(d.principalId))falha('invalid-argument','Escolha o produto principal mostrado na conferência.');
  if(conflitos.length)falha('failed-precondition','Produtos diferentes: '+[...new Set(conflitos)].join('; '));
  const antes=Object.fromEntries(snaps.map(s=>{const p=s.data();return [s.id,{tiposCompra:contexto.tiposProduto(p),principalId:p.principalId||'',membrosIds:p.membrosIds||[],ultimaMesclaId:p.ultimaMesclaId||''}];}));
  const principalAntes=snaps.find(s=>s.id===d.principalId).data();
  const aliasesAntes={[d.principalId]:principalAntes.aliasesNomes||null};
  const aliasesAprendidos=[...new Set([...(principalAntes.aliasesNomes||[]),...observacoes.map(o=>o.nome),...snaps.map(s=>s.data().nome)].filter(v=>typeof v==='string'&&v.trim()&&v!==principalAntes.nome))].slice(0,20);
  const identidadesAntes=Object.fromEntries(ids.map(v=>[v,m.identidades[v]||null])),nomesAntes=Object.fromEntries(ids.map(v=>[v,m.nomes?.[v]||null]));
  m.vinculos||={};m.nomes||={};
  for(const s of snaps){const principal=s.id===d.principalId;tx.update(s.ref,{principalId:principal?'':d.principalId,membrosIds:principal?ids.filter(v=>v!==s.id):[],ultimaMesclaId:d.operacaoId,tiposCompra:principal?[...new Set([tipo,...snaps.flatMap(x=>contexto.tiposProduto(x.data()))])]:contexto.tiposProduto(s.data())});if(principal)delete m.vinculos[s.id];else m.vinculos[s.id]=d.principalId;delete m.identidades[s.id];}
  tx.update(db.doc('catalogoCompras/'+d.principalId),{aliasesNomes:aliasesAprendidos});
  m.nomes[d.principalId]=snaps.find(s=>s.id===d.principalId).data().nome;m.identidades[d.principalId]=identidade;m.versao=(m.versao||0)+1;
  if(Object.keys(m.vinculos).length>500||Buffer.byteLength(JSON.stringify(m))>500000)falha('resource-exhausted','Limite de associações do grupo atingido.');
  const catalogoAtualizado=snaps.map(s=>({...s.data(),id:s.id,principalId:s.id===d.principalId?'':d.principalId,membrosIds:s.id===d.principalId?ids.filter(v=>v!==s.id):[],ultimaMesclaId:d.operacaoId,tiposCompra:s.id===d.principalId?[...new Set([tipo,...snaps.flatMap(x=>contexto.tiposProduto(x.data()))])]:contexto.tiposProduto(s.data()),...(s.id===d.principalId?{aliasesNomes:aliasesAprendidos}:{})}));
  const resultado={ok:true,tipoCompra:tipo,catalogoAtualizado,versao:m.versao,principalId:d.principalId,mesclaId:d.operacaoId,catalogoIds:ids,associacoes:publico(m)};
  tx.set(mr,m);tx.create(or,{uid,nomeAutor:perfil.nome||'',criadaEm:FieldValue.serverTimestamp(),hash,tipo:'mesclarProdutos',origem:catalogo?'pente_fino':'comparacao',tipoCompra:tipo,antes,identidadesAntes,nomesAntes,aliasesAntes,produtoIds:ids,principalId:d.principalId,...(catalogo?{}:{precoIds:d.precoIds}),resultado});return resultado;
 });
}
module.exports={operarCorrespondencias,publico};
