import { dataExibicao } from '../utils/datasExibicao.js';
import {gastosUltimosTresMeses} from '../utils/comprasConsulta';
import {moeda} from '../utils/comprasAnalise';
import {tipoCompra,gastosSeparados,TIPOS_COMPRAS} from '../utils/comprasTipo';

const tipos=Object.entries(TIPOS_COMPRAS);
const dataBr=valor=>/^\d{4}-\d{2}-\d{2}$/.test(valor||'') ? dataExibicao(valor) : valor;
export default function GastosCompras({listas,inicio,fim,tipoFiltro='todos'}) {
 const gastos=gastosSeparados(listas),meses=gastosUltimosTresMeses(listas);
 const series=Object.fromEntries(tipos.map(([tipo])=>[tipo,new Map(gastosUltimosTresMeses(listas.filter(l=>tipoCompra(l)===tipo)).map(m=>[m.chave,m.totalCentavos]))]));
 const maximo=Math.max(...meses.map(m=>m.totalCentavos),1),visiveis=tipos.filter(([tipo])=>tipoFiltro==='todos'||tipoFiltro===tipo);
 return <section className="card gastos-compras" aria-label="Resumo dos gastos de compras">
  <header className="gastos-cabecalho"><h2>Gastos realizados</h2><p>{dataBr(inicio)} a {dataBr(fim)}</p></header>
  <div className="gastos-total"><span>{tipoFiltro==='todos'?'Total do período':`Total em ${visiveis[0][1].toLocaleLowerCase('pt-BR')}`}</span><strong>{moeda(gastos.total)}</strong><small>Somente compras finalizadas · total pago</small></div>
  {tipoFiltro==='todos'&&<dl className="gastos-classificacoes">{tipos.map(([tipo,nome])=><div key={tipo} className={`gastos-categoria ${tipo}`}><dt>{nome}</dt><dd>{moeda(gastos[tipo])}</dd></div>)}</dl>}
  <section className="gastos-evolucao" aria-labelledby="gastos-evolucao-titulo"><h3 id="gastos-evolucao-titulo">Últimos 3 meses</h3><p className="gastos-nota">Dentro do período selecionado. Mês atual em andamento.</p>
   <div className="gastos-meses">{meses.map(m=><article className="gastos-mes" key={m.chave} aria-label={m.nome}><header><h4>{m.nome}</h4><strong>{moeda(m.totalCentavos)}</strong></header>
    {m.totalCentavos===0?<p className="gastos-sem-compras">Sem gastos finalizados neste período</p>:<dl>{visiveis.map(([tipo,nome])=>{const total=series[tipo].get(m.chave)||0;return <div className={`gastos-serie ${tipo}`} key={tipo}><div><dt>{nome}</dt><dd>{moeda(total)}</dd></div><div className="gastos-trilho" aria-hidden="true"><span style={{width:`${total/maximo*100}%`}}/></div></div>;})}</dl>}
   </article>)}</div>
  </section>
 </section>;
}
