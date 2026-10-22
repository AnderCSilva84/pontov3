import { useEffect, useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, functions } from '../services/firebase'
export default function NoBolsoConnection({ user, onNavigate }) {
  const [session, setSession] = useState(undefined)
  useEffect(
    () =>
      onAuthStateChanged(auth, (current) =>
        setSession(current ? { uid: current.uid, email: current.email } : null),
      ),
    [],
  )
  if (session === undefined || (user && session?.uid !== user.uid))
    return (
      <div className="page-bg">
        <main className="page-shell">
          <section className="card">
            <h1>Conectar ao No Bolso</h1>
            <p role="status">Conferindo a conta conectada ao AP1303…</p>
            <button className="btn" onClick={() => onNavigate('/ponto')}>
              Voltar ao AP1303
            </button>
          </section>
        </main>
      </div>
    )
  return (
    <ConnectionForm
      key={session?.uid ?? 'signed-out'}
      user={user}
      session={session}
      onNavigate={onNavigate}
    />
  )
}
function ConnectionForm({ user, session, onNavigate }) {
  const [recipient, setRecipient] = useState('')
  const [consent, setConsent] = useState(false)
  const [code, setCode] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  async function run(operacao) {
    if (!session || user?.uid !== session.uid || auth.currentUser?.uid !== session.uid) {
      setError('A conta mudou. Confira a sessão antes de autorizar.')
      return
    }
    const sourceUid = session.uid
    setBusy(true)
    setCode(null)
    setError('')
    try {
      const result = await httpsCallable(
        functions,
        'comprasOperacao',
      )({
        operacao: operacao === 'gerar' ? 'noBolsoGerarCodigo' : 'noBolsoRevogar',
        ...(operacao === 'gerar' ? { noBolsoUid: recipient.trim() } : {}),
      })
      if (auth.currentUser?.uid !== sourceUid) return
      if (operacao === 'gerar') setCode(result.data)
      else setError('Conexão removida.')
    } catch {
      setError('Não foi possível concluir. Confira sua conta e a conexão existente.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="page-bg">
      <main className="page-shell">
        <section className="card">
          <h1>Conectar ao No Bolso</h1>
          {user ? (
            <>
              <p>
                Conta conectada ao AP1303:{' '}
                <strong>{session.email || 'E-mail não disponível'}</strong>.
              </p>
              <p>
                Confira se esta é a conta cujas compras você quer compartilhar.{' '}
                <button
                  type="button"
                  className="btn"
                  onClick={() => onNavigate('/ponto')}
                >
                  Voltar ao AP1303
                </button>
              </p>
              <p>
                Piloto privado: autorizo compartilhar os totais mensais das compras
                finalizadas por esta conta com a conta destinatária identificada abaixo no
                No Bolso. Os totais poderão ser combinados com os de outra pessoa
                autorizada. Nenhuma despesa será criada automaticamente. Revogar remove
                somente a autorização desta conta em todos os destinatários.
              </p>
              <label>
                Identificador da conta destinatária no No Bolso
                <input
                  value={recipient}
                  onChange={(event) => {
                    setRecipient(event.target.value)
                    setConsent(false)
                    setCode(null)
                  }}
                  autoComplete="off"
                />
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                />
                Autorizo compartilhar com essa conta. Para outra conta, gere e autorize um
                novo código.
              </label>
              <button
                className="btn btn-primary"
                disabled={busy || !consent || !recipient.trim()}
                onClick={() => run('gerar')}
              >
                Gerar código temporário
              </button>
              <button className="btn" disabled={busy} onClick={() => run('revogar')}>
                Revogar conexão
              </button>
              {code && (
                <>
                  <label>
                    Código para colar no No Bolso
                    <input
                      readOnly
                      value={code.code}
                      onFocus={(e) => e.target.select()}
                    />
                  </label>
                  <small>
                    Uso único · vence em{' '}
                    {new Date(code.expiresAt).toLocaleTimeString('pt-BR')}. Não
                    compartilhe o código por mensagens.
                  </small>
                </>
              )}
            </>
          ) : (
            <>
              <p>Entre na sua conta AP1303 e depois reabra esta página pelo No Bolso.</p>
              <button className="btn btn-primary" onClick={() => onNavigate('/ponto')}>
                Entrar no AP1303
              </button>
            </>
          )}
          {error && <p role="status">{error}</p>}
        </section>
      </main>
    </div>
  )
}
