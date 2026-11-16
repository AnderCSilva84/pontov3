const { transferenciaAutomatica } = require('./titularidade.cjs');
const {HttpsError}=require('firebase-functions/v2/https');
const {FieldValue}=require('firebase-admin/firestore');
const {bancoDoGrupo,grupoValido}=require('./grupos-contexto.cjs');
const falha=(c,m)=>{throw new HttpsError(c,m);};
const {publico,autorizarExclusao,processarExclusao}=require('./conta-exclusao.cjs');
async function operarConta(raiz,auth,request,agora=Date.now()) {
  const uid=request.auth?.uid,d=request.data||{};
  if(!uid)falha('unauthenticated','Entre na própria conta para continuar.');
  if(['fotoPerfilConsultar','fotoPerfilSalvar','fotoPerfilRemover'].includes(d.acao))return require('./foto-perfil.cjs').operarFoto(raiz,request);
  if(Object.keys(d).some(k=>!['acao','confirmacao','pendencias','destinatario','encerrarGrupoVazio'].includes(k)))falha('invalid-argument','Dados de solicitação inválidos. O titular é definido pela sessão.');
  const ref=raiz.doc(`contaSolicitacoes/${uid}`);
  // Consultar a própria solicitação continua permitido se o perfil foi removido:
  // não fornece acesso a dados do grupo nem aceita UID escolhido pelo cliente.
  if(d.acao==='status')return {solicitacao:publico(await ref.get())};
  if(!['solicitar','administradores','transferir','concluir'].includes(d.acao))falha('invalid-argument','Ação inválida.');
  const registro=await auth.getUser(uid).catch(e=>{if(e.code==='auth/user-not-found')falha('unauthenticated','A conta não está mais disponível.');throw e;});
  if(registro.disabled)falha('permission-denied','A conta está inativa. Entre em contato com o responsável para acompanhar sua solicitação.');
  if(d.acao!=='administradores'&&(!Number.isFinite(request.auth.token?.auth_time)||Math.abs(agora/1000-request.auth.token.auth_time)>300))falha('failed-precondition','Confirme sua identidade novamente antes de continuar.');
  if(['solicitar','concluir'].includes(d.acao)&&d.confirmacao!==true)falha('invalid-argument','Confirme explicitamente a solicitação.');
  if(['solicitar','concluir'].includes(d.acao)&&d.pendencias!==null&&(!d.pendencias||typeof d.pendencias!=='object'||Array.isArray(d.pendencias)||Object.keys(d.pendencias).length!==5||Object.keys(d.pendencias).some(k=>!['onlineIncerto','offlineNaoEnviado','recebidas','conflitos','confirmadas'].includes(k))||Object.values(d.pendencias).some(n=>!Number.isInteger(n)||n<0||n>200)))falha('invalid-argument','Confira o resumo das pendências locais.');
  if(d.acao==='concluir'){
    await autorizarExclusao(raiz,uid,d,{auth});
    return processarExclusao(raiz,auth,uid);
  }
  return raiz.runTransaction(async tx=>{
    const v=await tx.get(raiz.doc(`vinculosUsuarios/${uid}`));
    const gid=v.data()?.grupoId;
    if(v.exists&&(v.data().ativo!==true||!grupoValido(gid)))falha('permission-denied','Vínculo sem acesso.');
    const db=gid?bancoDoGrupo(raiz,gid):raiz;
    const [perfil,grupo,anterior]=await tx.getAll(db.doc(`users/${uid}`),raiz.doc(gid?`grupos/${gid}`:`grupos/g_${uid}`),ref);
    if(perfil.exists&&perfil.data().ativo===false||gid&&(!grupo.exists||grupo.data().ativo!==true||!perfil.exists))falha('permission-denied','Perfil sem acesso.');
    if(d.acao==='administradores'){
      if(!gid||grupo.data().titularUid!==uid)falha('permission-denied','Somente o titular pode transferir a administração.');
      const comercial = grupo.data().assinaturasAtivas === true;
      const assinatura = comercial ? (await tx.get(raiz.doc('assinaturasGrupos/' + gid))).data() : null;
      if (comercial && !transferenciaAutomatica(assinatura, agora)) return { administradores: [], limitado: false, assistida: true, mensagem: 'Transferência com cobrança paga exige atendimento assistido. Dados e assinatura permanecem preservados.' };
      const consulta = comercial ? db.collection('users').where('ativo','==',true) : db.collection('users').where('role','==','admin').where('ativo','==',true);
      const lista=await tx.get(consulta.limit(21));
      return {administradores:lista.docs.filter(s=>s.id!==uid).slice(0,20).map(s=>({uid:s.id,nome:s.data().nome||'Administrador'})),limitado:lista.size===21};
    }
    if(d.acao==='transferir'){
      if(anterior.data()?.etapa)falha('failed-precondition','A exclusão já iniciou. Não é possível transferir neste estado.');
      if(anterior.data()?.grupoId!==gid)falha('failed-precondition','A solicitação pertence a outro contexto. Solicite revisão antes de transferir.');
      if(anterior.exists&&anterior.data().transferidaPara===d.destinatario&&grupo.data()?.titularUid===d.destinatario)return {transferida:true,repetida:true};
      if(!anterior.exists||!gid||grupo.data().titularUid!==uid||d.confirmacao!==true||typeof d.destinatario!=='string'||!/^[\w-]{1,128}$/.test(d.destinatario)||d.destinatario===uid)falha('permission-denied','Transferência não autorizada.');
      const comercial = grupo.data().assinaturasAtivas === true;
      if (comercial && !transferenciaAutomatica((await tx.get(raiz.doc('assinaturasGrupos/' + gid))).data(), agora)) falha('failed-precondition', 'Transferência com cobrança paga exige atendimento assistido. A assinatura existente não foi alterada.');
      const destino=await tx.get(db.doc(`users/${d.destinatario}`));
      const vinculoDestino=await tx.get(raiz.doc(`vinculosUsuarios/${d.destinatario}`));
      if((comercial ? !['admin','funcionario','consulta'].includes(destino.data()?.role) : destino.data()?.role!=='admin')||destino.data()?.ativo!==true||vinculoDestino.data()?.ativo!==true||vinculoDestino.data()?.grupoId!==gid)falha('failed-precondition','Escolha um administrador ativo deste grupo.');
      const identidadeDestino=await auth.getUser(d.destinatario).catch(()=>null);
      if(!identidadeDestino||identidadeDestino.disabled)falha('failed-precondition','O administrador escolhido precisa ter uma conta Auth ativa.');
      if (comercial) {
        const exclusaoDestino = await tx.get(raiz.doc('contaSolicitacoes/' + d.destinatario));
        if (exclusaoDestino.exists) falha('failed-precondition', 'O destinatário possui solicitação de exclusão; escolha outra pessoa.');
        if (destino.data().funcionarioId) {
          const dias = await tx.get(db.collection('dias').where('funcionarioId','==',destino.data().funcionarioId));
          if (dias.docs.some(dia => dia.data().entrada && !dia.data().saida)) falha('failed-precondition', 'O destinatário deve concluir suas jornadas abertas antes da transferência.');
        }
        tx.update(destino.ref,{role:'admin',permissions:{accessPonto:true,accessAdmin:true,manageUsers:true,createTasks:true,realizarCompras:true},acessoCompartilhado:true});
        tx.update(perfil.ref,{role:'consulta',permissions:{accessPonto:false,accessAdmin:true,manageUsers:false,createTasks:false,realizarCompras:false},acessoCompartilhado:false});
        tx.delete(raiz.doc('pontoTitularConfiguracao/' + gid));
        tx.create(db.collection('usuariosAuditoria').doc(),{acao:'transferencia_titular_free',executadoPor:uid,novoTitularUid:d.destinatario,executadoEm:FieldValue.serverTimestamp()});
      }
      tx.update(grupo.ref,{titularUid:d.destinatario,revisaoConta:FieldValue.increment(1)});
      if(anterior.exists)tx.update(ref,{status:'aguardando_analise',motivos:anterior.data().motivos.filter(m=>!['ultimo_administrador','transferir_titularidade'].includes(m)),transferidaEm:FieldValue.serverTimestamp(),transferidaPara:d.destinatario,atualizadoEm:FieldValue.serverTimestamp()});
      return {transferida:true};
    }
    if(anterior.exists)return {solicitacao:publico(anterior),repetida:true};
    const motivos=[];
    if(gid&&perfil.data()?.role==='admin'){
      const admins=await tx.get(db.collection('users').where('role','==','admin').where('ativo','==',true).limit(2));
      const membros=await tx.get(db.collection('users').limit(2));
      if(admins.size===1&&membros.size>1)motivos.push('ultimo_administrador');
      if(grupo.data().titularUid===uid)motivos.push('transferir_titularidade');
    }
    if(d.pendencias===null)motivos.push('fila_local_nao_verificada');
    if(d.pendencias?.onlineIncerto)motivos.push('online_incerto');
    if(d.pendencias?.offlineNaoEnviado)motivos.push('capturas_locais');
    if(d.pendencias?.recebidas)motivos.push('pendencias_remotas');
    // Sem política aprovada não se pode provar ausência de referências históricas
    // apenas pela falta de perfil/vínculo. Também contas sem cadastro ficam em análise.
    const doc={uid,grupoId:gid||null,status:'aguardando_analise',motivos,pendenciasDeclaradas:d.pendencias,criadoEm:FieldValue.serverTimestamp(),atualizadoEm:FieldValue.serverTimestamp(),versao:1};
    tx.create(ref,doc);
    return {solicitacao:{protocolo:uid,status:doc.status,motivos,grupoId:gid||null}};
  });
}
module.exports={operarConta};
