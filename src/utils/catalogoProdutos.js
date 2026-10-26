import {normalizarProduto} from '../../functions/produtos-identidade.mjs';

// Filtra somente a apresentação. Referências antigas continuam disponíveis para
// notas, listas existentes, histórico e desfazer; não desativa documentos.
export function produtosPrincipais(catalogo,{busca='',categoriaId=''}={}) {
 const aliases=new Map();
 for(const p of catalogo)if(p.principalId){
  if(!aliases.has(p.principalId))aliases.set(p.principalId,[]);
  aliases.get(p.principalId).push(p.nome,...(p.aliasesNomes||[]));
 }
 const termo=normalizarProduto(busca);
 return catalogo.filter(p=>p.ativo!==false&&!p.principalId&&(!categoriaId||p.categoriaId===categoriaId)&&normalizarProduto([p.nome,p.marca,p.apresentacao,...(p.aliasesNomes||[]),...(aliases.get(p.id)||[])].filter(Boolean).join(' ')).includes(termo));
}
