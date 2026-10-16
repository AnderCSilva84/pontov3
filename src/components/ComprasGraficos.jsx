import { useMemo, useState } from 'react';
import { moeda, dataPreco, compararMercados, seriesPorMercado } from '../utils/comprasAnalise';

const CORES = ['#2f7b5f', '#a75529', '#366ab5', '#9851a8', '#8a7019', '#b03e61'];
export default function ComprasGraficos({ registros }) {
  const [produtoId, setProdutoId] = useState('');
  const produtos = useMemo(() => [...new Map(registros.map(r => [r.produtoId, { id: r.produtoId, nome: `${r.nomeSnapshot} · ${r.apresentacao || 'apresentação não informada'}` }])).values()].sort((a, b) => a.nome.localeCompare(b.nome)), [registros]);
  const selecionado = produtos.some(p => p.id === produtoId) ? produtoId : produtos[0]?.id;
  const pontos = registros.filter(r => r.produtoId === selecionado);
  const mercados = compararMercados(pontos), series = seriesPorMercado(pontos);
  if (!produtos.length) return <p className="card">Ainda não há preços confirmados neste período.</p>;
  const maximo = Math.max(...pontos.map(p => p.precoUnitarioCentavos), 1);
  const inicio = Math.min(...pontos.map(p => p.compradoEmMs)), fim = Math.max(...pontos.map(p => p.compradoEmMs));
  const x = ms => fim === inicio ? 300 : 55 + (ms - inicio) / (fim - inicio) * 490;
  const y = centavos => 205 - centavos / maximo * 165;
  return <>
    <label className="field"><span>Comparar produto</span><select value={selecionado} onChange={e => setProdutoId(e.target.value)}>{produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></label>
    <section className="card compras-grafico"><h2>Último preço por supermercado</h2><p className="text-muted">Preços registrados no período, por unidade indicada. Confira a data de cada observação.</p>
      {mercados.map(r => <div className="compras-barra" key={`${r.supermercadoId}:${r.unidadeCompra}`}><div><strong>{r.supermercadoNome}</strong><span>{moeda(r.precoUnitarioCentavos)}/{r.unidadeCompra} · {dataPreco(r.compradoEmMs)}</span></div><div className="compras-barra-trilho"><span style={{ width: `${r.precoUnitarioCentavos / maximo * 100}%` }} /></div></div>)}
    </section>
    <section className="card compras-grafico"><h2>Variação ao longo do tempo</h2><p className="text-muted">Cada ponto é uma compra. As linhas ligam observações; não representam preços confirmados entre elas.</p>
      <svg viewBox="0 0 600 250" role="img" aria-label="Evolução dos preços por supermercado. Valores completos na tabela abaixo.">
        {[0, .5, 1].map(fracao => <g key={fracao}><line x1="55" x2="550" y1={y(fracao * maximo)} y2={y(fracao * maximo)} stroke="#e2e5df" /><text x="3" y={y(fracao * maximo) - 5} fontSize="11" fill="#73624c">{moeda(fracao * maximo)}</text></g>)}
        <text x="55" y="235" fontSize="12" fill="#73624c">{dataPreco(inicio)}</text><text x="550" y="235" textAnchor="end" fontSize="12" fill="#73624c">{dataPreco(fim)}</text>
        {series.map((s, i) => <g key={s.chave}><polyline fill="none" stroke={CORES[i % CORES.length]} strokeWidth="2" strokeDasharray={i >= CORES.length ? '6 4' : undefined} points={s.pontos.map(p => `${x(p.compradoEmMs)},${y(p.precoUnitarioCentavos)}`).join(' ')} />{s.pontos.map(p => <circle key={p.id} cx={x(p.compradoEmMs)} cy={y(p.precoUnitarioCentavos)} r="4" fill={CORES[i % CORES.length]}><title>{s.nome}: {moeda(p.precoUnitarioCentavos)}/{s.unidade} em {dataPreco(p.compradoEmMs)}</title></circle>)}</g>)}
      </svg>
      <ul className="compras-legenda">{series.map((s, i) => <li key={s.chave}><span style={{ background: CORES[i % CORES.length] }} />{s.nome} · {s.unidade}</li>)}</ul>
      <details><summary>Ver todos os valores em tabela</summary><div className="compras-tabela"><table><thead><tr><th>Data</th><th>Supermercado</th><th>Preço</th></tr></thead><tbody>{[...pontos].sort((a, b) => b.compradoEmMs - a.compradoEmMs).map(p => <tr key={p.id}><td>{dataPreco(p.compradoEmMs)}</td><td>{p.supermercadoNome}</td><td>{moeda(p.precoUnitarioCentavos)}/{p.unidadeCompra}</td></tr>)}</tbody></table></div></details>
    </section>
  </>;
}
