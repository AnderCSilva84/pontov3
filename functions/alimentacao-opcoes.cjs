function validarOpcoes(opcoes){
 if(!Array.isArray(opcoes)||!opcoes.length||opcoes.length>20)throw Error('Cadastre de 1 a 20 linhas de alimentos em cada refeição.');
 const linhas=opcoes.map(o=>{
  if(!o||typeof o!=='object'||typeof o.id!=='string'||! /^[\w-]{1,100}$/.test(o.id))throw Error('Linha de alimento inválida.');
  const descricao=typeof o.descricao==='string'?o.descricao.trim():'';
  if(!descricao||descricao.length>240)throw Error('Preencha o alimento ou opção em cada linha (até 240 caracteres).');
  let choGramas=null;
  if(o.choGramas!==undefined&&o.choGramas!==null&&o.choGramas!==''){
   const valor=typeof o.choGramas==='string'?o.choGramas.trim().replace(',','.'):o.choGramas;
   if(!['string','number'].includes(typeof valor)||!/^\d+(?:\.\d{1,2})?$/.test(String(valor)))throw Error('Informe o CHO em gramas com até duas casas decimais, ou deixe em branco.');
   choGramas=Number(valor);
   if(!Number.isFinite(choGramas)||choGramas<0||choGramas>10000)throw Error('O CHO deve estar entre 0 e 10.000 g.');
  }
  return {id:o.id,descricao,choGramas};
 });
 if(new Set(linhas.map(o=>o.id)).size!==linhas.length)throw Error('As linhas da refeição não podem ter identificadores repetidos.');
 return linhas;
}
function resumoOpcoes(opcoes){
 const texto=opcoes.map(o=>o.descricao+(o.choGramas===null?'':` (CHO: ${String(o.choGramas).replace('.',',')} g)`)).join('; ');
 return texto.length>240?texto.slice(0,239)+'…':texto;
}
function validarChoRefeicao(r){
 const choModo=r.choModo??'linhas';
 if(!['linhas','total'].includes(choModo))throw Error('Escolha CHO por alimento ou total da refeição.');
 const choTotalGramas=validarOpcoes([{id:'total',descricao:'Total',choGramas:r.choTotalGramas}])[0].choGramas;
 return {choModo,choTotalGramas};
}
function resumoRefeicao(opcoes,cho){
 if(cho.choModo!=='total')return resumoOpcoes(opcoes);
 const fim=cho.choTotalGramas===null?'':` · CHO total da refeição: ${String(cho.choTotalGramas).replace('.',',')} g`;
 const texto=opcoes.map(o=>o.descricao).join('; '),limite=240-fim.length;
 return (texto.length>limite?texto.slice(0,limite-1)+'…':texto)+fim;
}
module.exports={validarOpcoes,resumoOpcoes,validarChoRefeicao,resumoRefeicao};
