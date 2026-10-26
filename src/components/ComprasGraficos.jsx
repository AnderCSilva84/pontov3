import {CorrigirAssociacaoItem} from './AssociacoesProdutos';
import { useId, useState } from 'react';
import {normalizarProduto} from '../../functions/produtos-identidade.mjs';
import {filtrarHistoricoProduto,separarUnidadesHistorico} from '../utils/comprasHistoricoProduto';
import { moeda, dataPreco, compararMercados, seriesPorMercado } from '../utils/comprasAnalise';

const CORES = ['#2f7b5f', '#a75529', '#366ab5', '#9851a8', '#8a7019', '#b03e61'];
export default function ComprasGraficos({registros,catalogo=[],categorias=[],admin,versaoAssociacoes,atualizar}){
 const [busca,setBusca]=useState(''),[categoria,setCategoria]=useState('');const sugestoesId=useId();
 const pontos=filtrarHistoricoProduto(registros,catalogo,busca,categoria),grupos=separarUnidadesHistorico(pontos);
 const nomes=[...new Set(registros.map(r=>r.nomeCanonico||r.nomeSnapshot).filter(Boolean))].filter(n=>normalizarProduto(n).includes(normalizarProduto(busca))).sort((a,b)=>a.localeCompare(b,'pt-BR')).slice(0,15);
 if(!registros.length)return <p className="card">Ainda não há preços confirmados neste período.</p>;
 return <><div className="compras-autocomplete"><label className="field"><span>Categoria dos produtos</span><select value={categoria} onChange={e=>setCategoria(e.target.value)}><option value="">Todas as categorias</option>{categorias.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></label><label className="field"><span>Comparar produto — todas as marcas e embalagens</span><input type="search" list={sugestoesId} value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Ex.: banana, sabão líquido…"/></label><datalist id={sugestoesId}>{nomes.map(n=><option key={n} value={n}/>)}</datalist></div>
 {!busca.trim()?<p className="card">Digite o produto para reunir todas as compras dele no período.</p>:!pontos.length?<p className="card" role="status">Nenhuma compra encontrada para esse produto e categoria no período.</p>:<><p role="status">{pontos.length} observação(ões) de compra para “{busca}”, incluindo todas as marcas e embalagens encontradas. O filtro não mescla cadastros.</p><p>Os valores são os preços registrados por kg, litro, metro ou unidade/embalagem. Marcas e tamanhos podem variar; a diferença não representa necessariamente aumento do mesmo produto. Medidas diferentes aparecem em gráficos separados.</p>{grupos.map(([unidade,observacoes])=><section key={unidade+':'+busca+':'+categoria} className="compras-historico-unidade"><h2>Preços por {({kg:'quilo (kg)',l:'litro (L)',m:'metro (m)',un:'unidade / embalagem'})[unidade]||unidade}</h2><GraficoUnidade pontos={observacoes} catalogo={catalogo} admin={admin} versaoAssociacoes={versaoAssociacoes} atualizar={atualizar}/></section>)}</>}
 </>;
}
function GraficoUnidade({pontos,catalogo,admin,versaoAssociacoes,atualizar}){
 const [correcao,setCorrecao]=useState(null),[limite,setLimite]=useState(50);
 const mercados=compararMercados(pontos),series=seriesPorMercado(pontos);
  const maximo = Math.max(...pontos.map(p => p.precoUnitarioCentavos), 1);
  const inicio = Math.min(...pontos.map(p => p.compradoEmMs)), fim = Math.max(...pontos.map(p => p.compradoEmMs));
  const x = ms => fim === inicio ? 300 : 55 + (ms - inicio) / (fim - inicio) * 490;
  const y = centavos => 205 - centavos / maximo * 165;
  return <>
    {correcao&&<CorrigirAssociacaoItem registro={correcao} catalogo={catalogo} versao={versaoAssociacoes} atualizar={atualizar} fechar={()=>setCorrecao(null)}/>}
    <section className="card compras-grafico"><h2>Último preço por supermercado</h2><p className="text-muted">Preços registrados no período, por unidade indicada. Confira a data de cada observação.</p>
      {mercados.map(r => <div className="compras-barra" key={`${r.supermercadoId}:${r.unidadeCompra}`}><div><strong>{r.supermercadoNome}</strong><span>{moeda(r.precoUnitarioCentavos)}/{r.unidadeCompra} · {dataPreco(r.compradoEmMs)}</span></div><div className="compras-barra-trilho"><span style={{ width: `${r.precoUnitarioCentavos / maximo * 100}%` }} /></div></div>)}
    </section>
    <section className="card compras-grafico"><h2>Variação ao longo do tempo</h2><p className="text-muted">Cada ponto é uma compra, incluindo marcas e embalagens diferentes. As linhas ligam observações; não representam preços confirmados entre elas.</p>
      <svg viewBox="0 0 600 250" role="img" aria-label="Evolução dos preços por supermercado. Valores completos na tabela abaixo.">
        {[0, .5, 1].map(fracao => <g key={fracao}><line x1="55" x2="550" y1={y(fracao * maximo)} y2={y(fracao * maximo)} stroke="#e2e5df" /><text x="3" y={y(fracao * maximo) - 5} fontSize="11" fill="#73624c">{moeda(fracao * maximo)}</text></g>)}
        <text x="55" y="235" fontSize="12" fill="#73624c">{dataPreco(inicio)}</text><text x="550" y="235" textAnchor="end" fontSize="12" fill="#73624c">{dataPreco(fim)}</text>
        {series.map((s, i) => <g key={s.chave}><polyline fill="none" stroke={CORES[i % CORES.length]} strokeWidth="2" strokeDasharray={i >= CORES.length ? '6 4' : undefined} points={s.pontos.map(p => `${x(p.compradoEmMs)},${y(p.precoUnitarioCentavos)}`).join(' ')} />{s.pontos.map(p => <circle key={p.id} cx={x(p.compradoEmMs)} cy={y(p.precoUnitarioCentavos)} r="4" fill={CORES[i % CORES.length]}><title>{p.nomeCanonico||p.nomeSnapshot} · {p.marca||'Marca não informada'} · {p.apresentacao||'Embalagem não informada'} · {s.nome}: {moeda(p.precoUnitarioCentavos)}/{s.unidade} em {dataPreco(p.compradoEmMs)}</title></circle>)}</g>)}
      </svg>
      <ul className="compras-legenda">{series.map((s, i) => <li key={s.chave}><span style={{ background: CORES[i % CORES.length] }} />{s.nome} · {s.unidade}</li>)}</ul>
      <details><summary>Ver todos os valores em tabela</summary><div className="compras-tabela compras-historico-associado"><table><thead><tr><th>Data</th><th>Supermercado</th><th>Preço</th><th>Marca e embalagem</th><th>Descrição original e referência</th>{admin&&<th>Associação</th>}</tr></thead><tbody>{[...pontos].sort((a, b) => b.compradoEmMs - a.compradoEmMs).slice(0,limite).map(p => <tr key={p.id}><td>{dataPreco(p.compradoEmMs)}</td><td>{p.supermercadoNome}</td><td>{moeda(p.precoUnitarioCentavos)}/{p.unidadeCompra}</td><td>{p.marca||'Marca não informada'} · {p.apresentacao||'Embalagem não informada'}</td><td>{p.nomeOriginal||p.nomeSnapshot}<small>{p.listaId} · {p.itemId||p.id} · Cadastro original: {p.produtoOriginalId||p.produtoId}</small></td>{admin&&<td><button className="btn btn-secondary" onClick={()=>setCorrecao(p)}>Corrigir associação</button></td>}</tr>)}</tbody></table></div>{pontos.length>limite&&<button className="btn btn-secondary" onClick={()=>setLimite(n=>n+50)}>Mais 50 observações</button>}</details>
    </section>
  </>;
}
