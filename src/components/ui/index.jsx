import logo from '../../assets/ap1303.jpeg';
import { useEffect, useState } from 'react';

export function Icon({ name, ...props }) {
  const paths = { clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>, bell: <><path d="M5 17h14l-2-4V9a5 5 0 0 0-10 0v4zM10 21h4"/></>, tasks: <><rect x="4" y="3" width="16" height="18" rx="3"/><path d="m8 12 3 3 5-6"/></>, cart: <><path d="M3 4h3l3 12h10l2-9H7"/><circle cx="10" cy="21" r="1"/><circle cx="18" cy="21" r="1"/></>, chart: <><path d="M4 21V11h4v10m2 0V7h4v14m2 0V3h4v18"/></>, plus: <path d="M12 4v16M4 12h16"/>, check: <path d="m5 12 4 4L19 6"/>, arrow: <path d="m14 5-7 7 7 7M7 12h14"/>, chevron: <path d="m9 5 7 7-7 7"/>, more: <><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></>, file: <><path d="M14 3H5v18h14V8zM14 3v5h5M8 12h8M8 16h6"/></>, users: <><circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-16a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5"/></> };
  return <svg className="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] || paths.file}</svg>;
}
export function BrandMark() { return <span className="brand-mark"><img src={logo} alt="AP1303" /></span>; }
export function PageHeader({ title, subtitle, children, back }) { return <header className="ui-header"><div className="ui-header-top">{back && <button className="icon-button" onClick={back} aria-label="Voltar"><Icon name="arrow" /></button>}<BrandMark />{children && <div className="ui-header-actions">{children}</div>}</div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</header>; }
export function Badge({ children, tone = 'success' }) { return <span className={`ui-badge ${tone}`}>{children}</span>; }
export function Segmented({ value, onChange, options, label }) { return <div className="ui-segmented" role="group" aria-label={label}>{options.map(([id, nome]) => <button key={id} type="button" aria-pressed={value === id} className={value === id ? 'active' : ''} onClick={() => onChange(id)}>{nome}</button>)}</div>; }
export function Steps({ step }) { return <ol className="ui-steps" aria-label="Etapas da folha">{['Valores', 'Revisão', 'Fechamento'].map((nome, i) => <li key={nome} className={step >= i + 1 ? 'active' : ''} aria-current={step === i + 1 ? 'step' : undefined}><b>{i + 1}</b><span>{nome}</span></li>)}</ol>; }
export function EmptyState({ title, children }) { return <div className="card ui-empty"><Icon name="file"/><h2>{title}</h2>{children && <p>{children}</p>}</div>; }
export function FinancialSummary({ totais, moeda, label = 'Líquido previsto' }) { return <div className="financial-summary"><small>{label}</small><strong>{moeda(totais.liquido)}</strong><div><span>Proventos <b>{moeda(totais.proventos)}</b></span><span>Descontos <b>{moeda(totais.descontos)}</b></span></div></div>; }
export function ConnectionStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => { const atualizar = () => setOnline(navigator.onLine); window.addEventListener('online', atualizar); window.addEventListener('offline', atualizar); return () => { window.removeEventListener('online', atualizar); window.removeEventListener('offline', atualizar); }; }, []);
  return <p className={`ui-connection ${online ? '' : 'offline'}`} role="status">{online ? 'Conexão disponível · registros dependem da confirmação do servidor' : 'Sem conexão · alterações podem estar pendentes'}</p>;
}
