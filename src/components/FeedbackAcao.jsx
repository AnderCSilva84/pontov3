import { useEffect, useState } from 'react';
import { Icon } from './ui';

export default function FeedbackAcao() {
  const [aviso, setAviso] = useState(null);
  useEffect(() => {
    let timer;
    const receber = e => { clearTimeout(timer); setAviso(String(e.detail)); timer = setTimeout(() => setAviso(null), 6000); };
    const limpar = () => { clearTimeout(timer); setAviso(null); };
    window.addEventListener('ap1303-acao-confirmada', receber);
    window.addEventListener('ap1303-ponto-sair', limpar);
    return () => { limpar(); window.removeEventListener('ap1303-acao-confirmada', receber); window.removeEventListener('ap1303-ponto-sair', limpar); };
  }, []);
  return <div className="acao-toast-area" role="status" aria-live="polite">{aviso && <div className="acao-toast"><Icon name="check" /><span>{aviso}</span><button type="button" aria-label="Fechar confirmação" onClick={() => setAviso(null)}>×</button></div>}</div>;
}
