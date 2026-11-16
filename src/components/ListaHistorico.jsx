import { useState } from 'react';
export default function ListaHistorico({ titulo, registros, children }) {
  const [limite, setLimite] = useState(5);
  return <section className="card historico-registros"><h2>{titulo} <span className="text-muted">({registros.length})</span></h2>{registros.length ? registros.slice(0, limite).map(children) : <p className="historico-vazio">Nenhum registro neste período.</p>}{registros.length > limite && <button type="button" className="btn btn-secondary" onClick={() => setLimite(n => n + 5)}>Carregar mais · {Math.min(5, registros.length - limite)} registros</button>}</section>;
}
