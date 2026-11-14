import {conflitosProdutos} from './produtos-identidade.mjs';

export function politicaMesclaManual(produtos,principalId,tipoCompra){
 const principal=produtos.find(p=>p.id===principalId);
 const conflitos=produtos.flatMap(p=>conflitosProdutos(principal,p).map(mensagem=>({produtoId:p.id,mensagem})));
 const unidades=new Set(produtos.map(p=>p.unidadeCompra));
 const unidadeValida=unidades.size===1&&['un','kg','l','m'].includes(principal.unidadeCompra);
 const podeReunirVariacoes=tipoCompra!=='farmacia'&&unidadeValida;
 return {conflitos,podeReunirVariacoes,bloqueada:conflitos.length>0&&!podeReunirVariacoes};
}
