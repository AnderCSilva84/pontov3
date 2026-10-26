export const tipoCompra=lista=>lista?.tipoCompra===undefined?'supermercado':lista.tipoCompra;
export const nomeTipoCompra=lista=>tipoCompra(lista)==='farmacia'?'Farmácia':'Supermercado';
export const nomeAutorLista=lista=>lista.origem!=='listaCompras'&&lista.criadaPor&&lista.criadaPorNome&&!['Nome não disponível','Não disponível'].includes(lista.criadaPorNome)?`Criado por: ${lista.criadaPorNome}`:'Autor não informado';
export function gastosSeparados(listas){
 const totais={supermercado:0,farmacia:0};
 for(const l of listas)if(l.status==='finalizada'&&Number.isSafeInteger(l.totalCentavos)&&l.totalCentavos>=0&&Object.hasOwn(totais,tipoCompra(l)))totais[tipoCompra(l)]+=l.totalCentavos;
 return {...totais,total:totais.supermercado+totais.farmacia};
}
