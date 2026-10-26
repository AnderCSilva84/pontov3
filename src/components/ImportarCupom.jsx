import {produtosPrincipais} from '../utils/catalogoProdutos';
import {SugestoesProduto} from './AssociacoesProdutos';
import {tipoCompra as tipoDaLista} from '../utils/comprasTipo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { operarCompras } from '../services/compras';
import { moeda, numeroCompras } from '../utils/comprasAnalise';
import { compararCupomComLista } from '../utils/cupomComparacao';
import { normalizarQrCupom, mensagemLinkCupom } from '../utils/cupomQr';
import { iniciarScannerQr, abrirConfiguracoesCamera, cameraAndroid } from '../services/scannerQr';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { conectarCicloScanner } from '../utils/scannerQr';

function ConfirmarDescarte({ nome, confirmar, cancelar }) {
  const ref = useRef(null);
  useEffect(() => { const dialog = ref.current; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog ref={ref} className="compras-dialog cupom-confirmar" aria-labelledby="cupom-confirmar-titulo" onCancel={e => { e.preventDefault(); e.stopPropagation(); cancelar(); }}><div className="compras-form"><h3 id="cupom-confirmar-titulo">Descartar produto?</h3><p>Tem certeza que deseja descartar “{nome}” desta importação?</p><div className="compras-acoes-principais"><button type="button" className="btn btn-secondary" onClick={cancelar} autoFocus>Manter produto</button><button type="button" className="btn btn-danger" onClick={confirmar}>Sim, descartar</button></div></div></dialog>;
}

function CameraCupom({ aoLer, fechar }) {
  const video = useRef(null), [erro, setErro] = useState(''), [ajuda, setAjuda] = useState(false);
  const [cameras, setCameras] = useState([]), [cameraId, setCameraId] = useState(''), [cameraAtual, setCameraAtual] = useState('');
  const [tentativa, setTentativa] = useState(0);
  const callbacks = useRef({ aoLer, fechar });
  useEffect(() => { callbacks.current = { aoLer, fechar }; }, [aoLer, fechar]);
  useEffect(() => {
    let ativo = true;
    const timer = setTimeout(() => { if (ativo) setAjuda(true); }, 15000);
    const sessao = auth.currentUser?.uid;
    const scanner = iniciarScannerQr({ video: video.current, cameraId,
      aoLer: resultado => {
        if (!ativo) return;
        clearTimeout(timer);
        if (!destinoSeguro(resultado.textoBruto)) { setErro('Este QR Code não é uma NFC-e do Pará compatível. Tente novamente ou cole o link da nota.'); return; }
        callbacks.current.aoLer(resultado.textoBruto);
      },
      aoErro: e => { if (ativo) { clearTimeout(timer); setErro(e.message); } },
      aoCameras: id => {
        if (!ativo) return;
        setCameraAtual(id);
        navigator.mediaDevices.enumerateDevices().then(ds => { if (ativo) setCameras(ds.filter(d => d.kind === 'videoinput')); }).catch(() => {});
      },
    });
    const cancelar = () => { scanner.parar(); callbacks.current.fechar(); };
    const sairCiclo = conectarCicloScanner(window, document, cancelar);
    const sairAuth = onAuthStateChanged(auth, u => { if (u?.uid !== sessao) cancelar(); });
    return () => {
      ativo = false; clearTimeout(timer); scanner.parar(); sairAuth();
      sairCiclo();
    };
  }, [cameraId, tentativa]);
  const reiniciar = () => { setErro(''); setAjuda(false); setTentativa(t => t + 1); };
  return <section className="compras-form" aria-label="Leitor de QR Code"><div className="cupom-camera-quadro"><video ref={video} autoPlay muted playsInline className="cupom-camera" aria-label="Câmera para ler o QR Code" /><span aria-hidden="true" /></div><p>Posicione o QR Code inteiro no centro, com boa luz.</p>{cameras.length > 1 && <label className="field"><span>Trocar câmera</span><select value={cameraId || cameraAtual} onChange={e => { setErro(''); setAjuda(false); setCameraId(e.target.value); }}>{cameras.map((c, i) => <option key={c.deviceId} value={c.deviceId}>{c.label || `Câmera ${i + 1}`}</option>)}</select></label>}{ajuda && !erro && <p role="status">Afaste um pouco o celular até ficar nítido ou cole o link como alternativa.</p>}{erro && <><p role="alert">{erro}</p><button type="button" className="btn btn-secondary" onClick={reiniciar}>Tentar novamente</button>{cameraAndroid() && <button type="button" className="btn btn-secondary" onClick={() => abrirConfiguracoesCamera().catch(() => setErro('Abra Configurações → Aplicativos → AP1303 → Permissões → Câmera.'))}>Configurações da câmera</button>}</>}<button type="button" className="btn btn-secondary" onClick={fechar}>Cancelar leitura</button></section>;
}
const destinoSeguro = normalizarQrCupom;
export default function ImportarCupom({ categorias, catalogo, mercados, aoImportar, listaDestino = null, listasDisponiveis = [] }) {
  const [link, setLink] = useState(''), [texto, setTexto] = useState(''), [camera, setCamera] = useState(false);
  const [revisao, setRevisao] = useState(null), [linhas, setLinhas] = useState([]), [mercado, setMercado] = useState('');
  const [erro, setErro] = useState(''), [ocupado, setOcupado] = useState(false);
  const [novaFilial, setNovaFilial] = useState({ nome: '', filial: '', cidade: '' });
  const [vinculando, setVinculando] = useState(null);
  const [titulo, setTitulo] = useState(listaDestino?.titulo || '');
  const [tipo, setTipo]=useState('supermercado');
  const [comparando, setComparando] = useState(null);
  const [descartePendente, setDescartePendente] = useState(null);
  const [destinoId, setDestinoId] = useState(listaDestino?.id || '');
  const [retirados, setRetirados] = useState([]);
  const destinos = listasDisponiveis.some(l => l.id === listaDestino?.id) || !listaDestino ? listasDisponiveis : [listaDestino, ...listasDisponiveis];
  const destinoEscolhido = destinos.find(l => l.id === destinoId);
  const notaUrl = destinoSeguro(link);
  const comparacao = revisao?.destino ? compararCupomComLista(revisao.destino.itens, linhas) : null;
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
      const r = await operarCompras('cupomPreparar', { tipoCompra:tipo, link: notaUrl || link, ...(automatico ? { automatico: true } : { texto }), ...(destinoId ? { listaDestinoId: destinoId } : {}) });
      setRevisao(r); setRetirados([]); setLinhas(r.nota.itens.map(i => ({ ...i, descartar: false })));
      setTitulo(t => t.trim() || r.destino?.titulo || `Cupom · ${r.nota.emitente}`.slice(0, 120));
      const correspondentes = mercados.filter(m => m.ativo !== false && m.cnpj?.replace(/\D/g, '') === r.nota.cnpj);
      if (correspondentes.length === 1) setMercado(correspondentes[0].id);
    } catch (e) { setErro(e.message); } finally { setOcupado(false); }
  }
  function atualizar(index, campos) {
    if (campos.itemPlanejadoId) {
      const planejado = revisao.destino?.itens.find(i => i.id === campos.itemPlanejadoId);
      campos = { marca: linhas[index].marca || planejado?.marca || '', ...campos };
    }
    const associado = campos.itemPlanejadoId || (campos.descartar === false ? linhas[index].itemPlanejadoId : '');
    if (associado) setRetirados(antes => antes.filter(id => id !== associado));
    setLinhas(antes => antes.map((i, n) => n === index || (!Object.hasOwn(campos, 'descartar') && i.codigo === antes[index].codigo && i.nomeOriginal === antes[index].nomeOriginal && i.unidadeOriginal === antes[index].unidadeOriginal) ? { ...i, ...campos } : i));
  }
  function descartar(index, marcado) {
    if (marcado) setDescartePendente(index);
    else atualizar(index, { descartar: false });
  }
  async function confirmar(e) {
    e.preventDefault(); setOcupado(true); setErro('');
    try {
      const r = await operarCompras('cupomConfirmar', { versaoIdentidade:1,titulo, rascunhoId: revisao.rascunhoId, supermercadoId: mercado, retirarPlanejados: retirados, itens: linhas.map(i => ({ linha: i.linha, novoConfirmado:i.novoConfirmado===true, descartar: i.descartar, unidadeConfirmada: i.unidadeConfirmada === true, itemPlanejadoId: i.itemPlanejadoId || '', produtoId: i.produtoId || '', nome: i.nome, marca: i.marca || '', categoriaId: i.categoriaId, apresentacao: i.apresentacao })) });
      aoImportar(r);
    } catch (e) { setErro(e.message); } finally { setOcupado(false); }
  }
  async function cadastrarFilial() {
    setOcupado(true); setErro('');
    try {
      const r = await operarCompras('supermercado', { ...novaFilial, nome: novaFilial.nome || revisao.nota.emitente });
      setMercado(r.supermercadoId);
    } catch (e) { setErro(e.message); } finally { setOcupado(false); }
  }
  return <div className="compras-form cupom-importar">
    <p>{destinoEscolhido ? `Compare o cupom com “${destinoEscolhido.titulo}”, confira os produtos e finalize esta lista com os valores da nota.` : 'Importe a compra como uma nova lista ou associe o cupom a uma lista que você já preparou.'}</p>
    {erro && <p role="alert" className="mensagem erro">{erro}</p>}
    <fieldset disabled={ocupado} className="compras-fieldset">
    {!revisao ? <><label className="field"><span>Classificação</span><select value={destinoId?tipoDaLista(destinos.find(l=>l.id===destinoId)):tipo} disabled={Boolean(destinoId)} onChange={e=>setTipo(e.target.value)}><option value="supermercado">Supermercado</option><option value="farmacia">Farmácia</option></select></label>
      <label className="field"><span>Associar a qual lista?</span><select value={destinoId} onChange={e => { const id = e.target.value; setDestinoId(id); setTitulo(destinos.find(l => l.id === id)?.titulo || ''); }}><option value="">Criar nova lista com esta nota</option>{destinos.filter(l => ['rascunho', 'em_compra'].includes(l.status)).map(l => <option key={l.id} value={l.id}>{l.titulo}</option>)}</select></label>
      <label className="field"><span>Nome da lista de compras</span><input value={titulo} onChange={e => setTitulo(e.target.value)} maxLength={120} placeholder="Ex.: Compras da semana" /><small>Você pode definir o nome agora e ajustar antes de finalizar a importação.</small></label>
      {camera && <CameraCupom aoLer={recebeuLink} fechar={() => setCamera(false)} />}
      <div className="compras-acoes-principais">{!camera && <button type="button" className="btn btn-secondary" disabled={ocupado} onClick={() => setCamera(true)}>Escanear QR Code</button>}</div>
      <form className="compras-form" onSubmit={preparar}>
        <p>Se a leitura interna não funcionar: abra a câmera do celular, aponte para o QR Code e copie o link reconhecido. Volte aqui e cole o endereço completo, antes de abrir a página de resumo.</p>
        <button type="button" className="btn btn-secondary" onClick={colarLink}>Colar link da nota</button>
        <label className="field"><span>Link completo do QR Code (opcional)</span><input type="url" value={link} onChange={e => setLink(e.target.value)} maxLength={1000} placeholder="https://app.sefa.pa.gov.br/consulta-nfce/#/qrcode?p=…" /></label>
        {mensagemLinkCupom(link) && <p role="alert" className="mensagem erro">{mensagemLinkCupom(link)}</p>}
        {notaUrl && <p role="status">Link pronto. Abra a nota e cole o texto abaixo para conferir os produtos. A compra ainda não foi importada.</p>}
        {notaUrl && <a className="btn btn-secondary" href={notaUrl} target="_blank" rel="noopener noreferrer">Abrir nota na SEFA</a>}
        <p className="mensagem">Você também pode importar sem link: cole o texto completo da SEFA, incluindo produtos, totais, data e chave de acesso. O carregamento automático dos produtos ainda está indisponível.</p>
        <label className="field"><span>Texto completo da nota</span><textarea value={texto} onChange={e => setTexto(e.target.value)} required maxLength={150000} rows={8} placeholder="Cole o conteúdo da nota aberta na SEFA…" /></label>
        <button className="btn btn-success" disabled={ocupado || !texto.trim() || (!!link.trim() && !notaUrl)}>{ocupado ? 'Lendo nota…' : 'Conferir nota e produtos'}</button>
      </form>
    </> : <form className="compras-form" onSubmit={confirmar}>
      <label className="field"><span>Nome da lista de compras</span><input value={titulo} onChange={e => setTitulo(e.target.value)} required maxLength={120} placeholder="Ex.: Compras da semana" /></label>
      <section className="card cupom-resumo"><h3>{revisao.nota.emitente}</h3><p>CNPJ: {revisao.nota.cnpj} · {new Date(revisao.nota.emitidaEm).toLocaleString('pt-BR', { timeZone: 'America/Fortaleza' })}</p><p>{revisao.nota.endereco}</p><dl><dt>Valor original</dt><dd>{moeda(revisao.nota.totalOriginalCentavos)}</dd><dt>Desconto da nota</dt><dd>{moeda(revisao.nota.descontoCentavos)}</dd><dt>Total pago · compra e No Bolso</dt><dd><strong>{moeda(revisao.nota.totalPagoCentavos)}</strong></dd></dl></section>
      <label className="field"><span>Supermercado / filial desta nota</span><select required value={mercado} onChange={e => setMercado(e.target.value)}><option value="">Selecione a filial correspondente</option>{mercados.filter(m => m.ativo !== false).map(m => <option key={m.id} value={m.id}>{m.nome} · {m.filial} ({m.cidade})</option>)}</select></label>
      <details><summary>Cadastrar supermercado ou filial</summary><div className="compras-form">
        <label className="field"><span>Nome do supermercado</span><input value={novaFilial.nome || revisao.nota.emitente} maxLength={120} onChange={e => setNovaFilial(v => ({ ...v, nome: e.target.value }))} /></label>
        <label className="field"><span>Filial / bairro</span><input value={novaFilial.filial} maxLength={120} onChange={e => setNovaFilial(v => ({ ...v, filial: e.target.value }))} /></label>
        <label className="field"><span>Cidade</span><input value={novaFilial.cidade} maxLength={120} onChange={e => setNovaFilial(v => ({ ...v, cidade: e.target.value }))} /></label>
        <button type="button" className="btn btn-secondary" disabled={ocupado} onClick={cadastrarFilial}>Salvar e selecionar filial</button>
      </div></details>
      <p>Confira a filial pelo endereço acima. O preço original por unidade será salvo no histórico. Descartar produtos não reduz o total pago do cupom.</p>
      {comparacao && <section className="card cupom-comparacao"><h3>Comparação com {revisao.destino.titulo}</h3><p>{comparacao.encontrados} itens encontrados · {comparacao.foraDaNota} fora da nota · {comparacao.extras.length} linhas extras · {retirados.length} itens a retirar da lista</p><ul>{comparacao.itens.map(i => <li key={i.id}><strong>{i.nome}</strong><span>Planejado: {numeroCompras(i.quantidadePlanejada)} {i.unidadeCompra} · Na nota: {numeroCompras(i.quantidadeNota)} {i.unidadeCompra}</span><small>{retirados.includes(i.id) ? 'Será retirado da lista ao finalizar' : ({ fora_da_nota: 'Não encontrado — ficará como não comprado', conferido: 'Quantidade conferida', quantidade_menor: 'Quantidade menor que a planejada', quantidade_maior: 'Quantidade maior que a planejada' })[i.situacao]}</small>{i.situacao === 'fora_da_nota' && !['comprado', 'comprado_sem_preco'].includes(i.estado) && <label><input type="checkbox" checked={retirados.includes(i.id)} onChange={e => setRetirados(antes => e.target.checked ? [...antes, i.id] : antes.filter(id => id !== i.id))} /> Retirar este item da lista ao finalizar</label>}</li>)}</ul><p>Associe cada linha abaixo ao item planejado correspondente ou mantenha como produto extra. Produtos extras selecionados serão adicionados à lista.</p></section>}
      <div className="cupom-linhas">{linhas.map((i, index) => <article key={i.linha} className={`card cupom-linha${i.descartar ? ' descartada' : ''}`}>
        <header><strong>#{i.linha} · {i.nomeOriginal}</strong><label><input type="checkbox" checked={i.descartar} onChange={e => descartar(index, e.target.checked)} /> Descartar</label></header>
        <p>{numeroCompras(i.quantidade)} {i.unidadeCompra} × {moeda(i.precoUnitarioCentavos)} = {moeda(i.totalCentavos)} <small>(unidade na nota: {i.unidadeOriginal})</small></p>
        {!i.descartar && <div className="cupom-campos">
          {i.unidadeConferir && <label className="field"><span>A nota usa a unidade comercial “{i.unidadeOriginal}”. Confira a embalagem: não haverá conversão de quantidade ou preço.</span><span><input type="checkbox" required checked={i.unidadeConfirmada === true} onChange={e => atualizar(index, { unidadeConfirmada: e.target.checked })} /> Confirmo que quantidade e preço estão por unidade / embalagem, conforme a nota.</span><small>Ao importar, essa confirmação será lembrada para o mesmo produto e estabelecimento.</small></label>}
          {revisao.destino && <div><button type="button" className="compras-link" onClick={() => setComparando(comparando === index ? null : index)}>{i.itemPlanejadoId ? `Da lista: ${revisao.destino.itens.find(p => p.id === i.itemPlanejadoId)?.nome}` : 'Associar a um item da lista'}</button>{comparando === index && <label className="field"><span>Corresponde a qual item da lista?</span><select value={i.itemPlanejadoId || ''} aria-label={`Item planejado para linha ${i.linha}`} onChange={e => { const item = revisao.destino.itens.find(p => p.id === e.target.value), p = item && catalogo.find(p => p.id === item.produtoId); atualizar(index, p ? { itemPlanejadoId: item.id, produtoId: p.id, nome: p.nome, apresentacao: p.apresentacao, categoriaId: p.categoriaId, reconhecido: false } : { itemPlanejadoId: '' }); setComparando(null); }}><option value="">Produto extra da nota</option>{revisao.destino.itens.filter(p => p.unidadeCompra === i.unidadeCompra && catalogo.some(c => c.id === p.produtoId && c.ativo !== false && c.unidadeCompra === i.unidadeCompra)).map(p => <option key={p.id} value={p.id}>{p.nome} · {numeroCompras(p.quantidadePlanejada)} {p.unidadeCompra}</option>)}</select></label>}</div>}
          <button type="button" className="compras-link" onClick={() => setVinculando(vinculando === index ? null : index)}>{i.produtoId ? 'Trocar produto associado' : 'Escolher produto já cadastrado'}</button>{vinculando === index && <div><label className="field"><span>Produto do catálogo</span><select value={i.produtoId || ''} onChange={e => { const p = catalogo.find(p => p.id === e.target.value); atualizar(index, p ? { itemPlanejadoId: '', produtoId: p.id, nome: p.nome, apresentacao: p.apresentacao, categoriaId: p.categoriaId, reconhecido: false } : { itemPlanejadoId: '', produtoId: '', reconhecido: false }); setVinculando(null); }}><option value="">Cadastrar com o nome abaixo</option>{produtosPrincipais(catalogo).filter(p => p.unidadeCompra === i.unidadeCompra).map(p => <option key={p.id} value={p.id}>{p.nome} · {p.apresentacao}</option>)}</select></label>{i.produtoId && <button type="button" className="compras-link" onClick={() => { atualizar(index, { itemPlanejadoId: '', produtoId: '', reconhecido: false }); setVinculando(null); }}>Cadastrar como outro produto</button>}</div>}
          {!i.produtoId&&<button type="button" className="btn btn-secondary" onClick={()=>atualizar(index,{novoConfirmado:true})}>{i.novoConfirmado?'Novo produto confirmado':'Cadastrar como novo'}</button>}
          {!i.produtoId&&<SugestoesProduto entrada={i} catalogo={catalogo} associar={p=>atualizar(index,{produtoId:p.id,nome:p.nome,apresentacao:p.apresentacao,categoriaId:p.categoriaId,reconhecido:false})}/>}
          <label className="field"><span>Nome para o catálogo</span><input value={i.nome} disabled={Boolean(i.produtoId)} onChange={e => atualizar(index, { nome: e.target.value })} required maxLength={120} /></label>
          <label className="field"><span>Marca do produto (opcional)</span><input value={i.marca || ''} onChange={e => atualizar(index, { marca: e.target.value })} maxLength={80} placeholder="Ex.: marca da embalagem" /></label>
          <label className="field"><span>Apresentação / embalagem</span><input value={i.apresentacao || ''} disabled={Boolean(i.produtoId)} onChange={e => atualizar(index, { apresentacao: e.target.value })} required maxLength={120} placeholder="Ex.: pacote com 8 rolos, venda por kg…" /></label>
          <label className="field"><span>Categoria</span><select value={i.categoriaId || ''} disabled={Boolean(i.produtoId)} onChange={e => atualizar(index, { categoriaId: e.target.value })} required><option value="">Selecione</option>{categorias.filter(c => c.ativo !== false).map(c => <option key={c.id} value={c.id}>{c.icone} {c.nome}</option>)}</select></label>
          {i.reconhecido && <small className="cupom-reconhecido">{i.origemReconhecimento === 'lista' ? 'Produto reconhecido pelo nome exato na lista. Confira a correspondência.' : 'Nome e categoria reconhecidos de uma importação confirmada.'}</small>}
        </div>}
      </article>)}</div>
      <p>{linhas.filter(i => !i.descartar).length} produtos selecionados de {linhas.length} linhas. O total da compra permanece {moeda(revisao.nota.totalPagoCentavos)}.</p>
      <label><input type="checkbox" required /> Conferi os itens, a filial e o total pago da nota.{comparacao ? ` Os itens vinculados receberão os valores da nota; ${retirados.length} itens marcados serão retirados da lista e os demais fora da nota ficarão como não comprados.` : ''}</label>
      <div className="compras-acoes-principais"><button className="btn btn-success" disabled={ocupado || !linhas.some(i => !i.descartar)}>{ocupado ? 'Importando…' : comparacao ? 'Finalizar compra com este cupom' : 'Confirmar importação'}</button><button className="btn btn-secondary" type="button" disabled={ocupado} onClick={() => setRevisao(null)}>Voltar à nota</button></div>
    </form>}</fieldset>
    {descartePendente !== null && <ConfirmarDescarte nome={linhas[descartePendente].nomeOriginal} cancelar={() => setDescartePendente(null)} confirmar={() => { atualizar(descartePendente, { descartar: true }); setDescartePendente(null); }} />}
  </div>;
}
