import {normalizarProduto} from '../../functions/produtos-identidade.mjs';
// Agrupamento apenas de consulta: não altera identidade, aliases ou preços.
export function filtrarHistoricoProduto(registros,catalogo,busca,categoriaId=''){
 const termos=normalizarProduto(busca).split(' ').filter(Boolean);if(!termos.length)return [];
 const produtos=new Map(catalogo.map(p=>[p.id,p]));const vistos=new Set();
 return registros.filter(r=>{const p=produtos.get(r.produtoId),original=produtos.get(r.produtoOriginalId);if(categoriaId&&(r.categoriaId||p?.categoriaId||original?.categoriaId||'sem-categoria')!==categoriaId)return false;
 const texto=normalizarProduto([r.nomeCanonico,r.nomeSnapshot,r.nomeOriginal,p?.nome,original?.nome,...(p?.aliasesNomes||[]),...(original?.aliasesNomes||[])].filter(Boolean).join(' '));
 if(!termos.every(t=>texto.includes(t))||vistos.has(r.id))return false;vistos.add(r.id);return true;});
}
export function separarUnidadesHistorico(registros){const grupos=new Map();for(const r of registros){const unidade=r.unidadeCompra||'un';if(!grupos.has(unidade))grupos.set(unidade,[]);grupos.get(unidade).push(r);}return [...grupos.entries()].sort(([a],[b])=>a.localeCompare(b));}
