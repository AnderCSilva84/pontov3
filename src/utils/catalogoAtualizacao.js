export function atualizarCatalogoCarregado(anterior,resposta,tipo){
 const itens=new Map((anterior?.produtos||[]).map(p=>[p.id,p]));
 for(const id of resposta.catalogoIds||[])if(!(resposta.catalogoAtualizado||[]).some(p=>p.id===id))itens.delete(id);
 for(const p of resposta.catalogoAtualizado||[]){const velho=itens.get(p.id),elegivel=p.ativo!==false&&!p.excluidoEm&&(p.tiposCompra?.includes(tipo)||resposta.tipoCompra===tipo||(!p.tiposCompra?.length&&velho?.contextoComprovado===tipo));if(elegivel)itens.set(p.id,{...p,contextoComprovado:tipo});else itens.delete(p.id);}
 return {...anterior,produtos:[...itens.values()]};
}
