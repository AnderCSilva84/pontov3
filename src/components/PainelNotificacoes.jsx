import {useEffect, useRef} from 'react';
import {Icon} from './ui';
import {dataHoraExibicao} from '../utils/datasExibicao';
import '../styles/painel-notificacoes.css';

export default function PainelNotificacoes({itens, fechar, marcarLidas}) {
  const ref = useRef(null), callbacks = useRef({fechar});
  useEffect(() => { callbacks.current = {fechar}; }, [fechar]);
  useEffect(() => {
    const dialog = ref.current, anterior = document.activeElement;
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    dialog.showModal();
    return () => { dialog.close(); document.documentElement.style.overflow = overflow; anterior?.focus(); };
  }, []);
  return <dialog ref={ref} className="painel-avisos" aria-labelledby="painel-avisos-titulo"
    onCancel={e => { e.preventDefault(); callbacks.current.fechar(); }}
    onClick={e => {
      if (e.target !== e.currentTarget) return;
      const r = e.currentTarget.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) fechar();
    }}>
    <header className="painel-avisos-cabecalho"><h2 id="painel-avisos-titulo">Notificações</h2><button type="button" className="icon-button" aria-label="Fechar notificações" onClick={fechar} autoFocus><span aria-hidden="true">×</span></button></header>
    <div className="painel-avisos-conteudo">{itens.length ? itens.map(item => {
      const ms = item.criadoEm?.toMillis?.() || item.criadoEmMs;
      return <article key={item.id}><span className="painel-avisos-icone"><Icon name="bell"/></span><div><strong>{item.titulo}</strong><p>{item.mensagem}</p>{Number.isFinite(ms) && <time dateTime={new Date(ms).toISOString()}>{dataHoraExibicao(new Date(ms))}</time>}</div></article>;
    }) : <div className="painel-avisos-vazio"><Icon name="bell"/><p>Nenhuma notificação nova.</p></div>}</div>
    {itens.length > 0 && <footer><button type="button" className="btn btn-secondary" onClick={marcarLidas}>Marcar como lidas</button></footer>}
  </dialog>;
}
