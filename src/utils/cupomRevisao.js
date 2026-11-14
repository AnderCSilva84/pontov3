import {conflitosProdutos,termosProduto} from '../../functions/produtos-identidade.mjs';
import {produtosPrincipais} from './catalogoProdutos.js';
import {camposFaltantesCupom} from './conclusaoCompra.js';

// Apenas correspondência exata e única; sem decidir por semelhança de nome.
export function reconhecerCupom(itens,catalogo,tipo,planejados=[]) {
 const produtos=produtosPrincipais(catalogo,{tipoCompra:tipo});
 const nome=p=>termosProduto(p).replace(/\s+(?:unidade|kilo|quilo)$/, '').trim();
 return itens.map(i=>{
  if(i.produtoId||i.itemPlanejadoId||i.descartar||i.unidadePendente)return i;
  const candidatos=produtos.filter(p=>p.unidadeCompra===i.unidadeCompra&&!conflitosProdutos({nomeOriginal:i.nomeOriginal,unidadeCompra:i.unidadeCompra},p).length&&[p.nome,...(p.aliasesNomes||[])].some(n=>nome(n)===nome(i.nomeOriginal)));
  if(candidatos.length!==1)return i;
  const p=candidatos[0],alvos=planejados.filter(a=>a.produtoId===p.id&&a.unidadeCompra===i.unidadeCompra);
  return {...i,produtoId:p.id,nome:p.nome,apresentacao:p.apresentacao,categoriaId:p.categoriaId,reconhecido:true,origemReconhecimento:'exato',...(alvos.length===1?{itemPlanejadoId:alvos[0].id,marca:i.marca||alvos[0].marca||''}:{})};
 });
}

export function conferirAssociacoesCupom(itens,catalogo) {
 return itens.map(i=>{
  if(i.descartar||!i.produtoId)return i;
  const p=catalogo.find(p=>p.id===i.produtoId);
  const conflitos=p?conflitosProdutos({nomeOriginal:i.nomeOriginal,unidadeCompra:i.unidadeCompra},p):[];
  return conflitos.length?{...i,erroRevisao:`${conflitos.join('; ')}. Na nota: ${i.nomeOriginal}. Cadastro: ${p.nome} · ${p.apresentacao}. Escolha outra embalagem ou crie um produto novo.`}:i;
 });
}

export const itensAtencaoCupom=itens=>itens.filter(i=>!i.descartar&&camposFaltantesCupom(i).length>0);
export function embalagemFiscal(i){
 if(i.unidadeCompra!=='un')return `Venda por ${i.unidadeCompra}`;
 const medidas=String(i.nomeOriginal||'').match(/\d+(?:[.,]\d+)?\s*(?:kg|mg|mcg|g|ml|l|cm|m)\b/gi);
 return medidas?.length?`Embalagem ${medidas.join(' / ')}`:'Unidade conforme a nota';
}
// Somente orientação da revisão; a confirmação continua validada no servidor.
export function pendenciasCupom(itens) {
  return itens.filter(i => !i.descartar && (
    i.unidadePendente ||
    (!i.produtoId && !i.itemPlanejadoId && !i.novoConfirmado) ||
    (i.unidadeConferir && !i.unidadeConfirmada)
  ));
}
