import {termosProduto,atributosProduto,conflitosProdutos,gtinValido} from '../../functions/produtos-identidade.mjs';
const ABREV={liq:'liquido',cond:'condensado',trad:'tradicional',cong:'congelado',resf:'resfriado',achoc:'achocolatado',qj:'queijo',muss:'mussarela',acuc:'acucar',bisc:'biscoito',crem:'creme'};
const texto=p=>termosProduto(p.nome).replace(/\d+(?:\.\d+)?\s*(kg|g|mg|mcg|ml|l|m|cm)\b/g,' ').split(' ').map(t=>ABREV[t]||t).filter(t=>t.length>2&&!['unidade','unidades','pacote','caixa','com','para','por'].includes(t)&&!/^\d+$/.test(t)).join(' ');
const trios=s=>new Set(Array.from({length:Math.max(0,s.length-2)},(_,i)=>s.slice(i,i+3)));
const umErro=(a,b)=>{if(Math.abs(a.length-b.length)>1)return false;let i=0,j=0,erros=0;while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue;}if(++erros>1)return false;if(a.length>=b.length)i++;if(b.length>=a.length)j++;}return true;};
const comuns=(a,b)=>[...a].filter(t=>b.has(t)).length;
export function procurarParesCatalogo(produtos,progresso=()=>{}){
 const principais=produtos.filter(p=>p.ativo!==false&&!p.principalId),semUnidade=principais.filter(p=>!['un','kg','l','m'].includes(p.unidadeCompra)).length;
 const entradas=principais.filter(p=>p.nome&&['un','kg','l','m'].includes(p.unidadeCompra)).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR')||a.id.localeCompare(b.id)).map(p=>{const n=texto(p),a=atributosProduto(p);for(const k of ['marca','medidas','packs','sabores','formas'])if(!a[k].length&&p.identidadeComparacao?.[k]?.length)a[k]=p.identidadeComparacao[k];return {p,n,gtin:gtinValido(p.gtin)?String(p.gtin):'',tokens:new Set(n.split(' ').filter(Boolean)),trios:trios(n),a};});
 const indice=new Map(),nomes=new Map();for(let i=0;i<entradas.length;i++){const e=entradas[i];if(!nomes.has(e.n))nomes.set(e.n,[]);nomes.get(e.n).push(i);if(e.gtin){const k='gtin:'+e.gtin;if(!indice.has(k))indice.set(k,[]);indice.get(k).push(i);}for(const t of e.tokens)for(const key of [t,'prefixo:'+t.slice(0,3),'sufixo:'+t.slice(-3)]){if(!indice.has(key))indice.set(key,[]);if(indice.get(key).length<200)indice.get(key).push(i);}}
 const pares=new Map();
 for(let i=0;i<entradas.length;i++){const e=entradas[i],candidatos=new Set((indice.get('gtin:'+e.gtin)||[]).filter(j=>j!==i));for(const t of e.tokens)for(const key of [t,'prefixo:'+t.slice(0,3),'sufixo:'+t.slice(-3)])for(const j of indice.get(key)||[])if(j!==i)candidatos.add(j);
  const iguais=nomes.get(e.n)||[],pos=iguais.indexOf(i);for(const j of [iguais[pos-1],iguais[pos+1]])if(j!==undefined)candidatos.add(j);
  const candidatosBons=[];
  for(const j of candidatos){const f=entradas[j];if(e.p.unidadeCompra!==f.p.unidadeCompra||(e.gtin&&f.gtin&&e.gtin!==f.gtin))continue;
   if(['marca','principio','dosagem','medidas','packs','sabores','formas'].some(k=>e.a[k]?.length&&f.a[k]?.length&&JSON.stringify(e.a[k])!==JSON.stringify(f.a[k])))continue;
   const score=e.gtin&&e.gtin===f.gtin?1.1:e.n===f.n?1:Math.max(e.tokens.size===1&&f.tokens.size===1&&umErro(e.n,f.n) ? .8 : 0,comuns(e.tokens,f.tokens)/Math.max(e.tokens.size,f.tokens.size,1),.8*2*comuns(e.trios,f.trios)/Math.max(e.trios.size+f.trios.size,1));
   if(score<.5)continue;candidatosBons.push({j,score});
  }
  candidatosBons.sort((a,b)=>b.score-a.score||entradas[a.j].p.id.localeCompare(entradas[b.j].p.id));
  for(const c of candidatosBons.slice(0,3)){const f=entradas[c.j],ids=[e.p.id,f.p.id].sort(),chave=JSON.stringify(ids);if(!conflitosProdutos(e.p,f.p).length)pares.set(chave,{chave,produtoIds:ids,score:c.score,motivo:c.score>1?'Código de barras coincidente':'Nome parecido'});}
  if(i%100===0)progresso({analisados:i+1,total:entradas.length});
 }
 return {pares:[...pares.values()].sort((a,b)=>b.score-a.score||a.chave.localeCompare(b.chave)),principais:principais.length,semUnidade};
}

export function aplicarMapaCatalogo(produtos,mapa){if(!mapa)return produtos;return produtos.map(p=>({...p,principalId:mapa.vinculos?.[p.id]||(mapa.catalogoIds?.includes(p.id)?'':p.principalId||''),identidadeComparacao:mapa.identidades?.[p.id]||(mapa.catalogoIds?.includes(p.id)?null:p.identidadeComparacao)}));}
