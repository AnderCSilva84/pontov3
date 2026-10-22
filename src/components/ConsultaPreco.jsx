import ProdutoAutocomplete from './ProdutoAutocomplete';
import {useState} from 'react';
import {chaveProdutoPreco,moeda,dataPreco,lerPreco,compararMercados} from '../utils/comprasAnalise';
import {compararPrecoConsultado} from '../utils/comprasConsulta';
export default function ConsultaPreco({registros,catalogo,categorias}) {
  const [produto,setProduto]=useState(''),[valor,setValor]=useState('');
  const pontos=registros.filter(r=>chaveProdutoPreco(r)===produto);
  let preco=null;try{preco=lerPreco(valor);}catch{/* Campo ainda incompleto. */}
  const resultado=preco ? compararPrecoConsultado(pontos,preco):null;
  return <section className="card compras-consulta"><h2>Consulta de preço</h2><p>Digite o preço que encontrou e compare com nossas compras dos últimos 12 meses, para a mesma marca, embalagem e unidade.</p>
    <ProdutoAutocomplete registros={registros} catalogo={catalogo} categorias={categorias} value={produto} onChange={setProduto} />
    {produto && <p className="text-muted">Produto selecionado. Para trocar, digite outro nome ou marca.</p>}
    <label className="field"><span>Preço encontrado (R$ por {pontos[0]?.unidadeCompra || 'unidade indicada'})</span><input inputMode="decimal" value={valor} onChange={e=>setValor(e.target.value)} placeholder="0,00" /></label>{valor && !preco && <p role="status">Informe um preço maior que zero, com até duas casas decimais.</p>}
    {resultado && <div aria-live="polite"><h3>{Math.abs(resultado.diferencaPct)<0.005 ? 'Igual à média histórica' : `${Math.abs(resultado.diferencaPct).toLocaleString('pt-BR',{maximumFractionDigits:1})}% ${resultado.diferencaPct>0?'acima':'abaixo'} da média histórica`}</h3><p>Média: <strong>{moeda(resultado.media)}</strong> · {resultado.amostra} registros</p><p>Menor: {moeda(resultado.menor)} · Maior: {moeda(resultado.maior)}</p><p>Último: {moeda(resultado.ultimo.precoUnitarioCentavos)} · {resultado.ultimo.supermercadoNome} · {dataPreco(resultado.ultimo.compradoEmMs)}</p><h3>Último preço em cada supermercado</h3>{compararMercados(pontos).map(r=><p key={r.supermercadoId}>{r.supermercadoNome}: <strong>{moeda(r.precoUnitarioCentavos)}/{r.unidadeCompra}</strong> · {dataPreco(r.compradoEmMs)}</p>)}</div>}{!registros.length && <p>Não há preços históricos neste período.</p>}<small>Referência histórica, não preço vigente nem promoção. A consulta não altera preços salvos.</small></section>;
}
