const {HttpsError}=require('firebase-functions/v2/https');
const nomeProduto=valor=>String(valor||'').trim().toLocaleUpperCase('pt-BR');
async function excluirProduto(tx,db,uid,perfil,dados,agora){
 if(perfil?.role!=='admin'||perfil.ativo===false)throw new HttpsError('permission-denied','Somente administradores podem excluir produtos do catálogo.');
 if(dados.confirmado!==true||typeof dados.produtoId!=='string'||!(/^[\w-]{1,128}$/).test(dados.produtoId))throw new HttpsError('invalid-argument','Confirme o produto que deseja excluir do catálogo.');
 const ref=db.doc('catalogoCompras/'+dados.produtoId),snap=await tx.get(ref);if(!snap.exists)throw new HttpsError('not-found','Produto não encontrado neste grupo.');
 if(snap.data().ativo===false)return {ok:true,jaExcluido:true};
 tx.update(ref,{ativo:false,excluidoPor:uid,excluidoEm:agora});return {ok:true};
}
module.exports={nomeProduto,excluirProduto};
