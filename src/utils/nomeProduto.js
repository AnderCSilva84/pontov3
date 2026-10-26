export const nomeProduto=valor=>String(valor||'').trim().toLocaleUpperCase('pt-BR');
export function nomesProdutosMaiusculos(dado){return {...dado,...Object.fromEntries(['nome','nomeSnapshot','nomeCanonico'].filter(k=>typeof dado[k]==='string').map(k=>[k,nomeProduto(dado[k])]))};}
