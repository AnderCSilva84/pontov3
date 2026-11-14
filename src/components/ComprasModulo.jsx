import EstadoConclusaoCompra from './EstadoConclusaoCompra';
import {acompanharDialogViewport} from '../utils/dialogViewport';
import {compraConcluida} from '../utils/conclusaoCompra';
import CategoriaIcone from './CategoriaIcone';
import {useCatalogoContexto} from '../services/catalogoContexto';
import RevisarCategoriasProdutos from './RevisarCategoriasProdutos';
import {useCategoriasCompras} from '../services/categoriasCompras';
import { dataHoraExibicao } from '../utils/datasExibicao.js';
import {nomeProduto,nomesProdutosMaiusculos} from '../utils/nomeProduto';
import {produtosPrincipais} from '../utils/catalogoProdutos';
import RevisarProdutosParecidos from './RevisarProdutosParecidos';
import MesclarProdutos,{SugestoesProduto} from './AssociacoesProdutos';
import {tipoCompra,nomeTipoCompra,nomeAutorLista,TIPOS_COMPRAS} from '../utils/comprasTipo';
import {dataOperacional} from '../utils/dataPonto';
import { registrarPdf, validarPdf } from '../services/pdfArquivos';
import { PdfAcoes } from '../components/PdfAcoes';
import ConsultaPreco from './ConsultaPreco';
import GastosCompras from './GastosCompras';
import { agruparHistoricoMensal } from '../utils/comprasConsulta';
import { collection, doc } from '../services/dadosGrupo';
import { produtosEmOutrasListas } from '../utils/comprasColaboracao';
import { PageHeader, Icon } from './ui';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { onSnapshot, orderBy, query, where, limit } from 'firebase/firestore';
import { db } from '../services/firebase';
import { operarCompras, consultarPrecos, consultarEstimativa } from '../services/compras';
import { calcularEstimativa } from '../utils/comprasEstimativa';
import { normalizeRole } from '../utils/roles';
import { moeda, dataPreco, lerPreco, numeroCompras } from '../utils/comprasAnalise';
import { compartilharPdfNativo } from '../utils/comprovantes';
import iconesCategorias from '../../functions/compras-icones.json';
import BottomNav from './BottomNav';
import ComprasGraficos from './ComprasGraficos';
import CompararCompras from './CompararCompras';
import ImportarCupom from './ImportarCupom';
import '../styles/compras.css';
import '../styles/nav.css';

function Modal({ titulo, fechar, children }) {
  const ref = useRef(null);
  useEffect(() => { const dialog = ref.current; dialog.showModal(); const parar=acompanharDialogViewport(dialog); return () => {parar();dialog.close();}; }, []);
  return <dialog ref={ref} className="compras-dialog" onCancel={e => { e.preventDefault(); fechar(); }}><header><h2>{titulo}</h2><button type="button" className="btn btn-muted" onClick={fechar} aria-label="Fechar">×</button></header>{children}</dialog>;
}
function Campo({ nome, children, ...props }) { return <label className="field"><span>{nome}</span>{children || <input {...props} />}</label>; }
function AutoriaItem({ item, autores }) { const data = item.adicionadaEm?.toDate?.(); return <small className="compras-autoria-item">Adicionado por {item.solicitadaPorNome || item.solicitadoPorNome || autores[item.solicitadaPor] || 'autoria anterior não registrada'}{data ? ' · ' + dataHoraExibicao(data) : ''}</small>; }
function AvisoDuplicado({ listas }) { return listas?.length ? <small className="compras-duplicado" role="status">Existente em outra lista: {listas.map(l => l.titulo).join(', ')}</small> : null; }
function AutoriaLista({ lista }) { return <span className="compras-etiqueta compras-etiqueta-autor">{nomeAutorLista(lista)}</span>; }
function TipoLista({lista}) { return <span className="compras-etiqueta compras-etiqueta-tipo">{nomeTipoCompra(lista)}</span>; }
function EstadoItem({estado}){const comprado=['comprado','comprado_sem_preco'].includes(estado);return <span className={`compras-etiqueta ${comprado?'compras-estado-comprado':'compras-estado-pendente'}`}>{comprado?'Comprado':estado==='nao_comprado'?'Não comprado':'Pendente'}</span>;}
function CategoriaForm({ salvar, categoria }) {
  const [icone, setIcone] = useState(categoria?.icone || '📦');
  const [nome, setNome] = useState(categoria?.nome || ''), [buscaIcone, setBuscaIcone] = useState('');
  const normalizarBusca = v => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const opcoes = iconesCategorias.filter(i => normalizarBusca(i.nome).includes(normalizarBusca(buscaIcone)));
  return <form className="compras-form" onSubmit={e => { e.preventDefault(); salvar({ nome, icone }); }}>
    <Campo nome="Nome da categoria" name="nome" required disabled={Boolean(categoria)} maxLength={60} placeholder="Ex.: Oficina, Carro" value={nome} onChange={e => setNome(e.target.value)} />
    <div className="compras-categoria-previa" aria-label="Prévia da categoria"><span aria-hidden="true"><CategoriaIcone icone={icone} /></span><strong>{nome.trim() || 'Sua categoria'}</strong></div>
    <Campo nome="Buscar ícone na coleção" type="search" value={buscaIcone} onChange={e => setBuscaIcone(e.target.value)} placeholder="Ex.: carro, oficina, casa" />
    <fieldset className="compras-icones"><legend>Escolha um ícone</legend><div>{opcoes.map(i => <label key={i.icone} title={i.nome}><input type="radio" name="icone" value={i.icone} checked={icone === i.icone} onChange={() => setIcone(i.icone)} /><span aria-hidden="true"><CategoriaIcone icone={i.icone} /></span><small>{i.nome}</small></label>)}</div>{!opcoes.length && <p>Nenhum ícone encontrado. Use outro emoji abaixo.</p>}</fieldset>
    <Campo nome="Usar outro emoji como ícone" value={icone} onChange={e => setIcone(e.target.value)} maxLength={32} placeholder="Ex.: 🏎️" /><small>Escolha um único emoji no teclado do celular ou cole aqui. A prévia mostra como a categoria ficará.</small>
    <button className="btn btn-success">Salvar categoria</button>
  </form>;
}
function ProdutoForm({ categorias, salvar, produto, catalogo, associar, tipoCompra }) {
  const [entrada,setEntrada]=useState({nome:produto?.nome||''});
  return <form className="compras-form" onChange={e=>setEntrada(Object.fromEntries(new FormData(e.currentTarget)))} onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); salvar({ marca:f.get('marca'),gtin:f.get('gtin'),principioAtivo:f.get('principioAtivo'),dosagem:f.get('dosagem'), nome: f.get('nome'), apresentacao: f.get('apresentacao'), categoriaId: f.get('categoriaId'), unidadeCompra: f.get('unidadeCompra') }); }}>
    <Campo nome="Nome do produto" name="nome" required maxLength={120} placeholder="Arroz marca A" defaultValue={nomeProduto(produto?.nome)} onBlur={e=>{e.target.value=nomeProduto(e.target.value);}} />
    <Campo nome="Apresentação / embalagem" name="apresentacao" required maxLength={120} placeholder="Pacote de 1 kg, garrafa de 1 L…" defaultValue={produto?.apresentacao} />
    <Campo nome="Marca (opcional)" name="marca" maxLength={120} defaultValue={produto?.marca||''}/><Campo nome="GTIN/EAN — não é código interno da loja (opcional)" name="gtin" inputMode="numeric" maxLength={14} defaultValue={produto?.gtin||''}/><Campo nome="Princípio ativo (farmácia, opcional)" name="principioAtivo" maxLength={120} defaultValue={produto?.principioAtivo||''}/><Campo nome="Dosagem / concentração (opcional)" name="dosagem" maxLength={120} defaultValue={produto?.dosagem||''}/>{!produto&&<SugestoesProduto tipoCompra={tipoCompra} entrada={entrada} catalogo={catalogo} associar={p=>associar(p,entrada)}/>}
    <Campo nome="Seção do produto"><select name="categoriaId" defaultValue={produto?.categoriaId}>{categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></Campo>
    <Campo nome="Preço informado por"><select name="unidadeCompra" defaultValue={produto?.unidadeCompra}><option value="un">Unidade / embalagem</option><option value="kg">Quilo</option><option value="l">Litro</option><option value="m">Metro</option></select></Campo>{produto && <p className="text-muted">Itens já adicionados preservam sua apresentação. Para atualizar uma pendência, retire e adicione o produto novamente. Outra embalagem deve ser cadastrada como outro produto.</p>}<button className="btn btn-success">{produto?'Salvar produto':'Cadastrar como novo'}</button>
  </form>;
}
function MercadoForm({ salvar }) {
  return <form className="compras-form" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); salvar({ nome: f.get('nome'), filial: f.get('filial'), cidade: f.get('cidade') }); }}><Campo nome="Supermercado / estabelecimento" name="nome" required maxLength={120} /><Campo nome="Filial ou bairro" name="filial" required maxLength={120} /><Campo nome="Cidade" name="cidade" required maxLength={120} /><button className="btn btn-success">Salvar supermercado</button></form>;
}
function ItemForm({ item, mercados, mercadoPadrao, salvar }) {
  const [estado, setEstado] = useState('comprado');
  const [unidade, setUnidade] = useState(item.unidadeCompra || 'un');
  const unidades = { un: 'Unidades / embalagens', kg: 'Quilos (kg)', l: 'Litros (L)', m: 'Metros (m)' };
  const [erro, setErro] = useState('');
  return <form className="compras-form" onSubmit={e => { e.preventDefault(); try { setErro(''); const f = new FormData(e.currentTarget); salvar({ estado, ...(estado === 'comprado' ? { marca: f.get('marca'), unidadeCompra: unidade, quantidadeComprada: Number(String(f.get('quantidade')).replace(',', '.')), precoUnitarioCentavos: lerPreco(f.get('preco')), supermercadoId: f.get('mercado') } : {}) }); } catch (error) { setErro(error.message); } }}>
    <p>{item.apresentacao || 'Apresentação não informada no catálogo antigo.'}</p>
    <Campo nome="Situação"><select value={estado} onChange={e => setEstado(e.target.value)}><option value="comprado">Comprado com preço</option><option value="comprado_sem_preco">Comprado sem preço — importar nota depois</option><option value="pendente">Pendente</option><option value="nao_comprado">Não comprado</option></select></Campo>
    {estado === 'comprado' && <><Campo nome="Marca do produto (opcional)" name="marca" maxLength={80} defaultValue={item.marca || ''} placeholder="Ex.: Ypê; deixe vazio se não tiver marca" /><Campo nome="Unidade comprada"><select value={unidade} onChange={e => setUnidade(e.target.value)}>{Object.entries(unidades).map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select></Campo><Campo nome={`Quantidade comprada — ${unidades[unidade]}`} key={`q-${unidade}`} name="quantidade" inputMode="decimal" required defaultValue={unidade === item.unidadeCompra ? (item.quantidadeComprada || item.quantidadePlanejada) : ""} placeholder={unidade === 'un' ? 'Ex.: 3' : 'Ex.: 1,250'} /><Campo nome={`Preço por ${unidade === 'un' ? 'unidade / embalagem' : unidade} (R$)`} key={`p-${unidade}`} name="preco" inputMode="decimal" required defaultValue={unidade === item.unidadeCompra && item.precoUnitarioCentavos ? (item.precoUnitarioCentavos / 100).toFixed(2).replace('.', ',') : ''} placeholder="0,00" /><Campo nome="Supermercado"><select name="mercado" defaultValue={item.supermercadoId || mercadoPadrao} required><option value="">Selecione</option>{mercados.map(m => <option key={m.id} value={m.id}>{m.nome} · {m.filial} ({m.cidade})</option>)}</select></Campo><p className="text-muted">Confira a unidade e informe o preço por 1 {unidade}. Ex.: 1,250 kg × R$ 10,00/kg = R$ 12,50. Para uma garrafa de 2 L, use 2 litros com preço por litro, ou 1 unidade com preço da garrafa.</p></>}
    {erro && <p role="alert" className="mensagem erro">{erro}</p>}<button className="btn btn-success">Salvar item</button>
  </form>;
}

const PrecosCidade=lazy(()=>import('./PrecosCidade'));

export default function ComprasModulo({ user, onNavigate, rotaAtual }) {
  const segmentos = rotaAtual.split('/').filter(Boolean), listaId = segmentos[1] === 'listas' ? segmentos[2] : null;
  const tela = listaId ? 'lista' : segmentos[1] || 'listas';
  const central=tela==='cidade';

  const [revisaoAssociacoes,setRevisaoAssociacoes]=useState(0);
  const [itemEnviando,setItemEnviando] = useState(null);
  const [perfil, setPerfil] = useState(null), [categorias, setCategorias] = useState([]), [mercados, setMercados] = useState([]);
  const [histEstado,setHistEstado]=useState("carregando");
  const [listas, setListas] = useState([]), [historico, setHistorico] = useState([]), [lista, setLista] = useState(null), [itens, setItens] = useState([]);
  const [erro, setErro] = useState(''), [aviso, setAviso] = useState(''), [ocupado, setOcupado] = useState(false), [modal, setModal] = useState(null);
  const [mercadoPadrao, setMercadoPadrao] = useState(''), [busca, setBusca] = useState(''), [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [quantidades, setQuantidades] = useState({});
  const configTipos=useCategoriasCompras(tela==='cidade'?null:user);
  const habilitadas=configTipos.config?.habilitadas||[];
  const [tipoCatalogo,setTipoCatalogo]=useState('supermercado'),[tipoImportacao,setTipoImportacao]=useState(null);
  const [tipoFiltro,setTipoFiltro]=useState('todos'),[tipoRelatorio,setTipoRelatorio]=useState('supermercado');
  const contextoTipo=tela==='cidade'?null:tela==='listas'&&(!modal||modal.tipo==='novaLista')?null:modal?.tipo==='cupom'?(tipoImportacao||(listaId&&lista?tipoCompra(lista):habilitadas[0])):listaId?(lista?tipoCompra(lista):null):['consulta','precos','rankings'].includes(tela)?tipoRelatorio:tipoCatalogo;
  const paginaCatalogo=useCatalogoContexto(user,contextoTipo);
  const catalogo=(paginaCatalogo.produtos||[]).map(nomesProdutosMaiusculos);
  const [histInicio,setHistInicio]=useState(()=>{const d=new Date();d.setMonth(d.getMonth()-2,1);return dataOperacional(d.getTime());}),[histFim,setHistFim]=useState(dataOperacional()),[histLimite,setHistLimite]=useState(20),[histExcedido,setHistExcedido]=useState(false);
  const [arquivo, setArquivo] = useState(null), [relatorio, setRelatorio] = useState(null), [dias, setDias] = useState(90);
  const [online, setOnline] = useState(navigator.onLine);
  const [referencias, setReferencias] = useState(null), [erroEstimativa, setErroEstimativa] = useState(''), [carregandoEstimativa, setCarregandoEstimativa] = useState(false);
  const [baseEstimativa, setBaseEstimativa] = useState('ultimo'), [revisaoEstimativa, setRevisaoEstimativa] = useState(0);
  const admin = normalizeRole((perfil || user)?.role) === 'admin';
  const role = normalizeRole((perfil || user)?.role);
  const montar = (perfil || user)?.ativo !== false && ['admin','funcionario','consulta'].includes(role);
  const comprar = admin;
  const aberta = lista && ['rascunho', 'em_compra'].includes(lista.status);
  const podeEditarLista = montar && (role !== 'consulta' || lista?.status === 'rascunho');
  const [itensParalelos, setItensParalelos] = useState({chave:'',dados:{}});
  const [erroParalelos, setErroParalelos] = useState('');
  const idsParalelas = JSON.stringify(listas.filter(l => l.id !== listaId).map(l => l.id).sort());
  const chaveParalelas = `${listaId}:${idsParalelas}`;
  const duplicados = produtosEmOutrasListas(listas, itensParalelos.chave === chaveParalelas ? itensParalelos.dados : {}, listaId);
  const assinaturaEstimativa = JSON.stringify(itens.map(i => [i.id, i.produtoId, i.apresentacao || '', i.unidadePlanejada || i.unidadeCompra, i.estado]).sort());
  const estimativa = calcularEstimativa(itens, referencias || {}, baseEstimativa);
  const base = '/lista-compras';
  const navegar = caminho => { setErro(''); setAviso(''); setBusca(''); onNavigate(caminho); };
  const falhou = error => setErro(error?.message || 'Não foi possível carregar os dados. Confira sua conexão.');
  async function executar(operacao, dados, depois) {
    if (ocupado) return;
    setOcupado(true); if(operacao === 'item')setItemEnviando(dados.itemId); setErro(''); setAviso('');
    try { const resultado = await operarCompras(operacao, dados); if (depois) await depois(resultado); return resultado; }
    catch (error) { falhou(error); }
    finally { setOcupado(false); setItemEnviando(null); }
  }
  useEffect(() => {
    if (!user?.uid || central) return;
    const ler = setter => snap => setter(snap.docs.map(d => { const valor={...d.data(),id:d.id}; return valor; }));
    const erroSnapshot = () => setErro('Não foi possível atualizar as compras. Confira a conexão e entre novamente.');
    const assinaturas = [
      onSnapshot(doc(db, 'users', user.uid), d => setPerfil(d.data()), erroSnapshot),
      onSnapshot(query(collection(db, 'categoriasCompras'), orderBy('ordem')), ler(setCategorias), erroSnapshot),
      onSnapshot(collection(db, 'supermercados'), ler(setMercados), erroSnapshot),
      onSnapshot(query(collection(db, 'comprasListas'), where('status', 'in', ['rascunho', 'em_compra'])), ler(setListas), erroSnapshot),
    ];
    return () => assinaturas.forEach(desinscrever => desinscrever());
  }, [user?.uid,central]);
  useEffect(() => {
    if (!user?.uid || !listaId) return;
    const chave = listaId + ':' + idsParalelas;
    setErroParalelos('');
    const cancelar = JSON.parse(idsParalelas).map(id => onSnapshot(collection(db,'comprasListas',id,'itens'), snap => {
      setItensParalelos(antes => ({chave,dados:{...(antes.chave === chave ? antes.dados : {}),[id]:snap.docs.map(d=>d.data())}}));
    }, () => setErroParalelos('Não foi possível conferir itens de outras listas.')));
    return () => cancelar.forEach(fn=>fn());
  }, [user?.uid, listaId, idsParalelas]);
  useEffect(() => {
    if (!user?.uid || !admin || central) return;
    let ativo = true;
    operarCompras('inicializar').catch(error => { if (ativo) falhou(error); });
    return () => { ativo = false; };
  }, [user?.uid, admin,central]);
  useEffect(() => {
    setHistorico([]); setHistExcedido(false); setHistEstado("carregando");
    if (!user?.uid || tela !== 'historico' || !histInicio || !histFim || histInicio>histFim) return;
    return onSnapshot(query(collection(db, 'comprasListas'), where('status', 'in', ['finalizada', 'anulada']), where('finalizadaEm','>=',new Date(histInicio+'T00:00:00-03:00')),where('finalizadaEm','<=',new Date(histFim+'T23:59:59.999-03:00')),orderBy('finalizadaEm', 'desc'),limit(501)), snap => {setHistEstado("pronto");setHistExcedido(snap.size>500);setHistorico(snap.size>500?[]:snap.docs.map(d => ({ ...d.data(), id: d.id })));}, () => {setHistEstado("erro");setErro('Não foi possível carregar o histórico. Tente novamente.');});
  }, [user?.uid, tela,histInicio,histFim]);
  useEffect(() => {
    setLista(null); setItens([]);
    if (!user?.uid || !listaId) return;
    const cancelarLista = onSnapshot(doc(db, 'comprasListas', listaId), snap => { if (!snap.exists()) setErro('Lista não encontrada.'); else setLista({ ...snap.data(), id: snap.id }); }, falhou);
    const cancelarItens = onSnapshot(collection(db, 'comprasListas', listaId, 'itens'), snap => setItens(snap.docs.map(d => ({ ...d.data(), id: d.id }))), falhou);
    return () => { cancelarLista(); cancelarItens(); };
  }, [user?.uid, listaId]);
  useEffect(() => {
    if (!user?.uid || !['precos', 'rankings', 'consulta'].includes(tela)) return;
    let ativo = true;
    setRelatorio(null);
    consultarPrecos(Date.now() - (tela === 'consulta' ? 365 : dias) * 86400000, Date.now(),tipoRelatorio,{incluirListas:tela==='precos'}).then(dados => { if (ativo) setRelatorio(dados); }).catch(error => { if (ativo) falhou(error); });
    return () => { ativo = false; };
  }, [user?.uid, tela, dias,tipoRelatorio,revisaoAssociacoes]);
  useEffect(() => () => { if (arquivo?.url) URL.revokeObjectURL(arquivo.url); }, [arquivo]);
  useEffect(() => {
    setReferencias(null); setErroEstimativa('');
    if (!user?.uid || !listaId || !aberta) { setCarregandoEstimativa(false); return; }
    let ativo = true;
    setCarregandoEstimativa(true);
    consultarEstimativa(listaId).then(r => { if (ativo) setReferencias(r.referencias); }).catch(e => { if (ativo) setErroEstimativa(e.message); }).finally(() => { if (ativo) setCarregandoEstimativa(false); });
    return () => { ativo = false; };
  }, [user?.uid, listaId, aberta, assinaturaEstimativa, revisaoEstimativa, online]);
  useEffect(() => {
    const atualizar = () => setOnline(navigator.onLine);
    window.addEventListener('online', atualizar); window.addEventListener('offline', atualizar);
    return () => { window.removeEventListener('online', atualizar); window.removeEventListener('offline', atualizar); };
  }, []);

  const mercadosAtivos = mercados.filter(m => m.ativo !== false);
  const grupos = useMemo(() => categorias.map(c => ({ ...c, itens: itens.filter(i => i.categoriaId === c.id && `${i.nomeSnapshot} ${i.apresentacao}`.toLowerCase().includes(busca.toLowerCase())).sort((a, b) => a.nomeSnapshot.localeCompare(b.nomeSnapshot, 'pt-BR')) })).filter(c => c.itens.length), [categorias, itens, busca]);
  const produtos = produtosPrincipais(catalogo,{busca,categoriaId:categoriaFiltro,tipoCompra:contextoTipo}).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
  async function exportarComparacao(linhas,opcoes) {
    if(ocupado)return;const sessaoPdf=registrarPdf({});setOcupado(true);setErro('');
    try{const {gerarPdfComparacaoPrecos}=await import('../utils/exportarPdfComparacaoPrecos');const pdf=await gerarPdfComparacaoPrecos(linhas,opcoes);validarPdf(sessaoPdf);setArquivo({...pdf,file:registrarPdf(new File([pdf.blob],pdf.nomeArquivo,{type:'application/pdf'})),url:URL.createObjectURL(pdf.blob)});setModal({tipo:'compartilhar'});}catch(e){falhou(e);}finally{setOcupado(false);}
  }
  async function exportarGastos(){
    const sessaoPdf=registrarPdf({});setOcupado(true);setErro('');
    try{const {gerarPdfGastosCompras}=await import('../utils/exportarPdfGastosCompras');const pdf=await gerarPdfGastosCompras(historicoFiltrado,{inicio:histInicio,fim:histFim});validarPdf(sessaoPdf);setArquivo({...pdf,file:registrarPdf(new File([pdf.blob],pdf.nomeArquivo,{type:'application/pdf'})),url:URL.createObjectURL(pdf.blob)});setModal({tipo:'compartilhar'});}catch(e){falhou(e);}finally{setOcupado(false);}
  }
  async function compartilhar() {
    const sessaoPdf = registrarPdf({});
    setOcupado(true); setErro('');
    try {
      const pendentes = itens.filter(i => i.estado === 'pendente').map(i => ({ nome: `${i.quantidadePlanejada} ${i.unidadeCompra} · ${nomeProduto(i.nomeSnapshot)}${i.apresentacao ? ` (${i.apresentacao})` : ''}`, categoria: categorias.find(c => c.id === i.categoriaId)?.nome || 'Diversos' }));
      if (!pendentes.length) throw new Error('Não há itens pendentes para compartilhar.');
      const { gerarPdfListaCompras } = await import('../utils/exportarPdfListaCompras');
      let refs = referencias;
      if (online && !refs) { try { refs = (await consultarEstimativa(listaId)).referencias; } catch { if (erroEstimativa) refs = null; } }
      const pdf = await gerarPdfListaCompras(pendentes, { titulo: lista.titulo, tipoCompra:tipoCompra(lista), estimativa: refs ? calcularEstimativa(itens, refs, baseEstimativa) : null, baseEstimativa, estimativaIndisponivel: !refs });
      validarPdf(sessaoPdf);
      setArquivo({ ...pdf, file: registrarPdf(new File([pdf.blob], pdf.nomeArquivo, { type: 'application/pdf' })), url: URL.createObjectURL(pdf.blob) });
      setModal({ tipo: 'compartilhar' });
    } catch (error) { falhou(error); } finally { setOcupado(false); }
  }
  const historicoFiltrado=historico.filter(l=>tipoFiltro==='todos'||tipoCompra(l)===tipoFiltro);
  const fechar = () => setModal(null);
  const salvarModal = (operacao, dados) => executar(operacao, {...dados,tipoCompra:contextoTipo}, () => { paginaCatalogo.atualizar(); fechar(); setAviso('Salvo com sucesso.'); });
  return <div className="page-bg page-compras"><main className="page-shell compras-shell compras-modulo" aria-busy={ocupado}>
    <PageHeader title="Compras" subtitle="Planejar, comprar e comparar." back={() => onNavigate(admin ? "/admin" : "/ponto")} />
          {user && <nav className="compras-subnav" aria-label="Compras">{[['listas', 'Listas'], ['catalogo', 'Catálogo'], ['historico', 'Histórico'], ['consulta', 'Consulta de preço'], ['precos', 'Preços'], ['rankings', 'Rankings'], ['cidade','Preços na cidade'], ...(admin ? [['categorias', 'Categorias']] : [])].map(([chave, titulo]) => <button key={chave} className={(tela === chave || (tela === 'lista' && chave === 'listas')) ? 'active' : ''} aria-current={tela === chave ? 'page' : undefined} onClick={() => navegar(chave === 'listas' ? base : `${base}/${chave}`)}>{titulo}</button>)}</nav>}
    
    {!user && <section className="card"><h2>Entre para acessar as compras</h2><button className="btn btn-primary" onClick={() => onNavigate('/ponto')}>Entrar no app</button></section>}
    {user&&tela!=='cidade'&&<><Campo nome="Categoria de compras do catálogo"><select value={contextoTipo||tipoCatalogo} disabled={Boolean(listaId)||modal?.tipo==='cupom'} onChange={e=>{setTipoCatalogo(e.target.value);setTipoRelatorio(e.target.value);setCategoriaFiltro('');setBusca('');}}>{Object.entries(TIPOS_COMPRAS).map(([id,nome])=><option key={id} value={id}>{nome}</option>)}</select></Campo>{paginaCatalogo.erro&&<p role="alert">{paginaCatalogo.erro}</p>}<button type="button" className="btn btn-secondary compras-atualizar" disabled={paginaCatalogo.carregando} onClick={paginaCatalogo.atualizar}><Icon name="refresh"/><span>Atualizar produtos</span></button>{paginaCatalogo.temMais&&<button type="button" className="compras-link" onClick={paginaCatalogo.mais}>Carregar mais produtos desta categoria</button>}{admin&&tela==='catalogo'&&<RevisarCategoriasProdutos atualizar={paginaCatalogo.atualizar}/>}<button type="button" className="btn btn-secondary compras-atualizar" disabled={configTipos.carregando} onClick={configTipos.atualizar}><Icon name="refresh"/><span>Atualizar categorias</span></button>{configTipos.erro&&<p role="alert">{configTipos.erro}</p>}</>}{!online && <p className="mensagem erro" role="status">Sem conexão. Os dados exibidos podem estar desatualizados. Conecte-se para salvar ou finalizar.</p>}{erro && <p className="mensagem erro" role="alert">{erro}</p>}{aviso && <p className="mensagem" role="status">{aviso}</p>}{ocupado && <p role="status" className="text-muted">Salvando…</p>}
    {user && tela === 'cidade' && <Suspense fallback={<p role="status">Carregando a Central…</p>}><PrecosCidade key={user.uid+':'+user.grupoId} user={user}/></Suspense>}
    {user && tela === 'categorias' && admin && <section className="compras-form"><div><h2>Categorias</h2><p>Organize os produtos e escolha um ícone da coleção ou use outro emoji.</p><button className="btn btn-success" disabled={ocupado} onClick={() => setModal({ tipo: 'categoria' })}>+ Nova categoria</button></div><div className="compras-categorias-grade">{categorias.map(c => <article className="card" key={c.id}><span aria-hidden="true"><CategoriaIcone icone={c.icone} /></span><strong>{c.nome}</strong><button className="compras-link" aria-label={`Editar ícone de ${c.nome}`} onClick={() => setModal({ tipo: 'categoria', categoria: c })}>Editar ícone</button></article>)}</div></section>}
    {user&&tela==='catalogo'&&admin&&<RevisarProdutosParecidos key={user.uid+':'+(user.grupoId||'legado')+':'+contextoTipo} tipoCompra={contextoTipo} atualizar={r=>{paginaCatalogo.aplicarMescla(r);setRevisaoAssociacoes(n=>n+1);}}/>}
    {user&&tela==='catalogo'&&admin&&<details className="card"><summary>Mesclar produtos e revisar associações</summary><MesclarProdutos tipoCompra={contextoTipo} key={contextoTipo} catalogo={catalogo} atualizar={r=>{paginaCatalogo.aplicarMescla(r);setRevisaoAssociacoes(n=>n+1);}}/></details>}
    {user && tela === 'catalogo' && <section className="compras-form"><div><h2>Catálogo de produtos</h2><p>Cadastre produtos para esta categoria de compras. O cadastro não cria uma compra nem registra preços.</p></div>{admin && <button className="btn btn-success" disabled={ocupado || !categorias.length} onClick={() => setModal({ tipo: 'produto', novoId: crypto.randomUUID() })}>Adicionar item</button>}<p className="text-muted" role="status">{paginaCatalogo.carregando ? 'Carregando produtos…' : `${produtos.length} produto(s) exibido(s) de ${produtosPrincipais(catalogo,{tipoCompra:contextoTipo}).length} produtos carregados.${paginaCatalogo.temMais ? ' O catálogo ainda está parcial.' : ' Catálogo completo para esta classificação.'}`}</p><Campo nome="Buscar produto" type="search" value={busca} onChange={e => setBusca(e.target.value)} />{paginaCatalogo.temMais&&<div className="card"><p role="status">O catálogo está parcialmente carregado. A busca considera os {catalogo.length} cadastros carregados até agora.</p><button type="button" className="btn btn-primary" disabled={paginaCatalogo.carregando} onClick={paginaCatalogo.todos}>{paginaCatalogo.carregandoTodos?'Carregando catálogo completo…':'Carregar catálogo completo'}</button>{paginaCatalogo.carregandoTodos&&<button type="button" className="btn btn-secondary" onClick={paginaCatalogo.parar}>Parar carregamento</button>}</div>}{(busca||categoriaFiltro)&&<button type="button" className="compras-link" onClick={()=>{setBusca('');setCategoriaFiltro('');}}>Limpar busca e filtros</button>}<Campo nome="Filtrar por categoria"><select value={categoriaFiltro} onChange={e => setCategoriaFiltro(e.target.value)}><option value="">Todas</option>{categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></Campo><div className="compras-catalogo-grade">{produtos.map(p => { const categoria = categorias.find(c => c.id === p.categoriaId); return <article className="card compras-catalogo-produto" key={p.id}><span className="compras-catalogo-icone" aria-hidden="true"><CategoriaIcone icone={categoria?.icone} /></span><div><strong>{p.nome}</strong>{p.principalId&&<small>Histórico associado a {catalogo.find(c=>c.id===p.principalId)?.nome||p.principalId}</small>}<AvisoDuplicado listas={duplicados[p.id]} /><small>{p.apresentacao || 'Apresentação não informada'} · {p.unidadeCompra || 'un'}</small><small>{categoria?.nome || 'Diversos'}</small>{admin && <button className="compras-link" disabled={ocupado} onClick={() => setModal({ tipo: 'produto', produto: p })}>Editar produto</button>}{admin && <button className="compras-link compras-excluir-produto" disabled={ocupado} onClick={()=>{if(window.confirm(`Excluir ${p.nome} do catálogo? Compras, preços e históricos serão preservados. O produto não ficará disponível para novas listas.`))executar('produtoExcluir',{produtoId:p.id,confirmado:true},()=>{paginaCatalogo.atualizar();setAviso('Produto excluído do catálogo. Histórico preservado.');});}}>Excluir do catálogo</button>}</div></article>; })}</div>{paginaCatalogo.temMais&&<button type="button" className="btn btn-secondary" disabled={paginaCatalogo.carregando} onClick={paginaCatalogo.todos}>Carregar os demais produtos do catálogo</button>}{!produtos.length && <p className="card">{paginaCatalogo.carregando ? 'Carregando produtos…' : paginaCatalogo.temMais ? 'Nenhum produto nos dados carregados. Carregue mais para continuar a busca.' : busca || categoriaFiltro ? 'Nenhum produto nesta categoria para os filtros informados.' : 'Nenhum produto nesta categoria'}</p>}</section>}
    {user && tela === 'listas' && <>
      {montar && <button className="btn btn-success" disabled={ocupado || !categorias.length} onClick={() => setModal({ tipo: 'novaLista', novoId: crypto.randomUUID() })}>+ Montar nova lista</button>}
      {admin && <details className="card"><summary>Importar cupom fiscal</summary><button className="btn btn-secondary" disabled={ocupado || !categorias.length} onClick={() => {setTipoImportacao(null);setModal({ tipo: 'cupom' });}}>Abrir importação</button></details>}
      {!categorias.length && <p className="card">{admin ? 'Preparando categorias e importando a lista anterior…' : 'O administrador precisa abrir Compras uma vez para preparar o módulo.'}</p>}
      {!listas.length && categorias.length > 0 && <p className="card">Nenhuma lista aberta. Crie uma lista para começar.</p>}
      {[...listas].sort((a, b) => (b.criadaEm?.seconds || 0) - (a.criadaEm?.seconds || 0)).map(l => <button key={l.id} className="card compras-lista-cartao" onClick={() => navegar(`${base}/listas/${l.id}`)}><span><strong>{l.titulo}</strong><AutoriaLista lista={l} /><TipoLista lista={l} /><small>{l.quantidadeItens} itens · {l.status === 'em_compra' ? 'Em compra' : 'Em preparação'}</small></span><span aria-hidden="true">→</span></button>)}
    </>}
    {user && tela === 'lista' && lista && <>
      <ol className="compras-etapas" aria-label="Etapas da compra">{["Preparar lista","Realizar compra","Conferir e finalizar"].map((nome,i) => <li key={nome} aria-current={(lista.status === "rascunho" ? 0 : lista.status === "em_compra" ? 1 : 2) === i ? "step" : undefined}>{i+1}. {nome}</li>)}</ol><section className="compras-lista-topo"><h2>{lista.titulo}</h2><AutoriaLista lista={lista} /><TipoLista lista={lista} />{admin&&aberta&&<Campo nome="Classificação da lista"><select value={tipoCompra(lista)} disabled={ocupado} onChange={e=>{if(window.confirm("Alterar a classificação desta lista aberta?"))executar("tipoCompra",{listaId,versao:lista.versao,tipoCompra:e.target.value});}}>{Object.entries(TIPOS_COMPRAS).filter(([id])=>habilitadas.includes(id)||id===tipoCompra(lista)).map(([id,nome])=><option key={id} value={id}>{nome}</option>)}</select></Campo>}<p className="text-muted">{lista.status === 'rascunho' ? 'Em preparação' : lista.status === 'em_compra' ? 'Em compra' : lista.status === 'anulada' ? `Anulada: ${lista.motivoAnulacao}` : `Finalizada · ${moeda(lista.totalCentavos)}`}</p><div className="compras-acoes-principais">
        {aberta && podeEditarLista && <button className="btn btn-secondary" disabled={ocupado} onClick={() => { setBusca(''); setModal({ tipo: 'catalogo' }); }}>Adicionar produtos</button>}
        {lista.status === 'rascunho' && comprar && <button className="btn btn-success" disabled={ocupado || !itens.length} onClick={() => executar('iniciar', { listaId })}>Iniciar compra</button>}
        {lista.status === 'em_compra' && comprar && <button className="btn btn-success" disabled={ocupado || itens.some(i => i.estado === 'comprado_sem_preco')} onClick={() => setModal({ tipo: 'finalizar', versao: lista.versao })}>Finalizar compra</button>}
      </div><details className="compras-acoes-secundarias"><summary>Mais opções da lista</summary><div>        {aberta && comprar && <button className="btn btn-secondary" disabled={ocupado} onClick={() => {setTipoImportacao(null);setModal({ tipo: 'cupom' });}}>Importar e comparar cupom</button>}
        {aberta && <button className="btn btn-secondary" disabled={ocupado || !itens.some(i => i.estado === 'pendente')} onClick={compartilhar}>Compartilhar lista</button>}
        {lista.status === 'finalizada' && admin && <button className="btn btn-secondary" disabled={ocupado} onClick={() => setModal({ tipo: 'anular' })}>Anular compra</button>}
        {admin && <button className="btn btn-danger" disabled={ocupado} onClick={() => setModal({ tipo: 'excluir', versao: lista.versao })}>Excluir lista</button>}</div></details></section>
      {aberta && itens.length > 0 && <section className="card compras-estimativa" aria-label="Estimativa de gasto"><div className="compras-estimativa-cabecalho"><div><span className="compras-estimativa-selo">Estimativa</span><h3>Previsão da compra</h3></div><strong className="compras-estimativa-valor" aria-live="polite">{carregandoEstimativa ? 'Calculando…' : erroEstimativa ? 'Indisponível' : estimativa.totalCentavos === null ? 'Sem base de preços' : `${estimativa.semPreco.length ? 'Parcial: ' : ''}${moeda(estimativa.totalCentavos)}`}</strong></div><Campo nome="Base da estimativa"><select value={baseEstimativa} onChange={e => setBaseEstimativa(e.target.value)}><option value="ultimo">Último preço registrado</option><option value="media">Média dos últimos 10 preços</option></select></Campo>{erroEstimativa ? <p role="status">{erroEstimativa}</p> : !carregandoEstimativa && <><p>{estimativa.pendentesComPreco} {estimativa.pendentesComPreco === 1 ? 'item com preço histórico' : 'itens com preço histórico'}{estimativa.semPreco.length ? ` · ${estimativa.semPreco.length} sem preço, fora do cálculo` : ''}.</p>{estimativa.subtotalInformadoCentavos > 0 && <p>Já registrado: {moeda(estimativa.subtotalInformadoCentavos)} · Estimado para os pendentes: {moeda(estimativa.subtotalEstimadoCentavos)}</p>}<small>Referência entre os supermercados cadastrados, para a mesma embalagem e unidade. Os valores podem variar e não preveem descontos.</small></>}<button className="compras-link" disabled={carregandoEstimativa} onClick={() => setRevisaoEstimativa(n => n + 1)}>Atualizar estimativa</button></section>}
      {lista.origem === 'cupom' && <section className="card cupom-resumo"><p>Valor original: {moeda(lista.totalOriginalCentavos)} · Desconto: {moeda(lista.descontoCentavos)}</p><p><strong>Total pago usado na integração com o No Bolso: {moeda(lista.totalCentavos)}</strong></p><p>{lista.quantidadeItensCupom} linhas no cupom · {lista.quantidadeDescartados} descartadas da importação. Os preços dos produtos abaixo são os originais da nota.</p></section>}
      {lista.status === 'em_compra' && comprar && <section className="card compras-form"><Campo nome="Supermercado padrão desta compra"><select value={mercadoPadrao} onChange={e => setMercadoPadrao(e.target.value)}><option value="">Selecione ao registrar cada item</option>{mercadosAtivos.map(m => <option key={m.id} value={m.id}>{m.nome} · {m.filial} ({m.cidade})</option>)}</select></Campo><button className="btn btn-secondary" disabled={ocupado} onClick={() => setModal({ tipo: 'mercado' })}>+ Cadastrar supermercado</button><p className="text-muted">Você pode escolher outro supermercado em cada produto.</p></section>}
      {erroParalelos && <p role="status" className="text-muted">{erroParalelos}</p>}<details className="compras-opcoes"><summary>Buscar item</summary><Campo nome="Nome ou apresentação" value={busca} onChange={e => setBusca(e.target.value)} type="search" /></details>
      {!itens.length && <p className="card">Sua lista está vazia. Adicione produtos do catálogo.</p>}
      {grupos.map(c => <section key={c.id} className="compras-categoria"><h2><span aria-hidden="true"><CategoriaIcone icone={c.icone} /></span> {c.nome}</h2><div className="compras-papel">{c.itens.map(item => <article className={`compras-produto ${item.estado}${compraConcluida(item,itemEnviando===item.id)?' entrada-concluida':''}`} key={item.id}><div><strong>{nomeProduto(item.nomeSnapshot)}</strong><EstadoItem estado={item.estado}/><EstadoConclusaoCompra concluido={compraConcluida(item,itemEnviando===item.id)} aguardando={itemEnviando===item.id}/><AutoriaItem item={item} autores={{}} /><AvisoDuplicado listas={duplicados[item.produtoId]} />{item.marca && <small>Marca: {item.marca}</small>}<small>{item.apresentacao || 'Apresentação não informada'} · {lista.origem === 'cupom' && item.estado === 'comprado' ? `${numeroCompras(item.quantidadeComprada)} ${item.unidadeCompra} na nota` : `${numeroCompras(item.quantidadePlanejada)} ${item.unidadePlanejada || item.unidadeCompra} planejados`}</small>{item.estado === 'comprado' ? <><span className="compras-preco">{moeda(item.precoUnitarioCentavos)}/{item.unidadeCompra} × {numeroCompras(item.quantidadeComprada)} = {moeda(item.totalCentavos)}</span><small>{item.supermercadoNome}</small></> : <small>{item.estado==='comprado_sem_preco'?'Aguardando preço / nota':''}</small>}{aberta && ['pendente', 'comprado_sem_preco'].includes(item.estado) && !carregandoEstimativa && !erroEstimativa && referencias && (estimativa.porItem[item.id] ? <div className="compras-item-estimativa"><strong>Estimado: {moeda(estimativa.porItem[item.id].totalCentavos)}</strong><small>{moeda(estimativa.porItem[item.id].precoCentavos)}/{estimativa.porItem[item.id].unidade} · {baseEstimativa === 'media' ? `Média de ${estimativa.porItem[item.id].amostra} registro(s)` : `Último preço em ${dataPreco(estimativa.porItem[item.id].ultimoEmMs)}`}</small>{baseEstimativa === 'ultimo' && <small>{estimativa.porItem[item.id].supermercadoNome}</small>}</div> : <small className="compras-sem-estimativa">Sem preço histórico para esta embalagem e unidade.</small>)}</div><div className="compras-produto-acoes">{lista.status === 'em_compra' && comprar && item.estado === 'pendente' && <button className="btn btn-success" disabled={ocupado} onClick={() => executar('item', { listaId, itemId: item.id, versao: item.versao, estado: 'comprado_sem_preco' })}>Comprado sem preço</button>}{lista.status === 'em_compra' && comprar && <button className="btn btn-secondary" disabled={ocupado} onClick={() => setModal({ tipo: 'item', item })}>{item.estado === 'comprado' ? 'Editar preço' : item.estado === 'comprado_sem_preco' ? 'Preencher preço' : 'Registrar preço'}</button>}{aberta && podeEditarLista && !['comprado', 'comprado_sem_preco'].includes(item.estado) && (admin || item.solicitadaPor === user.uid) && <button className="compras-link" disabled={ocupado} onClick={() => executar('remover', { listaId, itemId: item.id, versao: item.versao })} aria-label={`Retirar ${item.nomeSnapshot} da lista`}>Retirar</button>}</div></article>)}</div></section>)}
      {lista.status === 'em_compra' && <p className="card compras-total">Total informado <strong>{moeda(itens.filter(i => i.estado === 'comprado').reduce((s, i) => s + i.totalCentavos, 0))}</strong><small>{itens.filter(i => i.estado === 'comprado_sem_preco').length} comprado(s) aguardando preço ou nota. Preencha os preços ou importe o cupom antes de finalizar.</small></p>}
    </>}
    {user && tela === 'historico' && <><div className="compras-form compras-historico-filtros"><Campo nome="De" type="date" value={histInicio} onChange={e=>{setHistInicio(e.target.value);setHistLimite(20);}}/><Campo nome="Até" type="date" value={histFim} onChange={e=>{setHistFim(e.target.value);setHistLimite(20);}}/><Campo nome="Classificação"><select value={tipoFiltro} onChange={e=>setTipoFiltro(e.target.value)}><option value="todos">Todas as categorias</option>{Object.entries(TIPOS_COMPRAS).map(([id,nome])=><option key={id} value={id}>{nome}</option>)}</select></Campo></div>{histEstado==='carregando'&&<p role="status">Carregando histórico de compras…</p>}{histEstado==='pronto'&&<>{histExcedido?<p role="alert">Mais de 500 compras no período. Escolha um período menor para calcular os gastos completos.</p>:<><GastosCompras listas={historicoFiltrado} inicio={histInicio} fim={histFim} tipoFiltro={tipoFiltro}/><button className="btn btn-secondary" disabled={ocupado||!historicoFiltrado.length} onClick={exportarGastos}>Exportar gastos filtrados (PDF)</button></>} {!historicoFiltrado.length && <p className="card">Nenhuma compra finalizada para este período e classificação.</p>}{agruparHistoricoMensal(historicoFiltrado).map(mes => <details className="card compras-pasta-mes" key={mes.chave}><summary><strong>{mes.chave === 'Sem data' ? mes.chave : new Date(mes.listas[0].finalizadaEm.toMillis()).toLocaleDateString('pt-BR',{month:'long',year:'numeric',timeZone:'America/Fortaleza'})}</strong><span>{mes.listas.length} compra(s) · Gasto: <strong>{moeda(mes.totalCentavos)}</strong></span></summary><small>Total das compras finalizadas do mês dentro do período. Compras anuladas não entram na soma.</small>{mes.listas.slice(0,histLimite).map(l => <button key={l.id} className="card compras-lista-cartao" onClick={() => navegar(`${base}/listas/${l.id}`)}><span><strong>{l.titulo}</strong><AutoriaLista lista={l} /><TipoLista lista={l} /><small>{l.finalizadaEm ? dataPreco(l.finalizadaEm.toMillis()) : ''} · {l.status === 'anulada' ? 'Anulada' : `${l.quantidadeComprados} produtos`}</small></span><strong>{moeda(l.totalCentavos)}</strong></button>)}</details>)}{historicoFiltrado.length>histLimite&&<button className="btn btn-secondary" onClick={()=>setHistLimite(n=>n+20)}>Mostrar mais 20 compras</button>}</>}</>}
    {user && ['consulta','precos','rankings'].includes(tela)&&<Campo nome="Classificação dos preços"><select value={tipoRelatorio} onChange={e=>setTipoRelatorio(e.target.value)}>{Object.entries(TIPOS_COMPRAS).map(([id,nome])=><option key={id} value={id}>{nome}</option>)}</select></Campo>}
    {user && tela === 'consulta' && (!relatorio ? <p role="status">Consultando preços confirmados…</p> : <ConsultaPreco registros={relatorio.registros} catalogo={catalogo} categorias={categorias} />)}
    {user && ['precos', 'rankings'].includes(tela) && <><Campo nome="Período"><select value={dias} onChange={e => setDias(Number(e.target.value))}><option value={30}>Últimos 30 dias</option><option value={90}>Últimos 90 dias</option><option value={365}>Últimos 12 meses</option></select></Campo>{!relatorio && !erro && <p role="status">Consultando preços confirmados…</p>}{relatorio && (tela === 'precos' ? <><CompararCompras aoCatalogoAtualizar={paginaCatalogo.aplicarMescla} aoExportarPdf={exportarComparacao} exportando={ocupado} admin={admin} key={user.uid+':'+tipoRelatorio+':'+dias} registros={relatorio.registros} listas={relatorio.listas} listasLimitadas={relatorio.listasLimitadas} tipoCompra={tipoRelatorio} inicioMs={Date.now()-dias*86400000} fimMs={Date.now()}/><details className="card"><summary>Evolução de preços de um produto</summary><ComprasGraficos registros={relatorio.registros} catalogo={catalogo} categorias={categorias} admin={admin} versaoAssociacoes={relatorio.associacoesVersao} atualizar={()=>{paginaCatalogo.atualizar();setRevisaoAssociacoes(n=>n+1);}}/></details></> : <>
      <Ranking titulo="Top 10 mais comprados" explicacao="Número de compras distintas no período." itens={relatorio.rankings.frequencias} valor={r => `${r.compras} compra(s)`} />
      <Ranking titulo="Top 10 maiores variações" explicacao="Primeiro e último preço no mesmo supermercado. Ordenado pela variação percentual absoluta; altas e quedas." itens={relatorio.rankings.variacoes} valor={r => `${r.percentual > 0 ? '+' : ''}${r.percentual.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% · ${moeda(r.inicialCentavos)} → ${moeda(r.finalCentavos)} /${r.unidade}`} detalhe={r => `${r.supermercado} · ${dataPreco(r.inicioMs)} a ${dataPreco(r.fimMs)}`} />
      <Ranking titulo="Top 10 maiores preços" explicacao="Maior entre os últimos preços de cada produto por supermercado no período. Preço por unidade indicada, não o total da compra." itens={relatorio.rankings.precos} valor={r => `${moeda(r.precoCentavos)}/${r.unidade}`} detalhe={r => `${r.supermercado} · ${dataPreco(r.dataMs)}`} />
    </>)}</>}
  </main>
    {modal && <Modal titulo={{ cupom: 'Importar cupom fiscal', excluir: 'Excluir lista', categoria: modal.categoria ? 'Editar ícone da categoria' : 'Nova categoria', novaLista: 'Montar lista', catalogo: 'Adicionar produtos', produto: 'Produto do catálogo', mercado: 'Cadastrar supermercado', item: modal.item?.nomeSnapshot, finalizar: 'Finalizar compra', anular: 'Anular compra', compartilhar: 'Compartilhar lista' }[modal.tipo]} fechar={fechar}>
      {erro && <p role="alert" className="mensagem erro">{erro}</p>}<fieldset disabled={ocupado} className="compras-fieldset">
        {modal.tipo === 'cupom' && admin && <ImportarCupom catalogoPaginacao={paginaCatalogo} onTipoChange={setTipoImportacao} tiposHabilitados={habilitadas} categorias={categorias} catalogo={catalogo} mercados={mercados} listasDisponiveis={listas} listaDestino={listaId && aberta ? lista : null} aoImportar={r => { paginaCatalogo.atualizar(); fechar(); navegar(`${base}/listas/${r.listaId}`); setAviso('Compra finalizada com o cupom. Preços originais no histórico; total pago na compra.'); }} />}
        {modal.tipo === 'excluir' && admin && <form className="compras-form" onSubmit={e => { e.preventDefault(); executar('excluir', { listaId, versao: modal.versao }, () => { fechar(); navegar(base); setAviso('Lista excluída.'); }); }}><p>Excluir “{lista?.titulo}”? Os itens e preços dessa lista serão removidos e deixarão de aparecer no histórico, gráficos, rankings e No Bolso. O catálogo de produtos será mantido.</p><label className="compras-permissao"><input type="checkbox" required />Confirmo a exclusão desta lista.</label><button className="btn btn-danger">Confirmar exclusão</button></form>}
        {modal.tipo === 'novaLista' && <form className="compras-form" onSubmit={e => { e.preventDefault(); const f=new FormData(e.currentTarget),titulo = f.get('titulo'); executar('criar', { titulo, tipoCompra:f.get('tipoCompra'), listaId: modal.novoId }, r => { fechar(); navegar(`${base}/listas/${r.listaId}`); }); }}><>{listas.length > 0 && <p role="status">Existem {listas.length} lista(s) ainda não finalizada(s): {listas.map(l=>l.titulo).join(", ")}. Produtos repetidos terão o aviso “Existente em outra lista”.</p>}</><Campo nome="Nome da lista" name="titulo" required maxLength={120} placeholder="Compras da semana" />{!configTipos.config&&<p role="status">{configTipos.carregando?'Carregando categorias disponíveis…':'Não foi possível carregar as categorias. Atualize antes de criar uma lista.'}</p>}<Campo nome="Classificação"><select name="tipoCompra" defaultValue={habilitadas[0]} required disabled={!habilitadas.length}>{habilitadas.map(id=><option key={id} value={id}>{TIPOS_COMPRAS[id]}</option>)}</select></Campo><button className="btn btn-success" disabled={!habilitadas.length}>Criar lista</button></form>}
        {modal.tipo === 'catalogo' && <div className="compras-form"><Campo nome="Buscar produto" type="search" value={busca} onChange={e => setBusca(e.target.value)} /><Campo nome="Categoria"><select value={categoriaFiltro} onChange={e => setCategoriaFiltro(e.target.value)}><option value="">Todas</option>{categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></Campo>{admin && <button className="btn btn-secondary" onClick={() => setModal({ tipo: 'produto', novoId: crypto.randomUUID() })}>+ Novo produto</button>}{produtos.map(p => { const incluido = itens.some(i => i.produtoId === p.id); return <div className="compras-catalogo-item" key={p.id}><div><strong>{p.nome}</strong><small>{p.apresentacao || 'Apresentação não informada'} · {p.unidadeCompra || 'un'}</small>{admin && <button className="compras-link" onClick={() => setModal({ tipo: 'produto', produto: p })}>Editar produto</button>}</div>{incluido ? <span>Na lista ✓</span> : <><input aria-label={`Quantidade de ${p.nome}`} inputMode="decimal" value={quantidades[p.id] ?? '1'} onChange={e => setQuantidades(q => ({ ...q, [p.id]: e.target.value }))} /><button className="btn btn-secondary" disabled={ocupado || !podeEditarLista} onClick={() => executar('adicionar', { listaId, produtoId: p.id, quantidadePlanejada: Number(String(quantidades[p.id] ?? 1).replace(',', '.')) })}>Adicionar</button></>}</div>; })}{!produtos.length && <p>Nenhum produto nesta categoria</p>}</div>}
        {modal.tipo === 'categoria' && admin && <CategoriaForm categoria={modal.categoria} salvar={d => salvarModal('categoria', { ...d, ...(modal.categoria ? { categoriaId: modal.categoria.id } : {}) })} />}
        {modal.tipo === 'produto' && <ProdutoForm tipoCompra={contextoTipo} categorias={categorias} catalogo={catalogo} associar={(p,entrada)=>executar('aliasCatalogo',{tipoCompra:contextoTipo,produtoId:p.id,descricao:entrada.nome,apresentacao:entrada.apresentacao||'',unidadeCompra:entrada.unidadeCompra||'un',marca:entrada.marca||'',confirmado:true,operacaoId:crypto.randomUUID()},()=>{paginaCatalogo.atualizar();fechar();setAviso('Produto existente associado; descrição alternativa registrada. Nenhum novo produto criado.');})} produto={modal.produto} salvar={d => executar('produto',{...d,tipoCompra:contextoTipo,produtoId:modal.produto?.id||modal.novoId},async r=>{paginaCatalogo.atualizar();if(listaId&&!modal.produto){await operarCompras('adicionar',{listaId,produtoId:r.produtoId,quantidadePlanejada:1});}fechar();})} />}
        {modal.tipo === 'mercado' && <MercadoForm salvar={d => executar('supermercado', d, r => { setMercadoPadrao(r.supermercadoId); fechar(); })} />}
        {modal.tipo === 'item' && <ItemForm item={modal.item} mercados={mercadosAtivos} mercadoPadrao={mercadoPadrao} salvar={d => salvarModal('item', { ...d, listaId, itemId: modal.item.id, versao: modal.item.versao })} />}
        {modal.tipo === 'finalizar' && <div className="compras-form"><p>O fechamento preserva os preços dos {itens.filter(i => i.estado === 'comprado').length} itens comprados. Depois, os dados ficam bloqueados para edição.</p><p><strong>Total informado: {moeda(itens.filter(i => i.estado === 'comprado').reduce((s, i) => s + i.totalCentavos, 0))}</strong></p><form onSubmit={e => { e.preventDefault(); executar('finalizar', { listaId, versao: modal.versao, aceitarPendentes: true }, () => { fechar(); setAviso('Compra finalizada. Os preços já estão no histórico.'); }); }}><label className="compras-permissao"><input type="checkbox" required />Conferi a compra. Os {itens.filter(i => i.estado === 'pendente').length} itens pendentes não foram comprados.</label><button className="btn btn-success">Confirmar finalização</button></form></div>}
        {modal.tipo === 'anular' && <form className="compras-form" onSubmit={e => { e.preventDefault(); salvarModal('anular', { listaId, motivo: new FormData(e.currentTarget).get('motivo') }); }}><p>A compra permanece no histórico, mas seus preços deixam de entrar nos gráficos e rankings.</p><Campo nome="Motivo da anulação" name="motivo" required maxLength={300} /><button className="btn btn-secondary">Confirmar anulação</button></form>}
        {modal.tipo === 'compartilhar' && arquivo && <div className="compras-form"><p>PDF com os dados selecionados. Escolha WhatsApp ou email no menu do celular.</p><button className="btn btn-success" onClick={async () => { try { if (!await compartilharPdfNativo(arquivo.file)) setErro('Baixe o PDF e anexe ao WhatsApp ou email.'); } catch (error) { if (error.name !== 'AbortError') falhou(error); } }}>Compartilhar PDF</button><PdfAcoes arquivo={arquivo.file} url={arquivo.url} nome={arquivo.nomeArquivo} onErro={setErro} /></div>}
      </fieldset>{ocupado && <p role="status">Aguardando envio — aguarde a confirmação.</p>}
    </Modal>}
    <BottomNav activePath={base} onNavigate={onNavigate} user={user} />
  </div>;
}
function Ranking({ titulo, explicacao, itens, valor, detalhe }) {
  return <section className="card compras-ranking"><h2>{titulo}</h2><p className="text-muted">{explicacao}</p>{!itens.length ? <p>Ainda não há observações suficientes neste período.</p> : <ol>{itens.map(r => <li key={r.produtoId}><strong>{nomeProduto(r.nome)}</strong><small>{r.apresentacao || 'Apresentação não informada'}</small><span>{valor(r)}</span>{detalhe && <small>{detalhe(r)}</small>}</li>)}</ol>}</section>;
}
