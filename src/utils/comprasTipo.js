export const TIPOS_COMPRAS={supermercado:'Supermercado',farmacia:'Farmácia',material_construcao:'Material de construção',oficina:'Oficina',pet:'Pet'};
export const TIPOS_PADRAO=['supermercado','farmacia'];
export const tipoCompra=lista=>lista?.tipoCompra===undefined?'supermercado':lista.tipoCompra;
export const nomeTipoCompra=lista=>TIPOS_COMPRAS[tipoCompra(lista)]||'Classificação não reconhecida';
export const nomeAutorLista=lista=>lista.origem!=='listaCompras'&&lista.criadaPor&&lista.criadaPorNome&&!['Nome não disponível','Não disponível'].includes(lista.criadaPorNome)?`Criado por: ${lista.criadaPorNome}`:'Autor não informado';
export function gastosSeparados(listas){
 const totais=Object.fromEntries(Object.keys(TIPOS_COMPRAS).map(t=>[t,0]));
 for(const l of listas)if(l.status==='finalizada'&&Number.isSafeInteger(l.totalCentavos)&&l.totalCentavos>=0&&Object.hasOwn(totais,tipoCompra(l)))totais[tipoCompra(l)]+=l.totalCentavos;
 return {...totais,total:Object.values(totais).reduce((s,v)=>s+v,0)};
}
