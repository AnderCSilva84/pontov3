import EstadoConclusaoCompra from './EstadoConclusaoCompra';
import {camposFaltantesCupom} from '../utils/conclusaoCompra';
import {Icon} from './ui';
import { dataHoraExibicao } from '../utils/datasExibicao.js';
import {produtosPrincipais,opcoesAssociacaoCupom} from '../utils/catalogoProdutos';
import {SugestoesProduto} from './AssociacoesProdutos';
import {tipoCompra as tipoDaLista,TIPOS_COMPRAS} from '../utils/comprasTipo';
import { useCallback, useEffect, useRef, useState, lazy, Suspense } from 'react';
import { operarCompras } from '../services/compras';
import { moeda, numeroCompras } from '../utils/comprasAnalise';
import { compararCupomComLista } from '../utils/cupomComparacao';
import { reconhecerCupom, conferirAssociacoesCupom, itensAtencaoCupom, embalagemFiscal } from '../utils/cupomRevisao';
import { normalizarQrCupom, mensagemLinkCupom } from '../utils/cupomQr';
import { iniciarScannerQr } from '../services/scannerQr';
import CameraCupom from './CameraCupom';
import { cameraAndroid } from '../services/scannerQrCamera';
import { preferirLeitorNativo } from '../utils/scannerQr';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';

function ConfirmarDescarte({ nome, confirmar, cancelar }) {
  const ref = useRef(null);
  useEffect(() => { const dialog = ref.current; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog ref={ref} className="compras-dialog cupom-confirmar" aria-labelledby="cupom-confirmar-titulo" onCancel={e => { e.preventDefault(); e.stopPropagation(); cancelar(); }}><div className="compras-form"><h3 id="cupom-confirmar-titulo">Descartar produto?</h3><p>Tem certeza que deseja descartar “{nome}” desta importação?</p><div className="compras-acoes-principais"><button type="button" className="btn btn-secondary" onClick={cancelar} autoFocus>Manter produto</button><button type="button" className="btn btn-danger" onClick={confirmar}>Sim, descartar</button></div></div></dialog>;
}

const TesteQrNativo = (import.meta.env.MODE === 'mobile' || import.meta.env.MODE === 'mobile-release') ? lazy(() => import('./TesteQrNativoApp')) : null;

const adaptadorCameraApp = {
  iniciar: iniciarScannerQr,
  observarCancelamento(cancelar) {
    const sessao = auth.currentUser?.uid;
    return onAuthStateChanged(auth, u => { if (u?.uid !== sessao) cancelar(); });
  },
};

const destinoSeguro = normalizarQrCupom;
export default function ImportarCupom({ categorias, catalogo, mercados, aoImportar, listaDestino = null, listasDisponiveis = [], tiposHabilitados = [], onTipoChange = () => {}, catalogoPaginacao = {} }) {
  const [link, setLink] = useState(''), [texto, setTexto] = useState(''), [camera, setCamera] = useState(false);
  const [resumoScanner, setResumoScanner] = useState(null);
  const [testeNativo, setTesteNativo] = useState(false);
  const [revisao, setRevisao] = useState(null), [linhas, setLinhas] = useState([]), [mercado, setMercado] = useState('');
  const [erro, setErro] = useState(''), [ocupado, setOcupado] = useState(false);
  const avisoErro = useRef(null);
  useEffect(() => {
    if (erro) {
      avisoErro.current?.focus({ preventScroll: true });
      avisoErro.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [erro]);
  const [novaFilial, setNovaFilial] = useState({ nome: '', filial: '', cidade: '' });
  const [vinculando, setVinculando] = useState(null);
  const [buscaVinculo,setBuscaVinculo]=useState('');
  const catalogosConferidos=useRef(new Set());
  useEffect(()=>{
    if(vinculando===null||!revisao||catalogoPaginacao.carregando||catalogosConferidos.current.has(revisao.tipoCompra))return;
    catalogosConferidos.current.add(revisao.tipoCompra);
    async function conferir(){await catalogoPaginacao.atualizar?.();await catalogoPaginacao.todos?.();}
    conferir().catch(e=>setErro(e.message));
  },[vinculando,revisao,catalogoPaginacao]);
  const [titulo, setTitulo] = useState(listaDestino?.titulo || '');
  const [tipo, setTipo]=useState('supermercado');
  const [comparando, setComparando] = useState(null);
  const [descartePendente, setDescartePendente] = useState(null);
  const [destinoId, setDestinoId] = useState(listaDestino?.id || '');
  const [retirados, setRetirados] = useState([]);
  const [somenteAtencao,setSomenteAtencao]=useState(true);
  const [categoriaNovos,setCategoriaNovos]=useState('');
  const destinos = listasDisponiveis.some(l => l.id === listaDestino?.id) || !listaDestino ? listasDisponiveis : [listaDestino, ...listasDisponiveis];
  const destinoEscolhido = destinos.find(l => l.id === destinoId);
  const notaUrl = destinoSeguro(link);
  const opcoesVinculo=opcoesAssociacaoCupom(catalogo,{tipoCompra:revisao?.tipoCompra,unidadeCompra:linhas[vinculando]?.unidadeCompra,busca:buscaVinculo,entrada:linhas[vinculando]});
  const comparacao = revisao?.destino ? compararCupomComLista(revisao.destino.itens, linhas) : null;
  const linhasRevisadas=conferirAssociacoesCupom(linhas,catalogo);
  const pendentes = itensAtencaoCupom(linhasRevisadas);
  const visiveis=linhasRevisadas.map((i,index)=>({i,index})).filter(({i})=>!somenteAtencao||pendentes.some(p=>p.linha===i.linha));
  const recebeuLink = useCallback(valor => { const normalizado = destinoSeguro(valor); setCamera(false); setLink(normalizado || valor); setErro(normalizado ? '' : 'O QR Code precisa apontar para uma NFC-e do Pará, em formato compatível.'); }, []);
  async function colarLink() {
    try {
      const valor = await navigator.clipboard.readText();
      if (!valor.trim()) { setErro('Copie o link da nota na câmera do celular antes de colar.'); return; }
      recebeuLink(valor.trim());
    } catch { setErro('Toque e segure o campo “Link completo do QR Code” e escolha Colar.'); }
  }
  async function preparar(e, automatico = false) {
    e?.preventDefault(); setOcupado(true); setErro('');
    try {
      const r = await operarCompras('cupomPreparar', { tipoCompra:tiposHabilitados.includes(tipo)?tipo:tiposHabilitados[0], link: notaUrl || link, ...(automatico ? { automatico: true } : { texto }), ...(destinoId ? { listaDestinoId: destinoId } : {}) });
      onTipoChange(r.tipoCompra); setRevisao(r); setRetirados([]); setVinculando(null); setComparando(null); setSomenteAtencao(true); setLinhas(reconhecerCupom(r.nota.itens.map(i => ({ ...i, descartar: false })),catalogo,r.tipoCompra,r.destino?.itens));
      setTitulo(t => t.trim() || r.destino?.titulo || `Cupom · ${r.nota.emitente}`.slice(0, 120));
      const correspondentes = mercados.filter(m => m.ativo !== false && m.cnpj?.replace(/\D/g, '') === r.nota.cnpj);
      setMercado(correspondentes.length === 1 ? correspondentes[0].id : '');
    } catch (e) { setErro(e.message); } finally { setOcupado(false); }
  }
  function atualizar(index, campos) {
    if (campos.itemPlanejadoId) {
      const planejado = revisao.destino?.itens.find(i => i.id === campos.itemPlanejadoId);
      campos = { marca: linhas[index].marca || planejado?.marca || '', ...campos };
    }
    const associado = campos.itemPlanejadoId || (campos.descartar === false ? linhas[index].itemPlanejadoId : '');
    if (associado) setRetirados(antes => antes.filter(id => id !== associado));
    setLinhas(antes => antes.map((i, n) => n === index || (!Object.hasOwn(campos, 'descartar') && i.codigo === antes[index].codigo && i.nomeOriginal === antes[index].nomeOriginal && i.unidadeOriginal === antes[index].unidadeOriginal) ? { ...i, erroRevisao: null, ...campos } : i));
  }
  function associarProduto(index,p) {
    const alvos=(revisao.destino?.itens||[]).filter(i=>i.produtoId===p.id&&i.unidadeCompra===p.unidadeCompra);
    atualizar(index,{itemPlanejadoId:alvos.length===1?alvos[0].id:'',produtoId:p.id,nome:p.nome,apresentacao:p.apresentacao,categoriaId:p.categoriaId,reconhecido:false,novoConfirmado:false});
  }
  function descartar(index, marcado) {
    if (marcado) setDescartePendente(index);
    else atualizar(index, { descartar: false });
  }
  async function confirmar(e) {
    e.preventDefault();
    if (ocupado) return;
    if (pendentes.length) {
      setSomenteAtencao(true); setErro(`Falta resolver ${pendentes.length} produto(s). Escolha um cadastro ou confirme como novo. Os demais já estão prontos.`);
      return;
    }
    setOcupado(true); setErro('');
    try {
      const r = await operarCompras('cupomConfirmar', { versaoIdentidade:1,titulo, rascunhoId: revisao.rascunhoId, supermercadoId: mercado, retirarPlanejados: retirados, itens: linhas.map(i => ({ linha: i.linha, novoConfirmado:i.novoConfirmado===true, descartar: i.descartar, unidadeConfirmada: i.unidadeConfirmada === true, itemPlanejadoId: i.itemPlanejadoId || '', produtoId: i.produtoId || '', nome: i.nome, marca: i.marca || '', categoriaId: i.categoriaId, apresentacao: i.apresentacao })) });
      aoImportar(r);
    } catch (e) {
      const problemas=e.details?.linhas || (Number.isInteger(e.details?.linha)?[{linha:e.details.linha,mensagem:e.message}]:[]);
      if(problemas.length){setLinhas(antes=>antes.map(i=>{const p=problemas.find(p=>p.linha===i.linha);return p?{...i,erroRevisao:p.mensagem}:i;}));setSomenteAtencao(true);}
      setErro(e.message);
    } finally { setOcupado(false); }
  }
  async function cadastrarFilial() {
    setOcupado(true); setErro('');
    try {
      const r = await operarCompras('supermercado', { ...novaFilial, nome: novaFilial.nome || revisao.nota.emitente });
      setMercado(r.supermercadoId);
    } catch (e) { setErro(e.message); } finally { setOcupado(false); }
  }
  return <div className="compras-form cupom-importar">
    <ol className="cupom-etapas" aria-label="Etapas da importação"><li aria-current={!revisao ? 'step' : undefined}>1. Trazer nota</li><li aria-current={revisao ? 'step' : undefined}>2. Conferir compra</li></ol>
    <p>{destinoEscolhido ? `Compare o cupom com “${destinoEscolhido.titulo}”, confira os produtos e finalize esta lista com os valores da nota.` : 'Importe a compra como uma nova lista ou associe o cupom a uma lista que você já preparou.'}</p>
    {erro && <p ref={avisoErro} tabIndex={-1} role="alert" className="mensagem erro">{erro}</p>}
    <fieldset disabled={ocupado} className="compras-fieldset">
    {!revisao ? <><label className="field"><span>Classificação</span><select value={destinoId?tipoDaLista(destinos.find(l=>l.id===destinoId)):(tiposHabilitados.includes(tipo)?tipo:tiposHabilitados[0]||'')} disabled={Boolean(destinoId)} onChange={e=>{setTipo(e.target.value);onTipoChange(e.target.value);}}>{Object.entries(TIPOS_COMPRAS).filter(([id])=>destinoId||tiposHabilitados.includes(id)).map(([id,nome])=><option key={id} value={id}>{nome}</option>)}</select></label>
      <label className="field"><span>Onde salvar esta compra?</span><select value={destinoId} onChange={e => { const id = e.target.value; onTipoChange(id?tipoDaLista(destinos.find(l=>l.id===id)):(tiposHabilitados.includes(tipo)?tipo:tiposHabilitados[0])); setDestinoId(id); setTitulo(destinos.find(l => l.id === id)?.titulo || ''); }}><option value="">Criar nova lista com esta nota</option>{destinos.filter(l => ['rascunho', 'em_compra'].includes(l.status)).map(l => <option key={l.id} value={l.id}>{l.titulo}</option>)}</select></label>
      <label className="field"><span>Nome da lista de compras</span><input value={titulo} onChange={e => setTitulo(e.target.value)} maxLength={120} placeholder="Ex.: Compras da semana" /><small>Você pode definir o nome agora e ajustar antes de finalizar a importação.</small></label>
      {!camera && resumoScanner && <aside aria-label="Resultado do diagnóstico local"><small>Decodificado; validação fiscal aceita. ZXing: {resumoScanner.zxing.tentativas} tentativa(s), {Math.round(resumoScanner.zxing.ms)} ms. Fallback: {resumoScanner.fallback.tentativas} ciclo(s), {Math.round(resumoScanner.fallback.ms)} ms.</small><button type="button" className="compras-link" onClick={() => setResumoScanner(null)}>Fechar diagnóstico</button></aside>}
      {testeNativo && <Suspense fallback={<p>Carregando teste nativo…</p>}><TesteQrNativo usarAlternativo={() => { setTesteNativo(false); setResumoScanner(null); setCamera(true); }} aoLer={valor => { setTesteNativo(false); recebeuLink(valor); }} fechar={() => setTesteNativo(false)} /></Suspense>}
      {camera && <CameraCupom adaptador={adaptadorCameraApp} aoResumo={setResumoScanner} aoLer={recebeuLink} fechar={() => setCamera(false)} />}
      <div className="compras-acoes-principais">{!camera && !testeNativo && <button type="button" className="btn btn-secondary" disabled={ocupado} onClick={() => { setResumoScanner(null); if (preferirLeitorNativo(cameraAndroid() ? 'android' : 'web', import.meta.env.MODE)) setTesteNativo(true); else setCamera(true); }}>Escanear QR Code</button>}</div>
        <form className="compras-form" onSubmit={preparar}>
        <details><summary>Como trazer a nota?</summary><p>Escaneie o QR Code ou cole o link. Abra a nota na SEFA e copie o texto completo para o campo abaixo. Se a câmera não ler, use a câmera do celular para copiar o link.</p></details>
        <button type="button" className="btn btn-secondary" onClick={colarLink}>Colar link da nota</button>
        <label className="field"><span>Link completo do QR Code (opcional)</span><input type="url" value={link} onChange={e => setLink(e.target.value)} maxLength={1000} placeholder="https://app.sefa.pa.gov.br/consulta-nfce/#/qrcode?p=…" /></label>
        {mensagemLinkCupom(link) && <p role="alert" className="mensagem erro">{mensagemLinkCupom(link)}</p>}
        {notaUrl && <><button type="button" className="btn btn-primary" onClick={()=>preparar(null,true)}>Buscar produtos desta nota</button><p role="status">O app tentará trazer os produtos pelo link. Se a SEFA não responder, use o texto abaixo.</p></>}
        {notaUrl && <a className="btn btn-secondary" href={notaUrl} target="_blank" rel="noopener noreferrer">Abrir nota na SEFA</a>}
        <p className="mensagem">Já tem o texto da nota? Cole abaixo, mesmo sem link. Inclua produtos, totais, data e chave de acesso.</p>
        <label className="field"><span>Texto completo da nota</span><textarea value={texto} onChange={e => setTexto(e.target.value)} required maxLength={150000} rows={8} placeholder="Cole o conteúdo da nota aberta na SEFA…" /></label>
        <button className="btn btn-success" disabled={ocupado || !texto.trim() || (!!link.trim() && !notaUrl)}>{ocupado ? 'Lendo nota…' : 'Conferir compra'}</button>
      </form>
    </> : <form className="compras-form" onSubmit={confirmar} onInvalidCapture={e => {
      let pai = e.target.parentElement;
      while (pai && pai !== e.currentTarget) {
        if (pai.tagName === 'DETAILS') pai.open = true;
        pai = pai.parentElement;
      }
      setErro('Preencha os campos indicados antes de finalizar. Os detalhes que precisam de atenção foram abertos.');
    }}>
      <label className="field"><span>Nome da lista de compras</span><input value={titulo} onChange={e => setTitulo(e.target.value)} required maxLength={120} placeholder="Ex.: Compras da semana" /></label>
      <section className="card cupom-resumo"><h3>{revisao.nota.emitente}</h3><details><summary>Dados da nota e descontos</summary><p>CNPJ: {revisao.nota.cnpj} · {dataHoraExibicao(new Date(revisao.nota.emitidaEm), { timeZone: 'America/Fortaleza' })}</p><p>{revisao.nota.endereco}</p><dl><dt>Valor original</dt><dd>{moeda(revisao.nota.totalOriginalCentavos)}</dd><dt>Desconto da nota</dt><dd>{moeda(revisao.nota.descontoCentavos)}</dd><dt>Total pago</dt><dd><strong>{moeda(revisao.nota.totalPagoCentavos)}</strong></dd></dl></details><p className="cupom-total">Total pago <strong>{moeda(revisao.nota.totalPagoCentavos)}</strong></p></section>
      <label className="field"><span>Supermercado / filial desta nota</span><select required value={mercado} onChange={e => setMercado(e.target.value)}><option value="">Selecione a filial correspondente</option>{mercados.filter(m => m.ativo !== false).map(m => <option key={m.id} value={m.id}>{m.nome} · {m.filial} ({m.cidade})</option>)}</select></label>
      <details><summary>Cadastrar supermercado ou filial</summary><div className="compras-form">
        <label className="field"><span>Nome do supermercado</span><input value={novaFilial.nome || revisao.nota.emitente} maxLength={120} onChange={e => setNovaFilial(v => ({ ...v, nome: e.target.value }))} /></label>
        <label className="field"><span>Filial / bairro</span><input value={novaFilial.filial} maxLength={120} onChange={e => setNovaFilial(v => ({ ...v, filial: e.target.value }))} /></label>
        <label className="field"><span>Cidade</span><input value={novaFilial.cidade} maxLength={120} onChange={e => setNovaFilial(v => ({ ...v, cidade: e.target.value }))} /></label>
        <button type="button" className="btn btn-secondary" disabled={ocupado} onClick={cadastrarFilial}>Salvar e selecionar filial</button>
      </div></details>
      <p>Confira a filial pelo endereço acima. O preço original por unidade será salvo no histórico. Descartar produtos não reduz o total pago do cupom.</p>
      {comparacao && <section className="card cupom-comparacao"><h3>Comparação com {revisao.destino.titulo}</h3><p>{comparacao.encontrados} itens encontrados · {comparacao.foraDaNota} fora da nota · {comparacao.extras.length} linhas extras · {retirados.length} itens a retirar da lista</p><ul>{comparacao.itens.map(i => <li key={i.id}><strong>{i.nome}</strong><span>Planejado: {numeroCompras(i.quantidadePlanejada)} {i.unidadeCompra} · Na nota: {numeroCompras(i.quantidadeNota)} {i.unidadeCompra}</span><small>{retirados.includes(i.id) ? 'Será retirado da lista ao finalizar' : ({ fora_da_nota: 'Não encontrado — ficará como não comprado', conferido: 'Quantidade conferida', quantidade_menor: 'Quantidade menor que a planejada', quantidade_maior: 'Quantidade maior que a planejada' })[i.situacao]}</small>{i.situacao === 'fora_da_nota' && !['comprado', 'comprado_sem_preco'].includes(i.estado) && <label><input type="checkbox" checked={retirados.includes(i.id)} onChange={e => setRetirados(antes => e.target.checked ? [...antes, i.id] : antes.filter(id => id !== i.id))} /> Retirar este item da lista ao finalizar</label>}</li>)}</ul><p>Associe cada linha abaixo ao item planejado correspondente ou mantenha como produto extra. Produtos extras selecionados serão adicionados à lista.</p></section>}
      <details className="card cupom-catalogo"><summary>Procurar mais produtos cadastrados</summary><button type="button" className="btn btn-secondary" onClick={()=>setLinhas(antes=>reconhecerCupom(antes,catalogo,revisao.tipoCompra,revisao.destino?.itens))}>Reconhecer nomes iguais no catálogo</button><p>{produtosPrincipais(catalogo,{tipoCompra:revisao.tipoCompra}).length} produtos carregados desta categoria. {catalogoPaginacao.temMais?'O catálogo está parcial. Carregue mais antes de cadastrar um produto como novo.':'Produtos antigos sem categoria comprovada podem ser associados em Catálogo → Revisar categorias dos produtos.'}</p>{catalogoPaginacao.carregando&&<p role="status">Carregando produtos…</p>}{catalogoPaginacao.erro&&<p role="alert">{catalogoPaginacao.erro}</p>}{catalogoPaginacao.temMais&&<button type="button" className="btn btn-secondary" disabled={catalogoPaginacao.carregando} onClick={catalogoPaginacao.mais}>Carregar mais produtos para associar</button>}<button type="button" className="btn btn-secondary compras-atualizar" disabled={catalogoPaginacao.carregando} onClick={catalogoPaginacao.atualizar}><Icon name="refresh"/><span>Atualizar produtos</span></button></details>
      <section className="cupom-triagem"><h3>Confira apenas o que precisa de atenção</h3><p>Suas associações serão lembradas nas próximas notas deste estabelecimento. Linhas repetidas são ajustadas juntas.</p><div className="compras-acoes-principais"><button type="button" className={`btn ${somenteAtencao?'btn-primary':'btn-secondary'}`} aria-pressed={somenteAtencao} onClick={()=>setSomenteAtencao(true)}>Precisa de atenção ({pendentes.length})</button><button type="button" className={`btn ${!somenteAtencao?'btn-primary':'btn-secondary'}`} aria-pressed={!somenteAtencao} onClick={()=>setSomenteAtencao(false)}>Todos ({linhas.length})</button></div><details><summary>Facilitar o cadastro de produtos novos</summary><label className="field"><span>Categoria dos produtos novos desta nota (opcional)</span><select value={categoriaNovos} onChange={e=>{const id=e.target.value;setCategoriaNovos(id);setLinhas(antes=>antes.map(i=>!i.produtoId&&i.novoConfirmado?{...i,categoriaId:id}:i));}}><option value="">Escolher em cada produto</option>{categorias.filter(c=>c.ativo!==false).map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select><small>Usada apenas ao escolher “É um produto novo”. Produtos cadastrados mantêm sua categoria.</small></label></details><p className="cupom-progresso" role="status">{pendentes.length ? `${pendentes.length} produto(s) precisam da sua escolha.` : 'Produtos prontos. Confira a loja e o total antes de finalizar.'}</p></section>
      <div className="cupom-linhas">{visiveis.map(({i,index}) => <article id={`cupom-linha-${i.linha}`} key={i.linha} className={`card cupom-linha${!camposFaltantesCupom(i).length && !ocupado ? ' entrada-concluida' : ''}${!i.descartar && (i.erroRevisao || i.unidadePendente || (i.unidadeConferir && !i.unidadeConfirmada)) ? ' cupom-atencao' : ''}${i.descartar ? ' descartada' : ''}`}>
        <header><div className="cupom-produto-identidade"><span className="cupom-numero-linha" aria-label={`Linha ${i.linha}`}>{i.linha}</span><strong>{i.nome || i.nomeOriginal}</strong><small>Na nota: {i.nomeOriginal}</small><span className="cupom-situacao">{i.descartar ? 'Retirado desta importação' : i.erroRevisao || i.unidadePendente || (i.unidadeConferir && !i.unidadeConfirmada) ? 'Escolha um cadastro compatível' : i.produtoId ? 'Produto já cadastrado' : i.novoConfirmado ? 'Novo produto confirmado' : 'Escolha um produto ou confirme como novo'}</span></div><label><input type="checkbox" checked={i.descartar} onChange={e => descartar(index, e.target.checked)} /> Descartar</label></header>
        <p>{numeroCompras(i.quantidade)} {i.unidadeCompra || i.unidadeOriginal} × {i.precoUnitarioOriginalFiscal ? `R$ ${i.precoUnitarioOriginalFiscal}` : moeda(i.precoUnitarioCentavos)} = {moeda(i.totalCentavos)} </p>
        {!i.descartar && <EstadoConclusaoCompra concluido={!camposFaltantesCupom(i).length} aguardando={ocupado} revisao/>}
        {!i.descartar && i.erroRevisao && <p role="alert" className="cupom-unidade-alerta">{i.erroRevisao}</p>}
        {!i.descartar && i.unidadePendente && <section className="cupom-unidade-alerta" role="note"><strong>Atenção neste produto</strong><p>A unidade “{i.unidadeOriginal}” precisa de revisão. Quantidade e valores foram preservados. Este item não será convertido nem incluído no histórico de preços por suposição.</p><button type="button" className="btn btn-secondary" onClick={() => descartar(index, true)}>Retirar este item e continuar</button><small>O total pago da nota permanece o mesmo. Os demais produtos podem ser importados.</small></section>}
        {!i.descartar && !i.unidadePendente && <details className="cupom-editar" open={Boolean(i.erroRevisao) || (!i.produtoId && !!camposFaltantesCupom(i).length) || (i.unidadeConferir && !i.unidadeConfirmada)}><summary>Conferir ou editar produto</summary><div className="cupom-campos">
          {i.unidadeConferir && <label className="field"><span>Atenção: a nota usa “{i.unidadeOriginal}”. Confira se a quantidade e o preço são por embalagem.</span><span><input type="checkbox" required checked={i.unidadeConfirmada === true} onChange={e => atualizar(index, { unidadeConfirmada: e.target.checked })} /> Confirmo que quantidade e preço estão por unidade / embalagem, conforme a nota.</span><small>Ao importar, essa confirmação será lembrada para o mesmo produto e estabelecimento.</small></label>}
          {revisao.destino && <div><button type="button" className="compras-link" onClick={() => setComparando(comparando === index ? null : index)}>{i.itemPlanejadoId ? `Da lista: ${revisao.destino.itens.find(p => p.id === i.itemPlanejadoId)?.nome}` : 'Associar a um item da lista'}</button>{comparando === index && <label className="field"><span>Corresponde a qual item da lista?</span><select value={i.itemPlanejadoId || ''} aria-label={`Item planejado para linha ${i.linha}`} onChange={e => { const item = revisao.destino.itens.find(p => p.id === e.target.value), p = item && (catalogo.find(p => p.id === item.produtoId)||{...item,id:item.produtoId}); atualizar(index, p ? { itemPlanejadoId: item.id, produtoId: p.id, nome: p.nome, apresentacao: p.apresentacao, categoriaId: p.categoriaId, reconhecido: false } : { itemPlanejadoId: '' }); setComparando(null); }}><option value="">Produto extra da nota</option>{revisao.destino.itens.filter(p => opcoesAssociacaoCupom([{...p,id:p.produtoId,tiposCompra:[revisao.tipoCompra]}],{tipoCompra:revisao.tipoCompra,unidadeCompra:i.unidadeCompra,entrada:i}).compativeis.length).map(p => <option key={p.id} value={p.id}>{p.nome} · {numeroCompras(p.quantidadePlanejada)} {p.unidadeCompra}</option>)}</select></label>}</div>}
          <button type="button" className="compras-link" onClick={() => {setBuscaVinculo('');setVinculando(vinculando === index ? null : index);}}>{i.produtoId ? 'Trocar produto associado' : 'Escolher produto já cadastrado'}</button>{vinculando === index && <div><label className="field"><span>Buscar produto por nome, marca ou embalagem</span><input value={buscaVinculo} onChange={e=>setBuscaVinculo(e.target.value)} placeholder="Digite parte do nome cadastrado" /></label>{catalogoPaginacao.carregando&&<p role="status">Procurando em todos os produtos cadastrados desta categoria…</p>}{catalogoPaginacao.erro&&<p role="alert">{catalogoPaginacao.erro}</p>}{opcoesVinculo.buscaAproximada&&<p role="status">Nomes parecidos encontrados. Confira o produto e a apresentação antes de associar.</p>}<label className="field"><span>Produto do catálogo</span><select value={i.produtoId || ''} onChange={e => { const p = catalogo.find(p => p.id === e.target.value); if(p) associarProduto(index,p); else atualizar(index,{itemPlanejadoId:'',produtoId:'',reconhecido:false}); setVinculando(null); }}><option value="">Cadastrar com o nome abaixo</option>{opcoesVinculo.compativeis.map(p => <option key={p.id} value={p.id}>{p.nome} · {p.marca||'Sem marca'} · {p.apresentacao} · por {p.unidadeCompra}</option>)}{opcoesVinculo.incompativeis.length>0&&<optgroup label="Outra unidade ou embalagem — não associar">{opcoesVinculo.incompativeis.map(p=><option disabled key={p.id} value={p.id}>{p.nome} · {p.apresentacao} · por {p.unidadeCompra}</option>)}</optgroup>}</select></label>{!opcoesVinculo.compativeis.length&&<p role="status">{catalogoPaginacao.carregando?'A busca no catálogo ainda está em andamento.':'Nenhum produto compatível encontrado para esta busca.'} {catalogoPaginacao.temMais?'Carregue mais produtos desta categoria.':'Confira a categoria e a unidade cadastradas.'}</p>}{opcoesVinculo.incompativeis.length>0&&<p>A nota está em {i.unidadeCompra}. Cadastros com outra unidade, peso, dose ou embalagem estão desabilitados para evitar uma associação incorreta.</p>}{catalogoPaginacao.temMais&&<button type="button" className="btn btn-secondary" disabled={catalogoPaginacao.carregando} onClick={catalogoPaginacao.todos||catalogoPaginacao.mais}>Buscar no restante do catálogo</button>}{i.produtoId && <button type="button" className="compras-link" onClick={() => { atualizar(index, { itemPlanejadoId: '', produtoId: '', reconhecido: false }); setVinculando(null); }}>Cadastrar como outro produto</button>}</div>}
          {(!i.produtoId||i.erroRevisao)&&<button type="button" className="btn btn-secondary" onClick={()=>atualizar(index,{produtoId:'',itemPlanejadoId:'',reconhecido:false,nome:i.nomeOriginal.slice(0,120),novoConfirmado:true,apresentacao:embalagemFiscal(i),categoriaId:categoriaNovos||i.categoriaId})}>{i.novoConfirmado?'Novo produto confirmado':'É um produto novo'}</button>}
          {(!i.produtoId||i.erroRevisao)&&<SugestoesProduto compacto textoAcao="Usar este produto" tipoCompra={revisao.tipoCompra} entrada={i} catalogo={opcoesAssociacaoCupom(catalogo,{tipoCompra:revisao.tipoCompra,unidadeCompra:i.unidadeCompra,entrada:i}).compativeis} associar={p=>associarProduto(index,p)}/>}
          <details className="cupom-dados-produto" open={!i.produtoId&&i.novoConfirmado}><summary>{i.produtoId?'Dados do produto cadastrado':'Ajustar nome, marca, embalagem e categoria'}</summary><div className="cupom-campos"><label className="field"><span>Como você chama este produto?</span><input value={i.nome} disabled={Boolean(i.produtoId)} onChange={e => atualizar(index, { nome: e.target.value })} required maxLength={120} /></label>
          <label className="field"><span>Marca do produto (opcional)</span><input value={i.marca || ''} onChange={e => atualizar(index, { marca: e.target.value })} maxLength={80} placeholder="Ex.: marca da embalagem" /></label>
          <label className="field"><span>Apresentação / embalagem</span><input value={i.apresentacao || ''} disabled={Boolean(i.produtoId)} onChange={e => atualizar(index, { apresentacao: e.target.value })} required maxLength={120} placeholder="Ex.: pacote com 8 rolos, venda por kg…" /></label>
          <label className="field"><span>Categoria</span><select value={i.categoriaId || ''} disabled={Boolean(i.produtoId)} onChange={e => atualizar(index, { categoriaId: e.target.value })} required><option value="">Selecione</option>{categorias.filter(c => c.ativo !== false).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></label>
          </div></details>
          {i.reconhecido && !i.erroRevisao && <small className="cupom-reconhecido">{i.origemReconhecimento === 'exato' ? 'Reconhecido pelo nome exato e apresentação compatível no catálogo.' : i.origemReconhecimento === 'lista' ? 'Produto reconhecido pelo nome exato na lista. Confira a correspondência.' : 'Nome e categoria reconhecidos de uma importação confirmada.'}</small>}
        </div></details>}

      </article>)}</div>
      <p>{linhas.filter(i => !i.descartar).length} produtos selecionados de {linhas.length} linhas. O total da compra permanece {moeda(revisao.nota.totalPagoCentavos)}.</p>
      <label><input type="checkbox" required /> Conferi os itens, a filial e o total pago da nota.{comparacao ? ` Os itens vinculados receberão os valores da nota; ${retirados.length} itens marcados serão retirados da lista e os demais fora da nota ficarão como não comprados.` : ''}</label>
      <div className="compras-acoes-principais"><button className="btn btn-success" disabled={ocupado || !linhas.some(i => !i.descartar)}>{ocupado ? 'Importando…' : 'Finalizar compra'}</button><button className="btn btn-secondary" type="button" disabled={ocupado} onClick={() => setRevisao(null)}>Voltar à nota</button></div>
    </form>}</fieldset>
    {descartePendente !== null && <ConfirmarDescarte nome={linhas[descartePendente].nomeOriginal} cancelar={() => setDescartePendente(null)} confirmar={() => { atualizar(descartePendente, { descartar: true }); setDescartePendente(null); }} />}
  </div>;
}
