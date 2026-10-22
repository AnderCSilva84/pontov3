const { HttpsError } = require('firebase-functions/v2/https')
const { getFirestore } = require('firebase-admin/firestore')
const { getAuth } = require('firebase-admin/auth')
const { createNoBolsoBridge } = require('./no-bolso-bridge.cjs')
const { bancoDoUsuario } = require('./grupos-contexto.cjs')
const bridge = () =>
  createNoBolsoBridge({
    db: getFirestore(),
    bancoDaOrigem: uid => bancoDoUsuario(getFirestore(), uid),
    pilotUid: process.env.NO_BOLSO_PILOT_UID ?? '',
    pilotUids: (process.env.NO_BOLSO_PILOT_UIDS ?? '')
      .split(',')
      .map((uid) => uid.trim())
      .filter(Boolean),
    assertAuthUser: async (uid) => {
      const user = await getAuth().getUser(uid)
      if (user.disabled)
        throw Object.assign(new Error('Conta AP1303 indisponível.'), { status: 403 })
    },
  })
exports.handleNoBolsoGrant = async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Entre no AP1303.')
  const currentUser = await getAuth().getUser(request.auth.uid)
  if (
    currentUser.disabled ||
    !Number.isFinite(request.auth.token?.auth_time) ||
    Math.floor(Date.parse(currentUser.tokensValidAfterTime) / 1000) >
      request.auth.token.auth_time
  )
    throw new HttpsError(
      'permission-denied',
      'Entre novamente no AP1303 antes de vincular.',
    )
  const data = request.data
  if (
    !data ||
    Object.keys(data).some((key) => !['operacao', 'noBolsoUid'].includes(key)) ||
    (data.operacao === 'noBolsoRevogar' && data.noBolsoUid !== undefined) ||
    !['noBolsoGerarCodigo', 'noBolsoRevogar'].includes(data.operacao)
  )
    throw new HttpsError('invalid-argument', 'Operação inválida.')
  try {
    return data.operacao === 'noBolsoGerarCodigo'
      ? await bridge().grantFor(request.auth.uid, data.noBolsoUid)
      : await bridge().revokeFromAP(request.auth.uid)
  } catch (error) {
    throw new HttpsError(
      error.status === 409
        ? 'failed-precondition'
        : error.status === 403
          ? 'permission-denied'
          : 'unavailable',
      error.status ? error.message : 'Não foi possível preparar a conexão.',
    )
  }
}
// Call only AFTER the existing comprasApi service-account verification.
exports.handleNoBolsoRoute = async function (req, res) {
  if (!req.path.startsWith('/v1/no-bolso/')) return false
  const api = bridge()
  const keys = Object.keys(req.query || {})
  let result
  if (
    req.path === '/v1/no-bolso/status' &&
    req.method === 'GET' &&
    keys.length === 1 &&
    keys[0] === 'noBolsoUid'
  ) {
    const people = await api.resolve(req.query.noBolsoUid)
    result = { linked: Boolean(people), sourceCount: people?.length ?? 0, maxSources: 2 }
  } else if (
    req.path === '/v1/no-bolso/resumo' &&
    req.method === 'GET' &&
    keys.length === 2 &&
    keys.every((key) => ['noBolsoUid', 'mes'].includes(key))
  )
    result = await api.summary(req.query.noBolsoUid, req.query.mes)
  else if (
    req.method === 'POST' &&
    keys.length === 0 &&
    req.body &&
    !Array.isArray(req.body)
  ) {
    const bodyKeys = Object.keys(req.body)
    if (
      req.path === '/v1/no-bolso/vincular' &&
      bodyKeys.length === 2 &&
      bodyKeys.every((key) => ['noBolsoUid', 'codigo'].includes(key))
    )
      result = await api.redeem(req.body.noBolsoUid, req.body.codigo)
    else if (
      req.path === '/v1/no-bolso/desvincular' &&
      bodyKeys.length === 1 &&
      bodyKeys[0] === 'noBolsoUid'
    )
      result = await api.unlink(req.body.noBolsoUid)
  }
  if (!result)
    throw Object.assign(new Error('Consulta de conexão inválida.'), { status: 400 })
  res.json(result)
  return true
}
