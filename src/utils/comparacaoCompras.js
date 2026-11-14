import {atributosProduto,normalizarProduto} from '../../functions/produtos-identidade.mjs';
const ESCALA=10000000000n;
export function precoComparavel(r){
 if(typeof r.precoUnitarioOriginalFiscal==='string'){
  if(!/^\d+(?:\.\d{3})*(?:,\d{1,10})?$/.test(r.precoUnitarioOriginalFiscal))return null;
  const s=r.precoUnitarioOriginalFiscal.replaceAll('.','');
  const [a,b='']=s.split(',');const n=BigInt(a)*ESCALA+BigInt(b.padEnd(10,'0'));return n>0n&&n<=1000000n*ESCALA?n:null;
 }
 return Number.isSafeInteger(r.precoUnitarioCentavos)&&r.precoUnitarioCentavos>0&&r.precoUnitarioCentavos<=100000000?BigInt(r.precoUnitarioCentavos)*100000000n:null;
}
export function moedaComparacao(n){
 const inteiro=n/ESCALA,dec=(n%ESCALA).toString().padStart(10,'0').replace(/0+$/,'').padEnd(2,'0');
 return 'R$ '+inteiro.toLocaleString('pt-BR')+','+dec;
}
export function chaveComparacao(r){
 const a=atributosProduto({nome:r.nomeOriginal||r.nomeSnapshot,apresentacao:r.apresentacao});
 a.marca=normalizarProduto(r.marca);
 const confirmada=r.identidadeComparacao;
 if(confirmada&&confirmada.unidadeCompra===r.unidadeCompra){
  const campos=['marca','medidas','packs','sabores','formas'];
  const conflita=campos.some(k=>a[k].length&&confirmada[k]?.length&&JSON.stringify(a[k])!==JSON.stringify(confirmada[k]));
  if(!conflita)for(const k of campos)if(!a[k].length&&confirmada[k]?.length)a[k]=confirmada[k];
 }
 return JSON.stringify([r.produtoId,r.unidadeCompra,a.marca,a.medidas,a.packs,a.sabores,a.formas]);
}

export function reaplicarCorrespondencias(registros,mapa){
 if(!mapa)return registros;
 return registros.map(r=>{const original=r.produtoOriginalId||r.produtoId,correcao=mapa.itens?.[r.id],associado=correcao?.produtoId||original,principal=mapa.vinculos?.[associado]||associado;
  return {...r,...correcao,produtoOriginalId:original,produtoId:principal,nomeCanonico:mapa.nomes?.[principal]||r.nomeSnapshot,identidadeComparacao:mapa.identidades?.[principal]||null};});
}
const quantidade=r=>Number.isFinite(r.quantidadeComprada)&&r.quantidadeComprada>0&&r.quantidadeComprada<=10000?Math.round(r.quantidadeComprada*10000):0;
export function compararCompras(registros,{modo='mercados',a,b}={}){
 const campo=modo==='listas'?'listaId':'supermercadoId',grupos=new Map(),vistos=new Set();
 if(!a||!b||a===b)return [];
 for(const r of registros){
  if(vistos.has(r.id)||![a,b].includes(r[campo])||r.valido===false||!r.produtoId||!['un','kg','l','m'].includes(r.unidadeCompra))continue;
  const preco=precoComparavel(r),q=quantidade(r);if(preco===null||!Number.isFinite(r.compradoEmMs)||(modo==='listas'&&!q))continue;
  vistos.add(r.id);const chave=chaveComparacao(r);if(!grupos.has(chave))grupos.set(chave,{chave,modelo:r,lados:{}});
  const g=grupos.get(chave),lado=r[campo],antigo=g.lados[lado];
  if(modo==='listas'){
   if(!antigo)g.lados[lado]={...r,quantidade:0,peso:0n,soma:0n};
   const l=g.lados[lado];l.quantidade+=q/10000;l.peso+=BigInt(q);l.soma+=preco*BigInt(q);l.preco=(l.soma+l.peso/2n)/l.peso;l.compradoEmMs=Math.max(l.compradoEmMs,r.compradoEmMs);
  }else if(!antigo||r.compradoEmMs>antigo.compradoEmMs||(r.compradoEmMs===antigo.compradoEmMs&&String(r.id)>String(antigo.id)))g.lados[lado]={...r,preco};
 }
 return [...grupos.values()].filter(g=>g.lados[a]&&g.lados[b]).map(g=>({...g,a:g.lados[a],b:g.lados[b],menor:g.lados[a].preco===g.lados[b].preco?'empate':g.lados[a].preco<g.lados[b].preco?'a':'b',diferenca:g.lados[a].preco>g.lados[b].preco?g.lados[a].preco-g.lados[b].preco:g.lados[b].preco-g.lados[a].preco})).sort((x,y)=>(x.modelo.nomeCanonico||x.modelo.nomeSnapshot||'').localeCompare(y.modelo.nomeCanonico||y.modelo.nomeSnapshot||'','pt-BR')||x.chave.localeCompare(y.chave));
}
