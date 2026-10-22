const { HttpsError } = require('firebase-functions/v2/https');
const { FieldValue } = require('firebase-admin/firestore');
const { isDeepStrictEqual } = require('node:util');
async function pagarEspecial(db, dados, uid) {
  if (!uid) throw new HttpsError('unauthenticated','Entre no app.');
  if (dados.conferido !== true) throw new HttpsError('failed-precondition','Confira as verbas e retenções no eSocial antes de registrar.');
  if (!/^[\w-]{16,80}$/.test(dados.chaveOperacao || '') || !/^[\w-]{1,128}$/.test(dados.funcionarioId || '')) throw new HttpsError('invalid-argument','Reabra o formulário e selecione a funcionária.');
  const data = dados.dataPagamento;
  if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data) || !Number.isFinite(Date.parse(data)) || new Date(data+'T12:00:00Z').toISOString().slice(0,10) !== data) throw new HttpsError('invalid-argument','Data de pagamento inválida.');
  const permitidos = ['salario','mediaVariaveis','admissao','dataReferencia','parcela','avos13','avosFerias','avosAutomaticos','adiantado','outrosDescontos','irrf','diasFerias','diasAbono','periodoInicio','periodoFim','dataDesligamento','inicioAquisitivo','diasSaldo','diasFeriasVencidas','feriasEmDobro','motivo','aviso','avisoAutomatico','diasAviso'];
  const entrada = Object.fromEntries(permitidos.filter(c=>dados.calculoEspecial?.[c] !== undefined).map(c=>[c,dados.calculoEspecial[c]]));
  if (Object.values(entrada).some(v=>!['boolean','number','string'].includes(typeof v) || typeof v==='string' && v.length > 100)) throw new HttpsError('invalid-argument','Dados de cálculo inválidos.');
  entrada.competencia = dados.competenciaMes;
  let calculo;
  try { calculo = (await import('./folha-calculos.mjs')).calcularEspecial(dados.tipo,entrada); }
  catch(e) { throw new HttpsError('invalid-argument',e.message); }
  if (calculo.proventos <= 0) throw new HttpsError('invalid-argument','Não há valor para registrar.');
  return db.runTransaction(async tx=>{
    const perfil = (await tx.get(db.doc(`users/${uid}`))).data();
    if(perfil?.role!=='admin' || perfil.ativo===false) throw new HttpsError('permission-denied','Acesso restrito ao administrador.');
    const f = (await tx.get(db.doc(`funcionarios/${dados.funcionarioId}`))).data();
    if(!f) throw new HttpsError('not-found','Funcionária não encontrada.');
    const ref = db.doc(`financeiro/especial_${uid}_${dados.chaveOperacao}`), anterior = (await tx.get(ref)).data();
    const registro = { tipo:dados.tipo, tipoLabel:{decimo_terceiro:'13º salário',ferias:'Férias',rescisao:'Rescisão'}[dados.tipo], valor:calculo.proventos, proventos:calculo.proventos, descontos:calculo.descontos, valorLiquido:calculo.liquido, inss:calculo.inss, funcionarioId:dados.funcionarioId, funcionarioNome:f.nome||'', dataPagamento:data, competenciaMes:dados.competenciaMes, calculoEspecial:entrada, detalhamento:calculo.linhas, conferidoPor:uid, criadoPor:uid, descricao:String(dados.descricao||'').trim().slice(0,300) };
    if(anterior) {
      const {criadoEm,...salvo}=anterior; void criadoEm;
      if(!isDeepStrictEqual(salvo,registro)) throw new HttpsError('already-exists','Esta operação já foi registrada com outros dados. Reabra o formulário.');
      return {id:ref.id};
    }
    tx.create(ref,{...registro,criadoEm:FieldValue.serverTimestamp()}); return {id:ref.id};
  });
}
module.exports={pagarEspecial};
