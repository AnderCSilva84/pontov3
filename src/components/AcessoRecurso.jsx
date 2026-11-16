import { useEffect, useState } from 'react';
import { consultarAssinatura } from '../services/assinaturas';

export default function AcessoRecurso({ user, recurso, onNavigate, children }) {
  const chave = `${user?.uid || ''}:${user?.grupoId || ''}:${recurso}`;
  const [consulta, setConsulta] = useState(null), [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    let atual = true, timer, rodada = 0;
    const conferir = async () => {
      const minhaRodada = ++rodada;
      try {
        const dados = await consultarAssinatura();
        if (!atual || minhaRodada !== rodada) return;
        setConsulta({ chave, dados });
        clearTimeout(timer);
        const fim = dados.assinatura?.validoAte;
        const prazo = fim ? Math.min(60000, Math.max(1000, fim - Date.now())) : 60000;
        timer = setTimeout(conferir, prazo);
      } catch {
        if (atual && minhaRodada === rodada) setConsulta({ chave, erro: true });
      }
    };
    const aoFocar = () => { if (document.visibilityState === 'visible') conferir(); };
    if (user?.uid) conferir();
    document.addEventListener('visibilitychange', aoFocar);
    return () => { atual = false; clearTimeout(timer); document.removeEventListener('visibilitychange', aoFocar); };
  }, [chave, tentativa, user?.uid]);
  if (!user?.uid) return <p role="status">Entre na sua conta para acessar este recurso.</p>;
  if (consulta?.chave !== chave) return <p role="status">Conferindo disponibilidade do recurso…</p>;
  if (consulta.erro) return <section className="card"><p role="alert">Não foi possível confirmar a disponibilidade.</p><button className="btn btn-secondary" onClick={() => setTentativa(v => v + 1)}>Tentar novamente</button></section>;
  const dados = consulta.dados;
  const permitido = ['legado', 'transicao'].includes(dados?.modo)
    || dados?.modo === 'ativo' && (recurso === 'compartilhamento' && dados.titular === true || dados.assinatura?.direitos?.[recurso] === true && (dados.titular === true || user.acessoCompartilhado !== false));
  if (permitido) return children;
  const bloqueio = <section className="card"><h2>{recurso === 'importacaoQr' ? 'Importação fiscal nos planos Ouro e Diamante' : recurso === 'compartilhamento' ? 'Novas ações compartilhadas indisponíveis' : 'Escritório contábil a partir do plano Prata'}</h2><p>Consulte os planos para conhecer os recursos incluídos. Seus dados anteriores foram preservados.</p><button className="btn btn-secondary" onClick={() => onNavigate('/planos')}>Ver planos</button>{recurso === 'escritorioContabil' && <button className="btn btn-secondary" onClick={() => onNavigate('/historico-contabil')}>Consultar e exportar histórico</button>}{recurso === 'compartilhamento' && <><button className="btn btn-secondary" onClick={() => onNavigate('/conta')}>Minha conta</button>{user.role === 'funcionario' && <button className="btn btn-secondary" onClick={() => onNavigate('/ponto')}>Consultar meu ponto / concluir jornada</button>}{user.funcionarioId && <button className="btn btn-secondary" onClick={() => onNavigate('/meus-comprovantes')}>Meus comprovantes</button>}</>}</section>;
  return recurso === 'escritorioContabil' || recurso === 'compartilhamento' ? <div className="page-bg"><main className="page-shell">{bloqueio}</main></div> : bloqueio;
}
