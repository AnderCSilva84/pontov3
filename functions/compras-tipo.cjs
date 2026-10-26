const {HttpsError}=require('firebase-functions/v2/https');
const tipoCompra=d=>d?.tipoCompra===undefined?'supermercado':d.tipoCompra;
const ehSupermercado=d=>tipoCompra(d)==='supermercado';
function validarTipoCompra(v='supermercado'){
  if(!['supermercado','farmacia'].includes(v))throw new HttpsError('invalid-argument','Escolha Supermercado ou Farmácia.');
  return v;
}
module.exports={tipoCompra,ehSupermercado,validarTipoCompra};
