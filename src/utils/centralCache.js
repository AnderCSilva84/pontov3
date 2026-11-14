export const VALIDADE_CENTRAL=15*60*1000;
export function criarCacheCentral({consultar,storage,agora=Date.now,online=()=>true}){
 let conta=null,geracao=0;const pendentes=new Map();const chave='ap1303-central-cache-v1';
 let dados={};try{const salvo=JSON.parse(storage?.getItem(chave)||'{}');if(typeof salvo.conta==='string'&&salvo.entradas&&typeof salvo.entradas==='object'){conta=salvo.conta;dados=salvo.entradas;}}catch{/* Cache indisponível não bloqueia consulta. */}
 function limpar(){geracao++;dados={};pendentes.clear();try{storage?.removeItem(chave);}catch{/* Apenas cache. */}}
 function sessao(id){if(conta!==id){limpar();conta=id;}}
 async function buscar(pedido){
  if(!conta)throw new Error('Entre no app para consultar.');
  const k=JSON.stringify(pedido),salvo=dados[k],g=geracao;
  if(salvo&&(agora()-salvo.salvoMs<VALIDADE_CENTRAL||!online()))return {...salvo.resposta,salvoMs:salvo.salvoMs,cache:true,desatualizado:agora()-salvo.salvoMs>=VALIDADE_CENTRAL,offline:!online()};
  if(!online())throw new Error('Sem conexão e sem resultado salvo para esta busca.');
  if(!pendentes.has(k)){
   const p=Promise.resolve().then(()=>consultar(pedido)).then(resposta=>{
    if(g!==geracao)throw new Error('A conta mudou. Faça a busca novamente.');
    dados[k]={resposta,salvoMs:agora()};const entradas=Object.entries(dados).sort((a,b)=>b[1].salvoMs-a[1].salvoMs).slice(0,20);dados=Object.fromEntries(entradas);
    try{const json=JSON.stringify({conta,entradas:dados});if(json.length<400000)storage?.setItem(chave,json);}catch{/* Sem espaço: manter em memória. */}
    return {...resposta,salvoMs:agora(),cache:false,offline:false,desatualizado:false};
   }).catch(e=>{if(g!==geracao)throw e;if(salvo&&(!online()||/unavailable|deadline-exceeded|network/.test(e.code||'')))return {...salvo.resposta,salvoMs:salvo.salvoMs,cache:true,desatualizado:true,offline:true};throw e;}).finally(()=>{if(g===geracao)pendentes.delete(k);});pendentes.set(k,p);
  }
  return pendentes.get(k);
 }
 return {sessao,limpar,buscar};
}
