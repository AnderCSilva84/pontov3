import {gastosUltimosTresMeses} from '../utils/comprasConsulta';
import {moeda} from '../utils/comprasAnalise';
export default function GastosCompras({listas}) {
 const meses=gastosUltimosTresMeses(listas),maximo=Math.max(...meses.map(m=>m.totalCentavos),1);
 return <section className="card compras-grafico" aria-label="Gastos em compras nos últimos três meses"><h2>Gastos nos últimos 3 meses</h2><p>Mês atual e dois anteriores · compras finalizadas, pelo total pago. O mês atual ainda está em andamento.</p>{meses.map(m=><div className="compras-barra" key={m.chave}><div><strong>{m.nome}</strong><span>{moeda(m.totalCentavos)}</span></div><div className="compras-barra-trilho" aria-hidden="true"><span style={{width:`${m.totalCentavos/maximo*100}%`}} /></div></div>)}<p>Total do período: <strong>{moeda(meses.reduce((s,m)=>s+m.totalCentavos,0))}</strong></p></section>;
}
