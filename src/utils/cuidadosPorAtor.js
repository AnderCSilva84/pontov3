export function atorDoLembrete(lembrete,cuidados=[]){
 const cadastro=cuidados.find(c=>c.id===lembrete.cuidadoId);
 const tipo=cadastro?.tipo||lembrete.destinatarioCuidado||'adulto';
 const nome=cadastro?.nome||lembrete.nomeCuidado||'Nome não informado';
 return {id:lembrete.cuidadoId?'cadastro:'+lembrete.cuidadoId:'anterior:'+JSON.stringify([tipo,nome]),nome,tipo,grupo:['cao','gato'].includes(tipo)?'pets':'pessoas'};
}
export function listarAtoresCuidados(cuidados,lembretes,grupo){
 const atores=new Map();
 for(const c of cuidados){const ator=atorDoLembrete({cuidadoId:c.id},cuidados);if(ator.grupo===grupo)atores.set(ator.id,{...ator,quantidade:0});}
 for(const l of lembretes){const ator=atorDoLembrete(l,cuidados);if(ator.grupo!==grupo)continue;const existente=atores.get(ator.id);atores.set(ator.id,{...ator,quantidade:(existente?.quantidade||0)+1});}
 return [...atores.values()].sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR')||a.id.localeCompare(b.id));
}
