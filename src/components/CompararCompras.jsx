import {useEffect,useMemo,useRef,useState} from 'react';
import {consultarPrecos} from '../services/compras';
import {normalizarProduto} from '../../functions/produtos-identidade.mjs';
import CorrespondenciasProdutos from './CorrespondenciasProdutos';
import {compararCompras,moedaComparacao,reaplicarCorrespondencias} from '../utils/comparacaoCompras';
import {dataPreco,numeroCompras} from '../utils/comprasAnalise';
import '../styles/comparar-compras.css';
export default function CompararCompras({registros,listas=[],listasLimitadas=false,tipoCompra,inicioMs,fimMs,admin,aoCatalogoAtualizar,aoExportarPdf,exportando=false}){
 const [modo,setModo]=useState('mercados'),[a,setA]=useState(''),[b,setB]=useState(''),[busca,setBusca]=useState(''),[limite,setLimite]=useState(10);
 const [resultado,setResultado]=useState(null),[erro,setErro]=useState(''),[ocupado,setOcupado]=useState(false),pedido=useRef(0);
 useEffect(()=>()=>{pedido.current++;},[]);
 const [mapaLocal,setMapaLocal]=useState(null),[associando,setAssociando]=useState(false);
 const registrosComparados=useMemo(()=>reaplicarCorrespondencias(modo==='mercados'?registros:resultado?.registros||[],mapaLocal),[registros,modo,resultado,mapaLocal]);
 const lojas=new Map();for(const r of registros)if(r.supermercadoId&&!lojas.has(r.supermercadoId))lojas.set(r.supermercadoId,{id:r.supermercadoId,titulo:r.supermercadoNome||'Estabelecimento sem nome'});
 const opcoes=modo==='mercados'?[...lojas.values()].sort((x,y)=>x.titulo.localeCompare(y.titulo,'pt-BR')):[...listas].sort((x,y)=>(y.finalizadaEmMs||0)-(x.finalizadaEmMs||0));
 const nome=id=>{const o=opcoes.find(o=>o.id===id);return o?o.titulo+(modo==='listas'&&o.finalizadaEmMs?' · '+dataPreco(o.finalizadaEmMs):''):'';};
 const pronto=a&&b&&a!==b,linhas=pronto&&(modo==='mercados'||resultado)?compararCompras(registrosComparados,{modo,a,b}):[];
 const termos=normalizarProduto(busca).split(' ').filter(Boolean);
 const filtradas=linhas.filter(l=>termos.every(t=>normalizarProduto([l.modelo.nomeCanonico,l.modelo.nomeSnapshot,l.modelo.marca,l.modelo.apresentacao].join(' ')).includes(t)));
 function escolher(lado,valor){pedido.current++;setOcupado(false);setResultado(null);setErro('');setLimite(10);if(lado==='a')setA(valor);else setB(valor);}
 function trocarModo(valor){pedido.current++;setModo(valor);setBusca('');setA('');setB('');setResultado(null);setErro('');setOcupado(false);setLimite(10);}
 function aplicarMapa(mapa,resposta){setMapaLocal(mapa);aoCatalogoAtualizar?.(resposta);}
 async function carregar(){
  if(!pronto||ocupado)return;const sequencia=++pedido.current;setOcupado(true);setErro('');setResultado(null);
  try{const r=await consultarPrecos(inicioMs,fimMs,tipoCompra,{listaIds:[a,b]});if(pedido.current===sequencia)setResultado(r);}
  catch(e){if(pedido.current===sequencia)setErro(e.message||'Não foi possível consultar as listas. Tente novamente.');}
  finally{if(pedido.current===sequencia)setOcupado(false);}
 }
 return <section className="comparar-compras" aria-labelledby="comparar-compras-titulo"><header><h2 id="comparar-compras-titulo">Comparar compras</h2><p>Veja onde o mesmo produto saiu mais em conta.</p></header>
 <div className="comparacao-modos" aria-label="Como comparar"><button type="button" className={modo==='mercados'?'active':''} disabled={associando} aria-pressed={modo==='mercados'} onClick={()=>trocarModo('mercados')}>Supermercados</button><button type="button" className={modo==='listas'?'active':''} disabled={associando} aria-pressed={modo==='listas'} onClick={()=>trocarModo('listas')}>Listas de compras</button></div>
 <p>{modo==='mercados'?'Escolha duas filiais. Usamos o último preço de cada produto em cada uma, dentro do período selecionado.':'Escolha duas compras finalizadas encontradas no período. As duas listas serão carregadas por inteiro, incluindo compras fora desse período.'}</p>
 {modo==='listas'&&listasLimitadas&&<p role="alert">Mostrando as 500 listas mais recentes encontradas. Reduza o período para localizar outras compras.</p>}
 <div className="comparacao-seletores">{['a','b'].map((lado,index)=><label className="field" key={lado}><span>{modo==='mercados'?'Supermercado / filial':'Lista de compras'} {index+1}</span><select disabled={associando} value={lado==='a'?a:b} onChange={e=>escolher(lado,e.target.value)}><option value="">Selecione</option>{opcoes.map(o=><option key={o.id} value={o.id} disabled={o.id===(lado==='a'?b:a)}>{nome(o.id)}</option>)}</select></label>)}</div>
 {opcoes.length<2&&<p role="status">{modo==='mercados'?'Você precisa de preços registrados em pelo menos duas filiais neste período.':'Não encontramos duas listas finalizadas com preços neste período. Amplie o período acima.'}</p>}
 {modo==='listas'&&<button type="button" className="btn btn-primary" disabled={!pronto||ocupado} onClick={carregar}>{ocupado?'Carregando listas completas…':'Comparar estas listas'}</button>}
 {erro&&<p role="alert" className="mensagem erro">{erro}</p>}
 {pronto&&(modo==='mercados'||resultado)&&<><div className="comparacao-resumo" role="status"><strong>{linhas.length} produto(s) em comum</strong><span>{linhas.filter(l=>l.menor==='a').length} mais barato(s) em {nome(a)} · {linhas.filter(l=>l.menor==='b').length} em {nome(b)} · {linhas.filter(l=>l.menor==='empate').length} empate(s)</span></div>
 <label className="field"><span>Buscar nos produtos em comum</span><input type="search" maxLength={120} value={busca} onChange={e=>{setBusca(e.target.value);setLimite(10);}} placeholder="Nome, marca ou embalagem"/></label>
 {aoExportarPdf&&<div><button type="button" className="btn btn-secondary" disabled={exportando||associando||!filtradas.length} onClick={()=>aoExportarPdf(filtradas,{ladoA:nome(a),ladoB:nome(b),modo,tipoCompra,inicioMs,fimMs,busca})}>{exportando?'Gerando PDF…':'Exportar comparação em PDF'}</button><p className="comparacao-nota">O PDF inclui os {filtradas.length} produtos deste filtro, mesmo os que ainda não foram carregados na tela.</p></div>}
 {!linhas.length?<p className="card">Nenhum produto equivalente encontrado nos dois lados. Apenas o mesmo cadastro ou uma mesclagem confirmada entra na comparação; marca, tamanho e unidade também precisam corresponder. Cadastros duplicados podem ser associados no Catálogo.</p>:!filtradas.length?<p role="status">Nenhum produto em comum corresponde à busca.</p>:<div className="comparacao-lista">{filtradas.slice(0,limite).map(l=><article className="comparacao-item" key={l.chave}><header><h3>{l.modelo.nomeCanonico||l.modelo.nomeSnapshot}</h3><p>{l.modelo.marca||'Marca não informada'} · {l.modelo.apresentacao||'Embalagem não informada'} · Preço por {l.modelo.unidadeCompra==='un'?'unidade / embalagem':l.modelo.unidadeCompra}</p></header><div className="comparacao-par">{['a','b'].map(lado=><div key={lado} className={'comparacao-preco '+(l.menor==='empate'?'empate':l.menor===lado?'menor':'maior')}><span>{nome(lado==='a'?a:b)}</span><strong>{moedaComparacao(l[lado].preco)}</strong><b>{l.menor==='empate'?'Mesmo preço':l.menor===lado?'Menor preço':'Maior preço'}</b><small>Compra: {dataPreco(l[lado].compradoEmMs)}</small>{modo==='listas'&&<small>Quantidade: {numeroCompras(l[lado].quantidade)} {l.modelo.unidadeCompra}</small>}</div>)}</div>{l.diferenca>0n&&<p className="comparacao-diferenca">Diferença de {moedaComparacao(l.diferenca)} por {l.modelo.unidadeCompra==='un'?'unidade / embalagem':l.modelo.unidadeCompra}</p>}</article>)}</div>}
 {filtradas.length>limite&&<button type="button" className="btn btn-secondary" onClick={()=>setLimite(n=>n+10)}>Carregar mais 10</button>}
 <CorrespondenciasProdutos key={modo+':'+a+':'+b} registros={registrosComparados} modo={modo} a={a} b={b} tipoCompra={tipoCompra} admin={admin} aoMapa={aplicarMapa} aoOcupar={setAssociando}/>
 </>}
 <p className="comparacao-nota">Preços das suas compras, com as datas de cada registro. Não são ofertas atuais. {modo==='listas'?'Se um produto aparece mais de uma vez na lista, usamos a média ponderada pelas quantidades. ':''}Valores originais por produto; descontos gerais da nota não foram distribuídos. Quantidades diferentes não alteram o preço por unidade comparado.</p>
 </section>;
}
