import { dataExibicao, dataHoraExibicao } from '../utils/datasExibicao.js';
import { useRef, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../services/firebase';
import { obterGrupoAtual } from '../services/dadosGrupo';
import { moeda } from '../utils/comprasAnalise';

export default function NoBolsoConsulta({ user, onNavigate }) {
  const [dados, setDados] = useState(null), [ofertas, setOfertas] = useState(null), [produto, setProduto] = useState('');
  const [ocupado, setOcupado] = useState(false), [erro, setErro] = useState('');
  const emAndamento = useRef(false);
  async function consultar(consulta) {
    if (emAndamento.current) return;
    const uid = auth.currentUser?.uid, grupo = obterGrupoAtual();
    if (!uid || uid !== user?.uid) { setErro('Entre na sua conta para consultar.'); return; }
    if (!navigator.onLine) { setErro('Sem conexão. Nenhuma consulta foi realizada.'); return; }
    emAndamento.current = true; setOcupado(true); setErro('');
    try {
      const r = (await httpsCallable(functions, 'noBolsoConsulta')({ consulta, dias: 90, ...(consulta === 'produto' ? { produtoId: produto } : {}) })).data;
      if (auth.currentUser?.uid !== uid || obterGrupoAtual() !== grupo) return;
      if (consulta === 'rankings') { setDados(r); setOfertas(null); setProduto(r.produtos[0]?.produtoId || ''); }
      else setOfertas(r);
    } catch { setErro('Consulta indisponível. Confira sua sessão e tente novamente.'); }
    finally { emAndamento.current = false; setOcupado(false); }
  }
  return <div className="page-bg"><main className="page-shell"><section className="card compras-form"><h1>No Bolso · Consulta de valores</h1><p>Consulte o histórico de preços do seu grupo. Esta integração não importa compras, não cria despesas e não altera lançamentos financeiros.</p><button className="btn" onClick={() => onNavigate('/ponto')}>Voltar ao Tá no Ponto</button>{erro && <p role="alert">{erro}</p>}<button className="btn btn-primary" disabled={ocupado || !user} onClick={() => consultar('rankings')}>{ocupado ? 'Consultando…' : 'Consultar preços do meu grupo'}</button>{dados && <><p>Últimos 90 dias · consultado em {dataHoraExibicao(new Date(dados.consultadoEm))}. Histórico, sem garantia de preço atual.</p><label className="field">Produto<select value={produto} onChange={e => { setProduto(e.target.value); setOfertas(null); }}>{dados.produtos.map((p, i) => <option key={`${p.produtoId}:${i}`} value={p.produtoId}>{p.nome} · {p.apresentacao}</option>)}</select></label><button className="btn" disabled={!produto || ocupado} onClick={() => consultar('produto')}>Comparar valores</button>{!dados.produtos.length && <p>Nenhum preço registrado no período.</p>}<h2>Produtos mais comprados</h2><ul>{dados.rankings.frequencias.map((p, i) => <li key={i}>{p.nome} · {p.compras} compras</li>)}</ul></>}{ofertas && <><p>Consulta: {dataHoraExibicao(new Date(ofertas.consultadoEm))}</p><ul>{ofertas.ofertas.map((o, i) => <li key={i}><strong>{moeda(o.precoUnitarioCentavos)}/{o.unidade}</strong> · {o.apresentacao} · {o.supermercado} · registrado em {dataExibicao(new Date(o.registradoEm))}</li>)}</ul>{!ofertas.ofertas.length && <p>Sem preços registrados para este produto.</p>}</>}</section></main></div>;
}
