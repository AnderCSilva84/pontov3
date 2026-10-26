export const normalizarProduto=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/(\d),(\d)/g,'$1.$2').replace(/[^a-z0-9.]+/g,' ').trim().replace(/\s+/g,' ');
const ABREV={integ:'integral',desn:'desnatado',lt:'l',lts:'l',litro:'l',litros:'l',quilo:'kg',quilos:'kg',gramas:'g',gr:'g',mls:'ml',pct:'pacote',pcte:'pacote',pc:'pacote',cx:'caixa',comp:'comprimido',comprimidos:'comprimido',caps:'capsula',capsulas:'capsula',unid:'un',unidades:'un',und:'un'};
export const termosProduto=v=>normalizarProduto(v).split(' ').map(t=>ABREV[t]||t).join(' ');
export function gtinValido(v){const s=String(v||'');if(!/^(\d{8}|\d{12,14})$/.test(s)||/^0+$/.test(s))return false;let soma=0;for(let i=s.length-2,p=0;i>=0;i--,p++)soma+=Number(s[i])*(p%2?1:3);return (10-soma%10)%10===Number(s.at(-1));}
export function atributosProduto(p){
 const texto=termosProduto([p.nomeOriginal||p.nome,p.apresentacao,p.dosagem].filter(Boolean).join(' '));
 const medidas=[...texto.matchAll(/(\d+(?:\.\d+)?)\s*(kg|mg|mcg|g|ml|l|cm|m)\b/g)].map(([,n,u])=>{const f={kg:1000,g:1,mg:.001,mcg:.000001,l:1000,ml:1,m:100,cm:1};return `${Number((Number(n)*f[u]).toFixed(6))}${['kg','g','mg','mcg'].includes(u)?'g':['l','ml'].includes(u)?'ml':'cm'}`;}).sort();
 const packs=[...texto.matchAll(/(?:c\s+(\d+)|(\d+)\s*(?:un|comprimido|capsula|rolos)\b)/g)].map(m=>Number(m[1]||m[2])).sort((a,b)=>a-b);
 const sabores=['morango','chocolate','baunilha','integral','desnatado','zero','light','sem lactose','infantil','adulto'].filter(t=>texto.includes(t));
 const formas=['comprimido','capsula','solucao','suspensao','pomada','gotas'].filter(t=>texto.includes(t));
 return {marca:normalizarProduto(p.marca),principio:normalizarProduto(p.principioAtivo),dosagem:termosProduto(p.dosagem),medidas:[...new Set(medidas)],packs:[...new Set(packs)],sabores,formas};
}
export function conflitosProdutos(a,b){
 const x=atributosProduto(a),y=atributosProduto(b),r=[];
 if(a.unidadeCompra&&b.unidadeCompra&&a.unidadeCompra!==b.unidadeCompra)r.push('Unidades de compra diferentes');
 for(const [k,n]of [['marca','Marcas'],['principio','Princípios ativos'],['dosagem','Dosagens'],['medidas','Peso/volume/dose'],['packs','Quantidade na embalagem'],['sabores','Sabores/versões'],['formas','Formas farmacêuticas']]){const v=x[k],w=y[k];if(v.length&&w.length&&JSON.stringify(v)!==JSON.stringify(w))r.push(n+' diferentes');}
 if(gtinValido(a.gtin)&&gtinValido(b.gtin)&&a.gtin!==b.gtin)r.push('GTINs diferentes');
 return r;
}
function distancia(a,b){if(a.length>200||b.length>200)return 200;let linha=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const prox=[i];for(let j=1;j<=b.length;j++)prox[j]=Math.min(prox[j-1]+1,linha[j]+1,linha[j-1]+(a[i-1]===b[j-1]?0:1));linha=prox;}return linha[b.length];}
export function sugerirProdutos(entrada,catalogo,limite=5){
 const n=termosProduto(entrada.nomeOriginal||entrada.nome),tokens=new Set(n.split(' ').filter(Boolean));if(n.length<2)return [];
 const aliases=new Map();for(const p of catalogo)if(p.principalId){if(!aliases.has(p.principalId))aliases.set(p.principalId,[]);aliases.get(p.principalId).push(p.nome);}
 return catalogo.filter(p=>p.ativo!==false&&!p.principalId&&p.id!==entrada.id).map(p=>{const alias=[...(p.aliasesNomes||[]),...(aliases.get(p.id)||[])].some(v=>termosProduto(v)===n);const t=termosProduto(p.nome),ts=new Set(t.split(' ')),comuns=[...tokens].filter(v=>ts.has(v)).length,conflitos=conflitosProdutos(entrada,p),gtin=gtinValido(entrada.gtin)&&entrada.gtin===p.gtin;const score=(gtin?3:0)+(n===t?2:0)+comuns/Math.max(tokens.size,ts.size,1)+(comuns||n.slice(0,2)===t.slice(0,2)?1-distancia(n,t)/Math.max(n.length,t.length,1):0)*.5+(alias?3:0);return{produto:p,score,conflitos,motivo:alias?'Alias confirmado no grupo':gtin?'GTIN válido coincidente':n===t?'Descrição normalizada coincidente':'Semelhança textual — confirme a apresentação'};}).filter(x=>x.score>=.55).sort((a,b)=>Number(!!a.conflitos.length)-Number(!!b.conflitos.length)||b.score-a.score||a.produto.nome.localeCompare(b.produto.nome)).slice(0,limite);
}
export function chaveApresentacao(p){const a=atributosProduto(p);return JSON.stringify([a.medidas,a.packs,a.formas,a.dosagem,termosProduto(p.apresentacao).replace(/\d+(?:\.\d+)?\s*(kg|g|mg|mcg|l|ml|m|cm)\b/g,'medida').replace(/\bgarrafa\b|\bpacote\b|\bcaixa\b/g,m=>m)]);}
