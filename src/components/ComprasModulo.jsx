import { useEffect, useMemo, useRef, useState } from 'react';
import { collection, doc, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { operarCompras, consultarPrecos } from '../services/compras';
import { normalizeRole } from '../utils/roles';
import { moeda, dataPreco, lerPreco, numeroCompras } from '../utils/comprasAnalise';
import { compartilharPdfNativo } from '../utils/comprovantes';
import iconesCategorias from '../../functions/compras-icones.json';
import BottomNav from './BottomNav';
import ComprasGraficos from './ComprasGraficos';
import '../styles/compras.css';
import '../styles/nav.css';

function Modal({ titulo, fechar, children }) {
  const ref = useRef(null);
  useEffect(() => { const dialog = ref.current; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog ref={ref} className="compras-dialog" onCancel={e => { e.preventDefault(); fechar(); }}><header><h2>{titulo}</h2><button type="button" className="btn btn-muted" onClick={fechar} aria-label="Fechar">×</button></header>{children}</dialog>;
}
function Campo({ nome, children, ...props }) { return <label className="field"><span>{nome}</span>{children || <input {...props} />}</label>; }
function CategoriaForm({ salvar }) {
  const [icone, setIcone] = useState('📦');
  return <form className="compras-form" onSubmit={e => { e.preventDefault(); salvar({ nome: new FormData(e.currentTarget).get('nome'), icone }); }}>
    <Campo nome="Nome da categoria" name="nome" required maxLength={60} placeholder="Ex.: Escritório" />
    <fieldset className="compras-icones"><legend>Escolha um ícone</legend><div>{iconesCategorias.map(i => <label key={i.icone} title={i.nome}><input type="radio" name="icone" value={i.icone} checked={icone === i.icone} onChange={() => setIcone(i.icone)} /><span aria-hidden="true">{i.icone}</span><small>{i.nome}</small></label>)}</div></fieldset>
    <button className="btn btn-success">Salvar categoria</button>
  </form>;
}
function ProdutoForm({ categorias, salvar, produto }) {
  return <form className="compras-form" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); salvar({ nome: f.get('nome'), apresentacao: f.get('apresentacao'), categoriaId: f.get('categoriaId'), unidadeCompra: f.get('unidadeCompra') }); }}>
    <Campo nome="Nome do produto" name="nome" required maxLength={120} placeholder="Arroz marca A" defaultValue={produto?.nome} />
    <Campo nome="Apresentação / embalagem" name="apresentacao" required maxLength={120} placeholder="Pacote de 1 kg, garrafa de 1 L…" defaultValue={produto?.apresentacao} />
    <Campo nome="Categoria"><select name="categoriaId" defaultValue={produto?.categoriaId}>{categorias.map(c => <option key={c.id} value={c.id}>{c.icone} {c.nome}</option>)}</select></Campo>
    <Campo nome="Preço informado por"><select name="unidadeCompra" defaultValue={produto?.unidadeCompra}><option value="un">Unidade / embalagem</option><option value="kg">Quilo</option><option value="l">Litro</option><option value="m">Metro</option></select></Campo>{produto && <p className="text-muted">Itens já adicionados preservam sua apresentação. Para atualizar uma pendência, retire e adicione o produto novamente. Outra embalagem deve ser cadastrada como outro produto.</p>}<button className="btn btn-success">Salvar produto</button>
  </form>;
}
function MercadoForm({ salvar }) {
  return <form className="compras-form" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); salvar({ nome: f.get('nome'), filial: f.get('filial'), cidade: f.get('cidade') }); }}><Campo nome="Supermercado / estabelecimento" name="nome" required maxLength={120} /><Campo nome="Filial ou bairro" name="filial" required maxLength={120} /><Campo nome="Cidade" name="cidade" required maxLength={120} /><button className="btn btn-success">Salvar supermercado</button></form>;
}
function ItemForm({ item, mercados, mercadoPadrao, salvar }) {
  const [estado, setEstado] = useState('comprado');
  const [erro, setErro] = useState('');
  return <form className="compras-form" onSubmit={e => { e.preventDefault(); try { const f = new FormData(e.currentTarget); salvar({ estado, ...(estado === 'comprado' ? { quantidadeComprada: Number(String(f.get('quantidade')).replace(',', '.')), precoUnitarioCentavos: lerPreco(f.get('preco')), supermercadoId: f.get('mercado') } : {}) }); } catch (error) { setErro(error.message); } }}>
    <p>{item.apresentacao || 'Apresentação não informada no catálogo antigo.'}</p>
    <Campo nome="Situação"><select value={estado} onChange={e => setEstado(e.target.value)}><option value="comprado">Comprado</option><option value="pendente">Pendente</option><option value="nao_comprado">Não comprado</option></select></Campo>
    {estado === 'comprado' && <><Campo nome={`Quantidade (${item.unidadeCompra})`} name="quantidade" inputMode="decimal" required defaultValue={item.quantidadeComprada || item.quantidadePlanejada} /><Campo nome={`Preço por ${item.unidadeCompra} (R$)`} name="preco" inputMode="decimal" required defaultValue={item.precoUnitarioCentavos ? (item.precoUnitarioCentavos / 100).toFixed(2).replace('.', ',') : ''} placeholder="0,00" /><Campo nome="Supermercado"><select name="mercado" defaultValue={item.supermercadoId || mercadoPadrao} required><option value="">Selecione</option>{mercados.map(m => <option key={m.id} value={m.id}>{m.nome} · {m.filial} ({m.cidade})</option>)}</select></Campo><p className="text-muted">Informe o preço de uma unidade ou de 1 kg/L/m, conforme indicado. O total considera a quantidade.</p></>}
    {erro && <p role="alert" className="mensagem erro">{erro}</p>}<button className="btn btn-success">Salvar item</button>
  </form>;
}

export default function ComprasModulo({ user, onNavigate, rotaAtual }) {
  const [perfil, setPerfil] = useState(null), [categorias, setCategorias] = useState([]), [catalogo, setCatalogo] = useState([]), [mercados, setMercados] = useState([]);
  const [listas, setListas] = useState([]), [historico, setHistorico] = useState([]), [lista, setLista] = useState(null), [itens, setItens] = useState([]);
  const [erro, setErro] = useState(''), [aviso, setAviso] = useState(''), [ocupado, setOcupado] = useState(false), [modal, setModal] = useState(null);
  const [mercadoPadrao, setMercadoPadrao] = useState(''), [busca, setBusca] = useState(''), [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [quantidades, setQuantidades] = useState({}), [limiteHistorico, setLimiteHistorico] = useState(50);
  const [arquivo, setArquivo] = useState(null), [relatorio, setRelatorio] = useState(null), [dias, setDias] = useState(90);
  const [online, setOnline] = useState(navigator.onLine);
  const admin = normalizeRole((perfil || user)?.role) === 'admin';
  const montar = admin || normalizeRole((perfil || user)?.role) === 'funcionario';
  const comprar = admin;
  const segmentos = rotaAtual.split('/').filter(Boolean), listaId = segmentos[1] === 'listas' ? segmentos[2] : null;
  const tela = listaId ? 'lista' : segmentos[1] || 'listas';
  const aberta = lista && ['rascunho', 'em_compra'].includes(lista.status);
  const base = '/lista-compras';
  const navegar = caminho => { setErro(''); setAviso(''); setBusca(''); onNavigate(caminho); };
  const falhou = error => setErro(error?.message || 'Não foi possível carregar os dados. Confira sua conexão.');
  async function executar(operacao, dados, depois) {
    if (ocupado) return;
    setOcupado(true); setErro(''); setAviso('');
    try { const resultado = await operarCompras(operacao, dados); if (depois) depois(resultado); return resultado; }
    catch (error) { falhou(error); }
    finally { setOcupado(false); }
  }
  useEffect(() => {
    if (!user?.uid) return;
    const ler = setter => snap => setter(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    const erroSnapshot = () => setErro('Não foi possível sincronizar as compras. Confira a conexão e entre novamente.');
    const assinaturas = [
      onSnapshot(doc(db, 'users', user.uid), d => setPerfil(d.data()), erroSnapshot),
      onSnapshot(query(collection(db, 'categoriasCompras'), orderBy('ordem')), ler(setCategorias), erroSnapshot),
      onSnapshot(collection(db, 'catalogoCompras'), ler(setCatalogo), erroSnapshot),
      onSnapshot(collection(db, 'supermercados'), ler(setMercados), erroSnapshot),
      onSnapshot(query(collection(db, 'comprasListas'), where('status', 'in', ['rascunho', 'em_compra'])), ler(setListas), erroSnapshot),
    ];
    return () => assinaturas.forEach(desinscrever => desinscrever());
  }, [user?.uid]);
  useEffect(() => {
    if (!user?.uid || !admin) return;
    let ativo = true;
    operarCompras('inicializar').catch(error => { if (ativo) falhou(error); });
    return () => { ativo = false; };
  }, [user?.uid, admin]);
  useEffect(() => {
    if (!user?.uid || tela !== 'historico') return;
    return onSnapshot(query(collection(db, 'comprasListas'), where('status', 'in', ['finalizada', 'anulada']), orderBy('finalizadaEm', 'desc'), limit(limiteHistorico + 1)), snap => setHistorico(snap.docs.map(d => ({ ...d.data(), id: d.id }))), () => setErro('Não foi possível carregar o histórico. Tente novamente.'));
  }, [user?.uid, tela, limiteHistorico]);
  useEffect(() => {
    setLista(null); setItens([]);
    if (!user?.uid || !listaId) return;
    const cancelarLista = onSnapshot(doc(db, 'comprasListas', listaId), snap => { if (!snap.exists()) setErro('Lista não encontrada.'); else setLista({ ...snap.data(), id: snap.id }); }, falhou);
    const cancelarItens = onSnapshot(collection(db, 'comprasListas', listaId, 'itens'), snap => setItens(snap.docs.map(d => ({ ...d.data(), id: d.id }))), falhou);
    return () => { cancelarLista(); cancelarItens(); };
  }, [user?.uid, listaId]);
  useEffect(() => {
    if (!user?.uid || !['precos', 'rankings'].includes(tela)) return;
    let ativo = true;
    setRelatorio(null);
    consultarPrecos(Date.now() - dias * 86400000, Date.now()).then(dados => { if (ativo) setRelatorio(dados); }).catch(error => { if (ativo) falhou(error); });
    return () => { ativo = false; };
  }, [user?.uid, tela, dias]);
  useEffect(() => () => { if (arquivo?.url) URL.revokeObjectURL(arquivo.url); }, [arquivo]);
  useEffect(() => {
    const atualizar = () => setOnline(navigator.onLine);
    window.addEventListener('online', atualizar); window.addEventListener('offline', atualizar);
    return () => { window.removeEventListener('online', atualizar); window.removeEventListener('offline', atualizar); };
  }, []);

  const mercadosAtivos = mercados.filter(m => m.ativo !== false);
  const grupos = useMemo(() => categorias.map(c => ({ ...c, itens: itens.filter(i => i.categoriaId === c.id && `${i.nomeSnapshot} ${i.apresentacao}`.toLowerCase().includes(busca.toLowerCase())).sort((a, b) => a.nomeSnapshot.localeCompare(b.nomeSnapshot, 'pt-BR')) })).filter(c => c.itens.length), [categorias, itens, busca]);
  const produtos = catalogo.filter(p => p.ativo !== false && (!categoriaFiltro || p.categoriaId === categoriaFiltro) && `${p.nome} ${p.apresentacao}`.toLowerCase().includes(busca.toLowerCase())).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  async function compartilhar() {
    setOcupado(true); setErro('');
    try {
      const pendentes = itens.filter(i => i.estado === 'pendente').map(i => ({ nome: `${i.quantidadePlanejada} ${i.unidadeCompra} · ${i.nomeSnapshot}${i.apresentacao ? ` (${i.apresentacao})` : ''}`, categoria: categorias.find(c => c.id === i.categoriaId)?.nome || 'Diversos' }));
      if (!pendentes.length) throw new Error('Não há itens pendentes para compartilhar.');
      const { gerarPdfListaCompras } = await import('../utils/exportarPdfListaCompras');
      const pdf = await gerarPdfListaCompras(pendentes, { titulo: lista.titulo });
      setArquivo({ ...pdf, file: new File([pdf.blob], pdf.nomeArquivo, { type: 'application/pdf' }), url: URL.createObjectURL(pdf.blob) });
      setModal({ tipo: 'compartilhar' });
    } catch (error) { falhou(error); } finally { setOcupado(false); }
  }
  const fechar = () => setModal(null);
  const salvarModal = (operacao, dados) => executar(operacao, dados, () => { fechar(); setAviso('Salvo e confirmado no servidor.'); });
  return <div className="page-bg page-compras"><main className="page-shell compras-shell compras-modulo" aria-busy={ocupado}>
    <header className="compras-header"><button className="compras-voltar" onClick={() => onNavigate(admin ? '/admin' : '/ponto')}>← Voltar ao AP1303</button><div className="compras-titulo"><span aria-hidden="true">🛒</span><div><h1>Compras</h1><p>Da sua lista ao histórico de preços.</p></div></div>
      {user && <nav className="compras-subnav" aria-label="Compras">{[['listas', 'Listas'], ['catalogo', 'Catálogo'], ['historico', 'Histórico'], ['precos', 'Preços'], ['rankings', 'Rankings'], ...(admin ? [['categorias', 'Categorias']] : [])].map(([chave, titulo]) => <button key={chave} className={(tela === chave || (tela === 'lista' && chave === 'listas')) ? 'active' : ''} aria-current={tela === chave ? 'page' : undefined} onClick={() => navegar(chave === 'listas' ? base : `${base}/${chave}`)}>{titulo}</button>)}</nav>}
    </header>
    {!user && <section className="card"><h2>Entre para acessar as compras</h2><button className="btn btn-primary" onClick={() => onNavigate('/ponto')}>Entrar no app</button></section>}
    {!online && <p className="mensagem erro" role="status">Sem conexão. Os dados exibidos podem estar desatualizados. Conecte-se para salvar ou finalizar.</p>}{erro && <p className="mensagem erro" role="alert">{erro}</p>}{aviso && <p className="mensagem" role="status">{aviso}</p>}{ocupado && <p role="status" className="text-muted">Aguardando confirmação do servidor…</p>}
    {user && tela === 'categorias' && admin && <section className="compras-form"><div><h2>Categorias</h2><p>Organize os produtos e escolha um ícone para cada categoria.</p><button className="btn btn-success" disabled={ocupado} onClick={() => setModal({ tipo: 'categoria' })}>+ Nova categoria</button></div><div className="compras-categorias-grade">{categorias.map(c => <article className="card" key={c.id}><span aria-hidden="true">{c.icone}</span><strong>{c.nome}</strong></article>)}</div></section>}
    {user && tela === 'catalogo' && <section className="compras-form"><div><h2>Catálogo de produtos</h2><p>Cadastre produtos aqui para usar em qualquer lista. O cadastro não cria uma compra nem registra preços.</p></div>{admin && <button className="btn btn-success" disabled={ocupado || !categorias.length} onClick={() => setModal({ tipo: 'produto' })}>+ Novo produto</button>}<Campo nome="Buscar produto" type="search" value={busca} onChange={e => setBusca(e.target.value)} /><Campo nome="Filtrar por categoria"><select value={categoriaFiltro} onChange={e => setCategoriaFiltro(e.target.value)}><option value="">Todas</option>{categorias.map(c => <option key={c.id} value={c.id}>{c.icone} {c.nome}</option>)}</select></Campo><div className="compras-catalogo-grade">{produtos.map(p => { const categoria = categorias.find(c => c.id === p.categoriaId); return <article className="card compras-catalogo-produto" key={p.id}><span className="compras-catalogo-icone" aria-hidden="true">{categoria?.icone || '📦'}</span><div><strong>{p.nome}</strong><small>{p.apresentacao || 'Apresentação não informada'} · {p.unidadeCompra || 'un'}</small><small>{categoria?.nome || 'Diversos'}</small>{admin && <button className="compras-link" disabled={ocupado} onClick={() => setModal({ tipo: 'produto', produto: p })}>Editar produto</button>}</div></article>; })}</div>{!produtos.length && <p className="card">{busca || categoriaFiltro ? 'Nenhum produto encontrado para os filtros.' : 'Nenhum produto cadastrado. Comece pelo botão Novo produto.'}</p>}</section>}
    {user && tela === 'listas' && <>
      {montar && <button className="btn btn-success" disabled={ocupado || !categorias.length} onClick={() => setModal({ tipo: 'novaLista', novoId: crypto.randomUUID() })}>+ Montar nova lista</button>}
      {!categorias.length && <p className="card">{admin ? 'Preparando categorias e importando a lista anterior…' : 'O administrador precisa abrir Compras uma vez para preparar o módulo.'}</p>}
      {!listas.length && categorias.length > 0 && <p className="card">Nenhuma lista aberta. Crie uma lista para começar.</p>}
      {[...listas].sort((a, b) => (b.criadaEm?.seconds || 0) - (a.criadaEm?.seconds || 0)).map(l => <button key={l.id} className="card compras-lista-cartao" onClick={() => navegar(`${base}/listas/${l.id}`)}><span><strong>{l.titulo}</strong><small>{l.quantidadeItens} itens · {l.status === 'em_compra' ? 'Em compra' : 'Em preparação'}</small></span><span aria-hidden="true">→</span></button>)}
    </>}
    {user && tela === 'lista' && lista && <>
      <section className="compras-lista-topo"><h2>{lista.titulo}</h2><p className="text-muted">{lista.status === 'rascunho' ? 'Em preparação' : lista.status === 'em_compra' ? 'Em compra' : lista.status === 'anulada' ? `Anulada: ${lista.motivoAnulacao}` : `Finalizada · ${moeda(lista.totalCentavos)}`}</p><div className="compras-acoes-principais">
        {aberta && montar && <button className="btn btn-secondary" disabled={ocupado} onClick={() => { setBusca(''); setModal({ tipo: 'catalogo' }); }}>Adicionar produtos</button>}
        {aberta && <button className="btn btn-secondary" disabled={ocupado || !itens.some(i => i.estado === 'pendente')} onClick={compartilhar}>Compartilhar lista</button>}
        {lista.status === 'rascunho' && comprar && <button className="btn btn-success" disabled={ocupado || !itens.length} onClick={() => executar('iniciar', { listaId })}>Iniciar compra</button>}
        {lista.status === 'em_compra' && comprar && <button className="btn btn-success" disabled={ocupado} onClick={() => setModal({ tipo: 'finalizar', versao: lista.versao })}>Finalizar compra</button>}
        {lista.status === 'finalizada' && admin && <button className="btn btn-secondary" disabled={ocupado} onClick={() => setModal({ tipo: 'anular' })}>Anular compra</button>}
      </div></section>
      {lista.status === 'em_compra' && comprar && <section className="card compras-form"><Campo nome="Supermercado padrão desta compra"><select value={mercadoPadrao} onChange={e => setMercadoPadrao(e.target.value)}><option value="">Selecione ao registrar cada item</option>{mercadosAtivos.map(m => <option key={m.id} value={m.id}>{m.nome} · {m.filial} ({m.cidade})</option>)}</select></Campo><button className="btn btn-secondary" disabled={ocupado} onClick={() => setModal({ tipo: 'mercado' })}>+ Cadastrar supermercado</button><p className="text-muted">Você pode escolher outro supermercado em cada produto.</p></section>}
      <details className="compras-opcoes"><summary>Buscar item</summary><Campo nome="Nome ou apresentação" value={busca} onChange={e => setBusca(e.target.value)} type="search" /></details>
      {!itens.length && <p className="card">Sua lista está vazia. Adicione produtos do catálogo.</p>}
      {grupos.map(c => <section key={c.id} className="compras-categoria"><h2><span aria-hidden="true">{c.icone}</span> {c.nome}</h2><div className="compras-papel">{c.itens.map(item => <article className={`compras-produto ${item.estado}`} key={item.id}><div><strong>{item.nomeSnapshot}</strong><small>{item.apresentacao || 'Apresentação não informada'} · {numeroCompras(item.quantidadePlanejada)} {item.unidadeCompra} planejados</small>{item.estado === 'comprado' ? <><span className="compras-preco">{moeda(item.precoUnitarioCentavos)}/{item.unidadeCompra} × {numeroCompras(item.quantidadeComprada)} = {moeda(item.totalCentavos)}</span><small>{item.supermercadoNome}</small></> : <span>{item.estado === 'nao_comprado' ? 'Não comprado' : 'Pendente'}</span>}</div><div className="compras-produto-acoes">{lista.status === 'em_compra' && comprar && <button className="btn btn-secondary" disabled={ocupado} onClick={() => setModal({ tipo: 'item', item })}>{item.estado === 'comprado' ? 'Editar preço' : 'Registrar'}</button>}{aberta && item.estado !== 'comprado' && (admin || item.solicitadaPor === user.uid) && <button className="compras-link" disabled={ocupado} onClick={() => executar('remover', { listaId, itemId: item.id, versao: item.versao })} aria-label={`Retirar ${item.nomeSnapshot} da lista`}>Retirar</button>}</div></article>)}</div></section>)}
      {lista.status === 'em_compra' && <p className="card compras-total">Total informado <strong>{moeda(itens.filter(i => i.estado === 'comprado').reduce((s, i) => s + i.totalCentavos, 0))}</strong><small>O histórico será gravado ao finalizar.</small></p>}
    </>}
    {user && tela === 'historico' && <>{!historico.length && <p className="card">As compras aparecerão aqui depois de finalizadas.</p>}{historico.slice(0, limiteHistorico).map((l, indice, exibidas) => { const mes = l.finalizadaEm?.toDate().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'America/Fortaleza' }); const anterior = exibidas[indice - 1]?.finalizadaEm?.toDate().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'America/Fortaleza' }); return <section key={l.id}>{mes !== anterior && <h2 className="compras-mes">{mes}</h2>}<button className="card compras-lista-cartao" onClick={() => navegar(`${base}/listas/${l.id}`)}><span><strong>{l.titulo}</strong><small>{l.finalizadaEm ? dataPreco(l.finalizadaEm.toMillis()) : ''} · {l.status === 'anulada' ? 'Anulada' : `${l.quantidadeComprados} produtos`}</small></span><strong>{moeda(l.totalCentavos)}</strong></button></section>; })}{historico.length > limiteHistorico && <button className="btn btn-secondary" onClick={() => setLimiteHistorico(n => n + 50)}>Carregar mais compras</button>}</>}
    {user && ['precos', 'rankings'].includes(tela) && <><Campo nome="Período"><select value={dias} onChange={e => setDias(Number(e.target.value))}><option value={30}>Últimos 30 dias</option><option value={90}>Últimos 90 dias</option><option value={365}>Últimos 12 meses</option></select></Campo>{!relatorio && !erro && <p role="status">Consultando preços confirmados…</p>}{relatorio && (tela === 'precos' ? <ComprasGraficos registros={relatorio.registros} /> : <>
      <Ranking titulo="Top 10 mais comprados" explicacao="Número de compras distintas no período." itens={relatorio.rankings.frequencias} valor={r => `${r.compras} compra(s)`} />
      <Ranking titulo="Top 10 maiores variações" explicacao="Primeiro e último preço no mesmo supermercado. Ordenado pela variação percentual absoluta; altas e quedas." itens={relatorio.rankings.variacoes} valor={r => `${r.percentual > 0 ? '+' : ''}${r.percentual.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% · ${moeda(r.inicialCentavos)} → ${moeda(r.finalCentavos)} /${r.unidade}`} detalhe={r => `${r.supermercado} · ${dataPreco(r.inicioMs)} a ${dataPreco(r.fimMs)}`} />
      <Ranking titulo="Top 10 maiores preços" explicacao="Maior entre os últimos preços de cada produto por supermercado no período. Preço por unidade indicada, não o total da compra." itens={relatorio.rankings.precos} valor={r => `${moeda(r.precoCentavos)}/${r.unidade}`} detalhe={r => `${r.supermercado} · ${dataPreco(r.dataMs)}`} />
    </>)}</>}
  </main>
    {modal && <Modal titulo={{ categoria: 'Nova categoria', novaLista: 'Montar lista', catalogo: 'Adicionar produtos', produto: 'Produto do catálogo', mercado: 'Cadastrar supermercado', item: modal.item?.nomeSnapshot, finalizar: 'Finalizar compra', anular: 'Anular compra', compartilhar: 'Compartilhar lista' }[modal.tipo]} fechar={fechar}>
      {erro && <p role="alert" className="mensagem erro">{erro}</p>}<fieldset disabled={ocupado} className="compras-fieldset">
        {modal.tipo === 'novaLista' && <form className="compras-form" onSubmit={e => { e.preventDefault(); const titulo = new FormData(e.currentTarget).get('titulo'); executar('criar', { titulo, listaId: modal.novoId }, r => { fechar(); navegar(`${base}/listas/${r.listaId}`); }); }}><Campo nome="Nome da lista" name="titulo" required maxLength={120} placeholder="Compras da semana" /><button className="btn btn-success">Criar lista</button></form>}
        {modal.tipo === 'catalogo' && <div className="compras-form"><Campo nome="Buscar produto" type="search" value={busca} onChange={e => setBusca(e.target.value)} /><Campo nome="Categoria"><select value={categoriaFiltro} onChange={e => setCategoriaFiltro(e.target.value)}><option value="">Todas</option>{categorias.map(c => <option key={c.id} value={c.id}>{c.icone} {c.nome}</option>)}</select></Campo>{admin && <button className="btn btn-secondary" onClick={() => setModal({ tipo: 'produto' })}>+ Novo produto</button>}{produtos.map(p => { const incluido = itens.some(i => i.produtoId === p.id); return <div className="compras-catalogo-item" key={p.id}><div><strong>{p.nome}</strong><small>{p.apresentacao || 'Apresentação não informada'} · {p.unidadeCompra || 'un'}</small>{admin && <button className="compras-link" onClick={() => setModal({ tipo: 'produto', produto: p })}>Editar produto</button>}</div>{incluido ? <span>Na lista ✓</span> : <><input aria-label={`Quantidade de ${p.nome}`} inputMode="decimal" value={quantidades[p.id] ?? '1'} onChange={e => setQuantidades(q => ({ ...q, [p.id]: e.target.value }))} /><button className="btn btn-secondary" onClick={() => executar('adicionar', { listaId, produtoId: p.id, quantidadePlanejada: Number(String(quantidades[p.id] ?? 1).replace(',', '.')) })}>Adicionar</button></>}</div>; })}{!produtos.length && <p>Nenhum produto encontrado.</p>}</div>}
        {modal.tipo === 'categoria' && admin && <CategoriaForm salvar={d => salvarModal('categoria', d)} />}
        {modal.tipo === 'produto' && <ProdutoForm categorias={categorias} produto={modal.produto} salvar={d => salvarModal('produto', { ...d, produtoId: modal.produto?.id })} />}
        {modal.tipo === 'mercado' && <MercadoForm salvar={d => executar('supermercado', d, r => { setMercadoPadrao(r.supermercadoId); fechar(); })} />}
        {modal.tipo === 'item' && <ItemForm item={modal.item} mercados={mercadosAtivos} mercadoPadrao={mercadoPadrao} salvar={d => salvarModal('item', { ...d, listaId, itemId: modal.item.id, versao: modal.item.versao })} />}
        {modal.tipo === 'finalizar' && <div className="compras-form"><p>O fechamento preserva os preços dos {itens.filter(i => i.estado === 'comprado').length} itens comprados. Depois, os dados ficam bloqueados para edição.</p><p><strong>Total informado: {moeda(itens.filter(i => i.estado === 'comprado').reduce((s, i) => s + i.totalCentavos, 0))}</strong></p><form onSubmit={e => { e.preventDefault(); executar('finalizar', { listaId, versao: modal.versao, aceitarPendentes: true }, () => { fechar(); setAviso('Compra finalizada. Os preços já estão no histórico.'); }); }}><label className="compras-permissao"><input type="checkbox" required />Conferi a compra. Os {itens.filter(i => i.estado === 'pendente').length} itens pendentes não foram comprados.</label><button className="btn btn-success">Confirmar finalização</button></form></div>}
        {modal.tipo === 'anular' && <form className="compras-form" onSubmit={e => { e.preventDefault(); salvarModal('anular', { listaId, motivo: new FormData(e.currentTarget).get('motivo') }); }}><p>A compra permanece no histórico, mas seus preços deixam de entrar nos gráficos e rankings.</p><Campo nome="Motivo da anulação" name="motivo" required maxLength={300} /><button className="btn btn-secondary">Confirmar anulação</button></form>}
        {modal.tipo === 'compartilhar' && arquivo && <div className="compras-form"><p>PDF com os itens pendentes. Escolha WhatsApp ou email no menu do celular.</p><button className="btn btn-success" onClick={async () => { try { if (!await compartilharPdfNativo(arquivo.file)) setErro('Baixe o PDF e anexe ao WhatsApp ou email.'); } catch (error) { if (error.name !== 'AbortError') falhou(error); } }}>Compartilhar PDF</button><a className="btn btn-secondary" href={arquivo.url} download={arquivo.nomeArquivo}>Baixar PDF</a></div>}
      </fieldset>{ocupado && <p role="status">Salvando… Aguarde a confirmação.</p>}
    </Modal>}
    <BottomNav activePath={base} onNavigate={onNavigate} user={user} />
  </div>;
}
function Ranking({ titulo, explicacao, itens, valor, detalhe }) {
  return <section className="card compras-ranking"><h2>{titulo}</h2><p className="text-muted">{explicacao}</p>{!itens.length ? <p>Ainda não há observações suficientes neste período.</p> : <ol>{itens.map(r => <li key={r.produtoId}><strong>{r.nome}</strong><small>{r.apresentacao || 'Apresentação não informada'}</small><span>{valor(r)}</span>{detalhe && <small>{detalhe(r)}</small>}</li>)}</ol>}</section>;
}
