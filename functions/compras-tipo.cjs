const {HttpsError}=require('firebase-functions/v2/https');
const TIPOS={supermercado:'Supermercado',farmacia:'Farmácia',material_construcao:'Material de construção',oficina:'Oficina',pet:'Pet'};
const PADRAO=['supermercado','farmacia'];
const configuracaoTipos=d=>({habilitadas:d?.habilitadas??[...PADRAO],versao:d?.versao??0});
const tipoCompra=d=>d?.tipoCompra===undefined?'supermercado':d.tipoCompra;
const ehSupermercado=d=>tipoCompra(d)==='supermercado';
function validarTipoCompra(v='supermercado'){
  if(!Object.hasOwn(TIPOS,v))throw new HttpsError('invalid-argument','Escolha uma classificação de compra válida.');
  return v;
}
async function exigirTipoHabilitado(tx,db,tipo){
 validarTipoCompra(tipo);
 const config=configuracaoTipos((await tx.get(db.doc('comprasConfiguracao/tipos'))).data());
 if(!config.habilitadas.includes(tipo))throw new HttpsError('failed-precondition','Esta categoria está desabilitada para novas compras. Atualize as categorias disponíveis.');
}
async function configurarTipos(tx,db,perfil,uid,dados){
 const ref=db.doc('comprasConfiguracao/tipos');
 if(dados.operacao==='salvarCategoriasCompras'&&perfil.role!=='admin')throw new HttpsError('permission-denied','Somente administradores podem alterar as categorias de compras.');
 const atual=configuracaoTipos((await tx.get(ref)).data());
 if(dados.operacao==='consultarCategoriasCompras')return atual;
 const lista=dados.habilitadas;
 if(!Array.isArray(lista)||!lista.length||lista.length>5||new Set(lista).size!==lista.length||lista.some(t=>!Object.hasOwn(TIPOS,t)))throw new HttpsError('invalid-argument','Habilite ao menos uma categoria válida.');
 if(dados.versao!==atual.versao)throw new HttpsError('aborted','As categorias foram alteradas. Atualize antes de salvar.');
 const habilitadas=Object.keys(TIPOS).filter(t=>lista.includes(t));
 if(JSON.stringify(habilitadas)===JSON.stringify(atual.habilitadas))return atual;
 const nova={habilitadas,versao:atual.versao+1};
 tx.set(ref,{...nova,alteradaPor:uid,alteradaEm:require('firebase-admin/firestore').FieldValue.serverTimestamp()});
 return nova;
}
module.exports={TIPOS,PADRAO,configuracaoTipos,tipoCompra,ehSupermercado,validarTipoCompra,exigirTipoHabilitado,configurarTipos};
