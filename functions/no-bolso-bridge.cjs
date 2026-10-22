// Installed in AP1303/functions. This module never trusts a browser-supplied buyer.
const { randomBytes, createHash, timingSafeEqual } = require('node:crypto')
const problem = (status, message) => Object.assign(new Error(message), { status })
const hash = (value) => createHash('sha256').update(value).digest('hex')
const millis = (value) =>
  value?.toMillis?.() ?? (value instanceof Date ? value.getTime() : NaN)
const validId = (value) => typeof value === 'string' && /^[\w-]{1,128}$/.test(value)
const active = (profile) =>
  profile &&
  profile.ativo !== false &&
  ['admin', 'funcionario', 'funcionaria'].includes(profile.role)
const monthOf = (date) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Fortaleza',
      year: 'numeric',
      month: '2-digit',
    })
      .formatToParts(date)
      .map((v) => [v.type, v.value]),
  )
  return `${p.year}-${p.month}`
}
function monthRange(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw problem(400, 'Mês inválido.')
  const [year, m] = month.split('-').map(Number)
  if (year < 1900 || year > 9998) throw problem(400, 'Ano inválido.')
  const label = (offset) => {
    const date = new Date(Date.UTC(year, m - 1 + offset, 1, 12))
    return date.toISOString().slice(0, 7)
  }
  return {
    months: [-2, -1, 0].map(label),
    from: new Date(`${label(-2)}-01T00:00:00-03:00`),
    until: new Date(`${label(1)}-01T00:00:00-03:00`),
  }
}
function createNoBolsoBridge({
  db,
  bancoDaOrigem = async () => db,
  assertAuthUser,
  now = Date.now,
  pilotUid = '',
  pilotUids = [],
}) {
  const recipients = [...new Set([pilotUid, ...pilotUids].filter(Boolean))]
  if (recipients.length > 2 || recipients.some((uid) => !validId(uid)))
    throw problem(403, 'Configuração piloto inválida.')
  const ownersOf = (value) => {
    const ids = value?.noBolsoUids ?? (value?.noBolsoUid ? [value.noBolsoUid] : [])
    if (
      !Array.isArray(ids) ||
      ids.length > 2 ||
      new Set(ids).size !== ids.length ||
      ids.some((uid) => !validId(uid))
    )
      throw problem(409, 'Vínculo inconsistente; solicite revisão.')
    return ids
  }
  const requirePilot = (uid) => {
    if (!validId(uid)) throw problem(400, 'Conta inválida.')
    if (!recipients.includes(uid))
      throw problem(
        403,
        'Compras pessoais disponíveis somente para a conta piloto autorizada.',
      )
  }
  const sourcesOf = (value) => {
    const ids = value?.apUids ?? (value?.apUid ? [value.apUid] : [])
    if (
      !Array.isArray(ids) ||
      ids.length > 2 ||
      ids.some((id) => !validId(id)) ||
      new Set(ids).size !== ids.length
    )
      throw problem(409, 'Vínculo inconsistente; solicite revisão.')
    return ids
  }
  const link = (uid) => db.doc(`noBolsoLinks/${uid}`)
  const reverse = (uid) => db.doc(`noBolsoOwners/${uid}`)
  const grant = (uid) => db.doc(`noBolsoGrants/${uid}`)
  async function grantFor(uid, recipient = pilotUid) {
    if (!recipients.length) throw problem(403, 'Vinculação pessoal desligada.')
    requirePilot(recipient)
    if (!validId(uid)) throw problem(401, 'Entre no AP1303.')
    await assertAuthUser(uid)
    const origem = await bancoDaOrigem(uid)
    const secret = randomBytes(24).toString('base64url')
    await db.runTransaction(async (tx) => {
      const profile = (await tx.get(origem.doc(`users/${uid}`))).data()
      const owner = await tx.get(reverse(uid))
      if (!active(profile)) throw problem(403, 'Conta AP1303 indisponível.')
      if (ownersOf(owner.data()).includes(recipient))
        throw problem(409, 'Esta conta já está vinculada ao destinatário informado.')
      tx.set(grant(uid), {
        hash: hash(secret),
        expiresAt: new Date(now() + 600000),
        createdAt: new Date(now()),
        recipient,
      })
    })
    return { code: `${uid}.${secret}`, expiresAt: new Date(now() + 600000).toISOString() }
  }
  async function redeem(noBolsoUid, code) {
    requirePilot(noBolsoUid)
    if (!validId(noBolsoUid) || typeof code !== 'string' || code.length > 200)
      throw problem(400, 'Código inválido.')
    const [uid, secret, extra] = code.split('.')
    if (!validId(uid) || !/^[\w-]{32}$/.test(secret ?? '') || extra !== undefined)
      throw problem(400, 'Código inválido.')
    await assertAuthUser(uid)
    const origem = await bancoDaOrigem(uid)
    await db.runTransaction(async (tx) => {
      const source = await tx.get(grant(uid))
      const owner = await tx.get(reverse(uid))
      const target = await tx.get(link(noBolsoUid))
      const profile = (await tx.get(origem.doc(`users/${uid}`))).data()
      const value = source.data()
      if (
        !active(profile) ||
        !value ||
        (value.recipient ?? pilotUid) !== noBolsoUid ||
        !Number.isFinite(millis(value.expiresAt)) ||
        millis(value.expiresAt) <= now() ||
        !/^[a-f0-9]{64}$/.test(value.hash ?? '') ||
        !timingSafeEqual(Buffer.from(value.hash, 'hex'), Buffer.from(hash(secret), 'hex'))
      )
        throw problem(403, 'Código expirado ou inválido. Gere outro no AP1303.')
      const ids = sourcesOf(target.data())
      const owners = ownersOf(owner.data())
      if (!owners.includes(noBolsoUid) && owners.length >= 2)
        throw problem(409, 'Limite de destinatários atingido.')
      if (!ids.includes(uid) && ids.length >= 2)
        throw problem(409, 'O piloto permite no máximo duas contas AP1303.')
      tx.set(link(noBolsoUid), {
        apUids: [...new Set([...ids, uid])],
        createdAt: target.data()?.createdAt ?? new Date(now()),
      })
      tx.set(reverse(uid), { noBolsoUids: [...new Set([...owners, noBolsoUid])] })
      tx.delete(grant(uid))
    })
    return { linked: true }
  }
  async function unlink(noBolsoUid, expectedAPUid) {
    if (!validId(noBolsoUid)) throw problem(400, 'Conta inválida.')
    await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(link(noBolsoUid))
      if (!snapshot.exists) return
      const ids = sourcesOf(snapshot.data())
      if (expectedAPUid && !ids.includes(expectedAPUid))
        throw problem(409, 'O vínculo mudou. Atualize antes de revogar.')
      const removing = expectedAPUid ? [expectedAPUid] : ids
      const owners = await Promise.all(removing.map((uid) => tx.get(reverse(uid))))
      if (
        owners.some(
          (owner) => !owner.exists || !ownersOf(owner.data()).includes(noBolsoUid),
        )
      )
        throw problem(409, 'Vínculo inconsistente; solicite revisão.')
      const remaining = ids.filter((uid) => !removing.includes(uid))
      if (remaining.length)
        tx.set(link(noBolsoUid), {
          apUids: remaining,
          createdAt: snapshot.data().createdAt,
        })
      else tx.delete(link(noBolsoUid))
      for (const [index, uid] of removing.entries()) {
        const remainingOwners = ownersOf(owners[index].data()).filter(
          (id) => id !== noBolsoUid,
        )
        if (remainingOwners.length) tx.set(reverse(uid), { noBolsoUids: remainingOwners })
        else tx.delete(reverse(uid))
        tx.delete(grant(uid))
      }
    })
    return { linked: false }
  }
  async function revokeFromAP(uid) {
    await assertAuthUser(uid)
    const snapshot = await reverse(uid).get()
    if (!snapshot.exists) {
      await grant(uid).delete()
      return { linked: false }
    }
    for (const recipient of ownersOf(snapshot.data())) await unlink(recipient, uid)
    return { linked: false }
  }
  async function resolve(noBolsoUid) {
    requirePilot(noBolsoUid)
    if (!validId(noBolsoUid)) throw problem(400, 'Conta inválida.')
    const snapshot = await link(noBolsoUid).get()
    if (!snapshot.exists) return null
    const ids = sourcesOf(snapshot.data())
    if (!ids.length) return null
    const people = []
    for (const uid of ids) {
      await assertAuthUser(uid)
      const origem = await bancoDaOrigem(uid)
      const [profile, owner] = await Promise.all([
        origem.doc(`users/${uid}`).get(),
        reverse(uid).get(),
      ])
      if (!active(profile.data()) || !ownersOf(owner.data()).includes(noBolsoUid))
        throw problem(403, 'Conta AP1303 indisponível; resumo conjunto não calculado.')
      const name = profile.data().nome ?? profile.data().name
      people.push({
        uid,
        label:
          typeof name === 'string' && name.trim()
            ? name.trim().slice(0, 80)
            : `Conta ${people.length + 1}`,
      })
    }
    return people
  }
  async function summary(noBolsoUid, month) {
    const range = monthRange(month)
    const people = await resolve(noBolsoUid)
    if (!people) return { linked: false, months: [] }
    const totals = new Map(
      range.months.map((month) => [month, { month, totalCentavos: 0, compras: 0 }]),
    )
    const contributors = []
    let count = 0
    for (const { uid, label } of people) {
      const origem = await bancoDaOrigem(uid)
      const snap = await origem
        .collection('comprasListas')
        .where('finalizadaPor', '==', uid)
        .where('status', '==', 'finalizada')
        .where('finalizadaEm', '>=', range.from)
        .where('finalizadaEm', '<', range.until)
        .orderBy('finalizadaEm')
        .limit(301 - count)
        .get()
      count += snap.size
      if (count > 300)
        throw problem(422, 'Resumo excede 300 compras. Solicite um resumo agregado.')
      const personal = new Map(
        range.months.map((month) => [month, { month, totalCentavos: 0, compras: 0 }]),
      )
      for (const doc of snap.docs) {
        const value = doc.data()
        if (
          value.finalizadaPor !== uid ||
          value.status !== 'finalizada' ||
          !Number.isSafeInteger(value.totalCentavos) ||
          value.totalCentavos < 0 ||
          !Number.isFinite(millis(value.finalizadaEm))
        )
          throw problem(422, 'Compra inválida; resumo não calculado.')
        const row = personal.get(monthOf(new Date(millis(value.finalizadaEm))))
        if (
          !row ||
          millis(value.finalizadaEm) < range.from.getTime() ||
          millis(value.finalizadaEm) >= range.until.getTime()
        )
          throw problem(422, 'Data fora do período.')
        row.totalCentavos += value.totalCentavos
        row.compras++
        if (!Number.isSafeInteger(row.totalCentavos))
          throw problem(422, 'Total fora do intervalo seguro.')
      }
      for (const row of personal.values()) {
        const total = totals.get(row.month)
        total.totalCentavos += row.totalCentavos
        total.compras += row.compras
        if (!Number.isSafeInteger(total.totalCentavos))
          throw problem(422, 'Total fora do intervalo seguro.')
      }
      contributors.push({ label, months: [...personal.values()] })
    }
    return {
      linked: true,
      complete: true,
      months: [...totals.values()],
      contributors,
      consultedAt: new Date(now()).toISOString(),
      dateBasis: 'finalizadaEm',
      ownerBasis: 'finalizadaPor',
      source: 'AP1303',
    }
  }
  return { grantFor, redeem, unlink, revokeFromAP, resolve, summary }
}
module.exports = { createNoBolsoBridge, monthRange }
