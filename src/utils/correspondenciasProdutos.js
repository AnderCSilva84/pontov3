import {termosProduto,conflitosProdutos,atributosProduto} from '../../functions/produtos-identidade.mjs';
import {chaveComparacao,precoComparavel} from './comparacaoCompras.js';
const ABREV={liq:'liquido',cond:'condensado',trad:'tradicional',cong:'congelado',resf:'resfriado',achoc:'achocolatado',qj:'queijo',muss:'mussarela',acuc:'acucar',bisc:'biscoito',crem:'creme'};
const tokens=r=>new Set(termosProduto(r.nomeOriginal||r.nomeSnapshot).replace(/\d+(?:\.\d+)?\s*(?:kg|g|mg|mcg|ml|l|cm|m)\b/g,' ').split(' ').map(t=>ABREV[t]||t).filter(t=>t.length>2&&!['unidade','unidades','pacote','caixa','kilo','com','para','por'].includes(t)&&!/^\d+$/.test(t)));
const identidade=r=>({nomeOriginal:r.nomeOriginal||r.nomeSnapshot,marca:r.marca,apresentacao:r.apresentacao,unidadeCompra:r.unidadeCompra});
export function sugerirCorrespondencias(registros,{modo='mercados',a,b}={}){
 if(!a||!b||a===b)return [];
 const campo=modo==='listas'?'listaId':'supermercadoId',lados={[a]:new Map(),[b]:new Map()};
 for(const r of registros){if(!lados[r[campo]]||r.valido===false||precoComparavel(r)===null)continue;const chave=chaveComparacao(r),antes=lados[r[campo]].get(chave);if(!antes||r.compradoEmMs>antes.compradoEmMs||(r.compradoEmMs===antes.compradoEmMs&&String(r.id)>String(antes.id)))lados[r[campo]].set(chave,r);}
 const esquerda=[...lados[a]].filter(([k])=>!lados[b].has(k)).map(([,r])=>r),direita=[...lados[b]].filter(([k])=>!lados[a].has(k)).map(([,r])=>({r,tokens:tokens(r)})),indice=new Map();
 direita.forEach((x,i)=>{for(const t of x.tokens){if(!indice.has(t))indice.set(t,[]);if(indice.get(t).length<100)indice.get(t).push(i);}});
 const pares=[];
 for(const l of esquerda){const ts=tokens(l),candidatos=new Set();for(const t of ts)for(const i of indice.get(t)||[])candidatos.add(i);
  const sugestoes=[...candidatos].map(i=>{const d=direita[i],comuns=[...ts].filter(t=>d.tokens.has(t)).length,score=comuns/Math.max(ts.size,d.tokens.size,1);return {a:l,b:d.r,score,conflitos:conflitosProdutos(identidade(l),identidade(d.r))};}).filter(x=>x.score>=.35&&!x.conflitos.length).sort((x,y)=>y.score-x.score||String(x.b.id).localeCompare(String(y.b.id))).slice(0,3);
  for(const s of sugestoes){const aa=atributosProduto(identidade(s.a)),bb=atributosProduto(identidade(s.b));pares.push({...s,chave:JSON.stringify([s.a.id,s.b.id]),faltantes:[!s.a.marca||!s.b.marca?'Marca não informada em uma das compras':'',!aa.medidas.length||!bb.medidas.length?'Peso/volume incompleto em uma das compras':''].filter(Boolean)});}
 }
 return pares.sort((x,y)=>y.score-x.score||x.chave.localeCompare(y.chave));
}
