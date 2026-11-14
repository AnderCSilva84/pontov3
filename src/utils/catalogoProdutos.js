import {termosProduto,conflitosProdutos,sugerirProdutos} from '../../functions/produtos-identidade.mjs';
export function filtrarCatalogoContexto(catalogo,tipo){
 return !tipo?catalogo:catalogo.filter(p=>p.tiposCompra?.includes(tipo)||p.contextoComprovado===tipo);
}

// Filtra somente a apresentação. Referências antigas continuam disponíveis para
// notas, listas existentes, histórico e desfazer; não desativa documentos.
const ABREVIACOES_BUSCA={qj:'queijo',qjo:'queijo',muss:'mussarela',mucarela:'mussarela',mozzarella:'mussarela',bisc:'biscoito',achoc:'achocolatado',liq:'liquido',cond:'condensado',trad:'tradicional',beb:'bebida',lac:'lactea',iog:'iogurte',cong:'congelado',resf:'resfriado',crem:'creme',dent:'dental',sab:'sabao',po:'po',amac:'amaciante',deterg:'detergente',mol:'molho',pront:'pronto',int:'integral'};
export const normalizarBuscaCatalogo=v=>termosProduto(v).split(' ').map(t=>ABREVIACOES_BUSCA[t]||t).join(' ');
// Melhora a ordenação local sem mudar nomes, contratos ou associações salvas.
export function sugerirCatalogo(entrada,catalogo,limite=5){
 const normalizado=p=>({...p,nome:normalizarBuscaCatalogo(p.nome),nomeOriginal:p.nomeOriginal?normalizarBuscaCatalogo(p.nomeOriginal):undefined,aliasesNomes:(p.aliasesNomes||[]).map(normalizarBuscaCatalogo)});
 const originais=new Map(catalogo.map(p=>[p.id,p]));
 return sugerirProdutos(normalizado(entrada),catalogo.map(normalizado),catalogo.length)
  .map(c=>({...c,produto:originais.get(c.produto.id),conflitos:conflitosProdutos(entrada,originais.get(c.produto.id))}))
  .sort((a,b)=>Number(!!a.conflitos.length)-Number(!!b.conflitos.length)||b.score-a.score)
  .slice(0,limite);
}
export function produtosPrincipais(catalogo,{busca='',categoriaId='',tipoCompra}={}) {
 catalogo=filtrarCatalogoContexto(catalogo,tipoCompra);
 const aliases=new Map();
 for(const p of catalogo)if(p.principalId){
  if(!aliases.has(p.principalId))aliases.set(p.principalId,[]);
  aliases.get(p.principalId).push(p.nome,...(p.aliasesNomes||[]));
 }
 const termos=normalizarBuscaCatalogo(busca).split(' ').filter(Boolean);
 return catalogo.filter(p=>p.ativo!==false&&!p.principalId&&(!categoriaId||p.categoriaId===categoriaId)&&termos.every(t=>normalizarBuscaCatalogo([p.nome,p.marca,p.apresentacao,...(p.aliasesNomes||[]),...(aliases.get(p.id)||[])].filter(Boolean).join(' ')).includes(t)));
}

// Só dados já carregados; unidade incompatível é informada, nunca convertida silenciosamente.
export function opcoesAssociacaoCupom(catalogo,{tipoCompra,unidadeCompra,busca='',entrada}){
 let produtos=produtosPrincipais(catalogo,{tipoCompra,busca});
 let buscaAproximada=false;
 if(!produtos.length&&normalizarBuscaCatalogo(busca).length>=3){
  const termos=normalizarBuscaCatalogo(busca).split(' ').filter(Boolean);
  const proximo=(a,b)=>{
   if(a===b||b.includes(a))return true;
   if(a.length<6||Math.abs(a.length-b.length)>1)return false;
   // Uma inserção, remoção ou troca de letra: sugestão manual, nunca associação.
   for(let i=0;i<Math.max(a.length,b.length);i++)if(a[i]!==b[i])return a.slice(i+1)===b.slice(i+1)||a.slice(i+1)===b.slice(i)||a.slice(i)===b.slice(i+1);
   return true;
  };
  produtos=produtosPrincipais(catalogo,{tipoCompra}).filter(p=>{
   const nomes=[p.nome,p.marca,p.apresentacao,...(p.aliasesNomes||[]),...catalogo.filter(a=>a.principalId===p.id).flatMap(a=>[a.nome,...(a.aliasesNomes||[])])];
   const texto=normalizarBuscaCatalogo(nomes.filter(Boolean).join(' ')),palavras=texto.split(' ');
   return texto.replaceAll(' ','').includes(termos.join(''))||termos.every(t=>palavras.some(p=>proximo(t,p)));
  });
  buscaAproximada=produtos.length>0;
 }
 const fiscal=entrada&&{nomeOriginal:entrada.nomeOriginal||entrada.nome,unidadeCompra:entrada.unidadeCompra};
 const compativel=p=>p.unidadeCompra===unidadeCompra&&(!fiscal||!conflitosProdutos(fiscal,p).length);
 return {compativeis:produtos.filter(compativel),incompativeis:produtos.filter(p=>!compativel(p)),buscaAproximada};
}
