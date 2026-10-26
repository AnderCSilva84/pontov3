// O rascunho não contém senha/token e só é retomado pela mesma sessão/projeto.
export function criarCadastroTitular({sessao,criarConta,criarGrupo,armazenamento,projeto,alterado=()=>{}}) {
  const chave=uid=>`ap1303-cadastro:${projeto}:${uid}`;
  const pendente=()=>{
    const uid=sessao()?.uid;if(!uid)return null;
    try { const r=JSON.parse(armazenamento.getItem(chave(uid)));return r?.uid===uid&&typeof r.nome==='string'&&typeof r.nomeGrupo==='string'?r:null; }
    catch{return null;}
  };
  let emAndamento;
  function cadastrar(dados) {
    if(emAndamento)return emAndamento;
    emAndamento=executar(dados).finally(()=>{emAndamento=null;});return emAndamento;
  }
  async function executar({nome,nomeGrupo,email,senha}={}) {
    let etapa='auth';
    try {
      const anterior=pendente();nome=nome||anterior?.nome;nomeGrupo=nomeGrupo||anterior?.nomeGrupo;
      if(!nome?.trim()||!nomeGrupo?.trim())throw Object.assign(Error('Informe seu nome e o nome do grupo.'),{code:'cadastro/dados-incompletos'});
      let user=sessao();
      if(user&&email&&user.email?.toLowerCase()!==email.trim().toLowerCase())throw Object.assign(Error('Há outra conta conectada. Saia dela antes de iniciar outro cadastro.'),{code:'cadastro/sessao-diferente'});
      if(!user)user=(await criarConta(email,senha)).user;
      const uid=user.uid;
      const rascunho={uid,nome:nome.trim(),nomeGrupo:nomeGrupo.trim()};
      try{armazenamento.setItem(chave(uid),JSON.stringify(rascunho));}catch{/* A sessão ainda permite retomar informando apenas os nomes. */}
      alterado();
      etapa='grupo';
      if(sessao()?.uid!==uid)throw Object.assign(Error('A sessão mudou. Entre novamente na conta do cadastro.'),{code:'cadastro/sessao-diferente'});
      // criarGrupo já usa g_UID e transação idempotente; não faz leitura prévia.
      const resultado=await criarGrupo({nome:rascunho.nome,nomeGrupo:rascunho.nomeGrupo});
      try{armazenamento.removeItem(chave(uid));}catch{/* Não interfere no recibo remoto. */}
      alterado();return resultado;
    } catch(e){e.etapaCadastro=etapa;throw e;}
  }
  return {cadastrar,pendente};
}
