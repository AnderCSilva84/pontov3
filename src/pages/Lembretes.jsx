import LembreteNotificacao from '../components/LembreteNotificacao';
import PratosDia from '../components/PratosDia';
import { collection } from '../services/dadosGrupo';
import { PageHeader, Segmented, Icon } from '../components/ui';
import { acoesPendentesDoDia } from '../utils/lembretesSequencia';
import { useEffect, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { operarLembrete } from '../services/lembretes';
import BottomNav from '../components/BottomNav';
import { compartilharPdfNativo } from '../utils/comprovantes';
import { registrarPush, testarPush } from '../services/push';
import '../styles/lembretes.css';
import '../styles/nav.css';

const TIPOS = { remedio: 'Remédio', passeio: 'Passeio', fisioterapia: 'Fisioterapia', consulta: 'Consulta', cuidado: 'Cuidado', outro: 'Outro' };
const ICONES = { remedio: '💊', passeio: '🌳', fisioterapia: '🧘', consulta: '🩺', cuidado: '🤲', outro: '🔔' };
const CUIDADOS = { crianca: 'Criança', idoso: 'Idoso', adulto: 'Adulto', cao: 'Cão', gato: 'Gato' };
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const hojeLocal = () => new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10);

function FormLembrete({ lembrete, salvar, cancelar, ocupado, cuidados, cuidadoInicial, pessoas }) {
  const [destino, setDestino] = useState(lembrete?.destinatarios === 'todos' ? 'todos' : lembrete?.usuarioId || 'todos');
  const [cuidadoId, setCuidadoId] = useState(lembrete?.cuidadoId || cuidadoInicial || '');
  const [tipo, setTipo] = useState(lembrete?.tipo || 'remedio');
  const [repeticao, setRepeticao] = useState(lembrete?.repeticao || 'uma_vez');
  const [dias, setDias] = useState(lembrete?.diasSemana || [1, 2, 3, 4, 5]);
  const [horarios, setHorarios] = useState(lembrete?.horarios || [lembrete?.horario || '']);
  const [destinatarioCuidado, setDestinatarioCuidado] = useState(lembrete?.destinatarioCuidado || 'crianca');
  return <form className="card lembrete-form" onSubmit={e => {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    salvar({ destinatarios: destino === 'todos' ? 'todos' : 'usuario', usuarioId: destino, cuidadoId, titulo: f.get('titulo'), tipo, destinatarioCuidado, nomeCuidado: f.get('nomeCuidado') || '', horarios: f.getAll('horarios'), dataInicio: f.get('dataInicio'), repeticao, diasSemana: dias, medicamento: f.get('medicamento') || '', posologia: f.get('posologia') || '', observacao: f.get('observacao') || '' });
  }}>
    <h2>{lembrete ? 'Editar lembrete' : 'Novo lembrete'}</h2>
    <fieldset disabled={ocupado} className="lembrete-form-campos">
      <label className="field"><span>Quem recebe este lembrete</span><select required value={destino} onChange={e => setDestino(e.target.value)}><option value="todos">Global · todos os usuários habilitados</option>{pessoas.map(p => <option key={p.id} value={p.id}>{p.nome || p.email}</option>)}</select></label>
      <label className="field"><span>Tipo de cuidado</span><select value={tipo} onChange={e => setTipo(e.target.value)}>{Object.entries(TIPOS).map(([id, nome]) => <option key={id} value={id}>{ICONES[id]} {nome}</option>)}</select></label>
      <label className="field"><span>Pessoa ou pet cadastrado</span><select value={cuidadoId} onChange={e => setCuidadoId(e.target.value)}><option value="">Cadastro anterior por usuário</option>{cuidados.map(c => <option key={c.id} value={c.id}>{c.nome} · {CUIDADOS[c.tipo]}</option>)}</select></label>
      {!cuidadoId && <div className="lembrete-dupla"><label className="field"><span>Quem recebe o cuidado</span><select value={destinatarioCuidado} onChange={e => setDestinatarioCuidado(e.target.value)}>{Object.entries(CUIDADOS).map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}</select></label><label className="field"><span>{['cao', 'gato'].includes(destinatarioCuidado) ? 'Nome do pet' : 'Nome da pessoa (opcional)'}</span><input name="nomeCuidado" required={['cao', 'gato'].includes(destinatarioCuidado)} maxLength={100} defaultValue={lembrete?.nomeCuidado || ''} /></label></div>}
      <label className="field"><span>Título do lembrete</span><input name="titulo" required maxLength={120} defaultValue={lembrete?.titulo || ''} placeholder="Ex.: Remédio da manhã, passeio da tarde" /></label>
      {tipo === 'remedio' && <><label className="field"><span>Nome do remédio</span><input name="medicamento" required maxLength={120} defaultValue={lembrete?.medicamento || ''} /></label><label className="field"><span>Posologia</span><textarea name="posologia" required maxLength={200} rows={2} defaultValue={lembrete?.posologia || ''} placeholder="Registre a dose e as orientações conforme informado para esse cuidado" /></label></>}
      <div className="lembrete-dupla"><label className="field"><span>{repeticao === 'uma_vez' ? 'Data' : 'Começar em'}</span><input type="date" name="dataInicio" required defaultValue={lembrete?.dataInicio || hojeLocal()} /></label>{tipo === 'remedio' && <label className="field"><span>Vezes por dia</span><select value={horarios.length} onChange={e => { const quantidade = Number(e.target.value); setHorarios(antes => Array.from({ length: quantidade }, (_, i) => antes[i] || '')); }}>{Array.from({ length: 24 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1} {i ? 'vezes' : 'vez'}</option>)}</select></label>}</div>
      <div className="lembrete-dupla">{(tipo === 'remedio' ? horarios : horarios.slice(0, 1)).map((horario, i) => <label className="field" key={i}><span>{tipo === 'remedio' ? `Horário da dose ${i + 1}` : 'Horário'}</span><input type="time" name="horarios" required defaultValue={horario} /></label>)}</div>
      <label className="field"><span>Repetir</span><select value={repeticao} onChange={e => setRepeticao(e.target.value)}><option value="uma_vez">Somente nesta data</option><option value="diario">Todos os dias</option><option value="dias">Dias da semana</option></select></label>
      {repeticao === 'dias' && <fieldset className="lembrete-dias"><legend>Dias do cuidado</legend>{DIAS.map((nome, id) => <label key={id}><input type="checkbox" checked={dias.includes(id)} onChange={e => { const marcado = e.target.checked; setDias(antes => marcado ? [...antes, id] : antes.filter(n => n !== id)); }} /><span>{nome}</span></label>)}</fieldset>}
      <label className="field"><span>Observações (opcional)</span><textarea name="observacao" rows={2} maxLength={300} defaultValue={lembrete?.observacao || ''} /></label>
      <p className="text-muted">Horários de Brasília (UTC−3).</p>
      <div className="lembrete-acoes"><button className="btn btn-success">{ocupado ? 'Salvando…' : 'Salvar lembrete'}</button><button type="button" className="btn btn-secondary" onClick={cancelar}>Cancelar</button></div>
    </fieldset>
  </form>;
}

function FormCuidado({ cuidado, pessoas, salvar, cancelar, ocupado }) {
  const [destino, setDestino] = useState(cuidado?.destinatarios === 'todos' ? 'todos' : cuidado?.usuarioId || '');
  return <form className="card lembrete-form" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); salvar({ nome: f.get('nome'), tipo: f.get('tipo'), destinatarios: destino === 'todos' ? 'todos' : 'usuario', usuarioId: destino, ...(cuidado?.id ? { id: cuidado.id, versao: cuidado.versao } : {}) }); }}>
    <h2>{cuidado?.id ? 'Editar pessoa ou pet' : 'Cadastrar pessoa ou pet'}</h2>
    <fieldset disabled={ocupado} className="lembrete-form-campos">
      <label className="field"><span>Nome da pessoa ou pet</span><input name="nome" required maxLength={100} defaultValue={cuidado?.nome || ''} /></label>
      <label className="field"><span>Tipo de pessoa ou pet</span><select name="tipo" defaultValue={cuidado?.tipo || 'crianca'}>{Object.entries(CUIDADOS).map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}</select></label>
      <label className="field"><span>Quem recebe os lembretes</span><select required value={destino} onChange={e => setDestino(e.target.value)}><option value="" disabled>Selecione um responsável</option><option value="todos">Todos os usuários habilitados</option>{pessoas.map(p => <option key={p.id} value={p.id}>{p.nome || p.email}</option>)}</select></label>
      <div className="lembrete-acoes"><button className="btn btn-success">Salvar cadastro</button><button type="button" className="btn btn-secondary" onClick={cancelar}>Cancelar</button></div>
    </fieldset>
  </form>;
}

function LembretesCuidados({ user, onNavigate }) {
  const admin = user.role === 'admin';
  const [filtroCuidado, setFiltroCuidado] = useState('todos');
  const [cuidados, setCuidados] = useState([]), [cuidadoSelecionado, setCuidadoSelecionado] = useState(''), [edicaoCuidado, setEdicaoCuidado] = useState(null);
  const [pessoas, setPessoas] = useState([]), [selecionada, setSelecionada] = useState('');
  const [lembretes, setLembretes] = useState([]), [erro, setErro] = useState(''), [aviso, setAviso] = useState('');
  const [edicao, setEdicao] = useState(null), [ocupado, setOcupado] = useState(false), [carregando, setCarregando] = useState(true);
  const [agora, setAgora] = useState(Date.now());
  const [atualizacao, setAtualizacao] = useState(0), [erroConsulta, setErroConsulta] = useState('');
  const [cuidadoPdf, setCuidadoPdf] = useState('todos');
  const [arquivo, setArquivo] = useState(null), [gerandoPdf, setGerandoPdf] = useState(false), [testandoAviso, setTestandoAviso] = useState(false);
  const alvo = admin && pessoas.some(p => p.id === selecionada) ? selecionada : user.uid;
  const pessoasConsulta = [{ id: user.uid, nome: user.nome || user.email, role: user.role }, ...pessoas.filter(p => p.id !== user.uid)];
  const cuidadoAtual = cuidadoSelecionado || 'todos';
  const cuidadoIdAtual = ['anteriores','todos'].includes(cuidadoAtual) ? '' : cuidadoAtual;
  const cadastroAtual = cuidados.find(c => c.id === cuidadoAtual);
  useEffect(() => { let ativo = true; const carregar = async () => { try { const r = await operarLembrete('listarCuidados'); if (ativo) setCuidados(r.cuidados); } catch (e) { if (ativo) setErroConsulta(e.message); } }; carregar(); const timer = setInterval(carregar, 30000); return () => { ativo = false; clearInterval(timer); }; }, [atualizacao]);
  useEffect(() => { const timer = setInterval(() => setAgora(Date.now()), 30000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (!admin) return;
    return onSnapshot(collection(db, 'users'), snap => setPessoas(snap.docs.map(d => ({ ...d.data(), id: d.id })).filter(p => p.ativo !== false && ((p.role === 'funcionario' && p.babaCuidadora === true) || (p.role === 'admin' && p.lembretesHabilitados === true)))), () => setErro('Não foi possível carregar as pessoas habilitadas.'));
  }, [admin]);
  useEffect(() => () => { if (arquivo) URL.revokeObjectURL(arquivo.url); }, [arquivo]);
  useEffect(() => { setArquivo(null); setCuidadoPdf('todos'); }, [alvo]);
  useEffect(() => {
    if (!cuidadoIdAtual && !alvo) return;
    let ativo = true, consultando = false;
    async function carregar() {
      if (consultando) return;
      consultando = true;
      try { const r = await operarLembrete('listar', cuidadoIdAtual ? { visao: 'cuidados', cuidadoId: cuidadoIdAtual } : cuidadoAtual === 'todos' || admin && !selecionada ? { visao: 'cuidados' } : { usuarioId: alvo }); if (ativo) { setLembretes(r.lembretes); setErroConsulta(''); } }
      catch (e) { if (ativo) setErroConsulta(e.message); }
      finally { consultando = false; if (ativo) setCarregando(false); }
    }
    const aoVoltar = () => { if (!document.hidden) carregar(); };
    carregar(); const timer = setInterval(carregar, 30000); document.addEventListener('visibilitychange', aoVoltar);
    return () => { ativo = false; clearInterval(timer); document.removeEventListener('visibilitychange', aoVoltar); };
  }, [alvo, cuidadoIdAtual, cuidadoAtual, atualizacao, admin, selecionada]);
  async function executar(operacao, dados, mensagem) {
    if (ocupado) return;
    setOcupado(true); setErro(''); setAviso('');
    try { const resultado = await operarLembrete(operacao, dados); if (operacao === 'concluir') setLembretes(antes => antes.map(l => l.id === dados.id ? { ...l, ocorrencias: [...(l.ocorrencias || []).filter(o => o.id !== dados.ocorrenciaId), { id: dados.ocorrenciaId, status: 'concluido' }] } : l)); if (operacao === 'salvarCuidado') { setCuidadoSelecionado(resultado.id); setEdicaoCuidado(null); }  setArquivo(null); setAviso(mensagem); setAtualizacao(n => n + 1); if (operacao === 'salvar') { setEdicao(null); setSelecionada(''); setCuidadoSelecionado('todos'); setFiltroCuidado('todos'); } }
    catch (e) { setErro(e.message); }
    finally { setOcupado(false); }
  }
  async function gerarRelatorio() {
    setGerandoPdf(true); setErro(''); setArquivo(null);
    try {
      const dados = await operarLembrete('listar', { visao: 'cuidados', ...(cuidadoPdf !== 'todos' && !cuidadoPdf.includes('|') ? { cuidadoId: cuidadoPdf } : {}) });
      const { gerarPdfLembretes } = await import('../utils/exportarPdfLembretes');
      const pdf = await gerarPdfLembretes({ responsavel: pessoasConsulta.find(p => p.id === alvo)?.nome || user.nome, lembretes: dados.lembretes.filter(l => cuidadoPdf === 'todos' || l.cuidadoId === cuidadoPdf || !l.cuidadoId && `${l.destinatarioCuidado}|${l.nomeCuidado}` === cuidadoPdf) });
      setArquivo({ ...pdf, file: new File([pdf.blob], pdf.nomeArquivo, { type: 'application/pdf' }), url: URL.createObjectURL(pdf.blob) });
    } catch (e) { setErro(e.message); } finally { setGerandoPdf(false); }
  }
  const lista = lembretes.filter(l => (cuidadoAtual === 'todos' || cadastroAtual ? !cadastroAtual || l.cuidadoId === cadastroAtual.id : !l.cuidadoId) && (!selecionada || l.usuarioId === selecionada || l.destinatarios === 'todos')).filter(l => filtroCuidado === 'todos' || (['cao','gato'].includes(l.destinatarioCuidado) ? filtroCuidado === 'pets' : filtroCuidado === 'pessoas')).sort((a, b) => (a.proximoDisparoEmMs || Infinity) - (b.proximoDisparoEmMs || Infinity) || a.horario.localeCompare(b.horario));
  const [atual, seguinte] = acoesPendentesDoDia(lista, agora);
  const cuidadosPdf = [...new Map([...cuidados.map(c => [c.id, `${CUIDADOS[c.tipo]} · ${c.nome}`]), ...lista.filter(l => l.ativo).map(l => [l.cuidadoId || `${l.destinatarioCuidado}|${l.nomeCuidado}`, `${CUIDADOS[l.destinatarioCuidado] || 'Pessoa ou pet'}${l.nomeCuidado ? ` · ${l.nomeCuidado}` : ' · Nome não informado'}`])]).entries()];
  return <div className="page-bg"><main className="page-shell lembretes-shell">
    <PageHeader title="Lembretes" subtitle={'Cuidados do dia · ' + (user.nome || user.email)} />
    <LembreteNotificacao user={user} aoConcluir={()=>setAtualizacao(n=>n+1)} />
    <PratosDia user={user} />
    <Segmented label="Filtrar cuidados" value={filtroCuidado} onChange={setFiltroCuidado} options={[["todos","Todos"],["pessoas","Pessoas"],["pets","Pets"]]} />

    {(erro || erroConsulta) && <p role="alert" className="mensagem erro">{erro || erroConsulta}</p>}{aviso && <p role="status" className="mensagem">{aviso}</p>}
    <details className="card"><summary>Responsáveis e configurações</summary><label className="field"><span>Conta conectada</span><select value={user.uid} disabled><option value={user.uid}>{user.nome || user.email}</option></select></label>
    <section><label className="field"><span>Pessoa ou pet</span><select value={cuidadoAtual} onChange={e => { setCuidadoSelecionado(e.target.value); setEdicao(null); setLembretes([]); setCarregando(true); }}><option value="todos">Todos os cuidados autorizados</option><option value="anteriores">Lembretes anteriores por usuário</option>{cuidados.map(c => <option key={c.id} value={c.id}>{c.nome} · {CUIDADOS[c.tipo]}</option>)}</select></label>{cadastroAtual && <p className="text-muted">Avisos para: {cadastroAtual.destinatarios === 'todos' ? 'Todos os usuários habilitados' : cadastroAtual.usuarioNome}</p>}{admin && <div className="lembrete-acoes"><button className="btn btn-secondary" onClick={() => setEdicaoCuidado({})}>+ Cadastrar pessoa ou pet</button>{cadastroAtual && <><button className="btn btn-secondary" onClick={() => setEdicaoCuidado(cadastroAtual)}>Editar cadastro e responsável</button><button className="btn btn-success" onClick={() => setEdicao({})}>+ Novo lembrete</button></>}</div>}</section>
    {admin && edicaoCuidado && <FormCuidado key={edicaoCuidado.id || 'novo'} cuidado={edicaoCuidado} pessoas={pessoas} ocupado={ocupado} cancelar={() => setEdicaoCuidado(null)} salvar={dados => executar('salvarCuidado', dados, 'Cadastro salvo.')} />}
    {admin && !cadastroAtual && <section className="card"><label className="field"><span>Filtrar lembretes anteriores</span><select value={selecionada} onChange={e => { setSelecionada(e.target.value); setEdicao(null); setLembretes([]); setCarregando(true); }}><option value="">Todos os usuários autorizados</option>{pessoasConsulta.map(p => <option key={p.id} value={p.id}>{p.nome || p.email}{p.id === user.uid ? ' · Você' : p.role === 'admin' ? ' · Administrador' : ' · Funcionária'}</option>)}</select></label>{!pessoas.length && <p>No Escritório, abra “Editar acesso” e habilite os lembretes do administrador ou a opção “Babá/Cuidadora” da funcionária.</p>}{alvo && <button className="btn btn-success" disabled={ocupado} onClick={() => setEdicao({})}>+ Novo lembrete</button>}</section>}
    <div className="lembrete-acoes"><button className="btn btn-secondary" disabled={testandoAviso} onClick={async () => { setTestandoAviso(true); setErro(''); setAviso(''); try { await registrarPush(user.uid); await testarPush(); setAviso('Aviso de teste enviado para este celular.'); } catch (e) { setErro(e.message); } finally { setTestandoAviso(false); } }}>{testandoAviso ? 'Testando…' : 'Testar aviso neste celular'}</button></div>
    </details>
    {admin && edicao && <FormLembrete key={edicao.id || `novo-${alvo}`} lembrete={edicao.id ? edicao : null} cuidados={cuidados} pessoas={pessoas} cuidadoInicial={cadastroAtual?.id} ocupado={ocupado} cancelar={() => setEdicao(null)} salvar={dados => executar('salvar', { ...dados, ...(edicao.id ? { id: edicao.id, versao: edicao.versao } : {}) }, 'Lembrete salvo.')} />}
    {(alvo || cadastroAtual) && carregando && <p role="status">Carregando lembretes…</p>}
    {(alvo || cadastroAtual) && !carregando && !lista.length && <p className="card">Nenhum lembrete encontrado neste filtro.</p>}
    {!carregando && !erroConsulta && lista.length > 0 && <section aria-label="Ação do dia" aria-live="polite">
      {atual ? <article className="card lembrete-card lembrete-atual" key={atual.id + atual.lembrete.id}>
        <header><span aria-hidden="true">{<Icon name="bell" />}</span><div><small>{atual.liberada ? 'Ação pendente' : 'Próxima ação de hoje'}</small><h2>{atual.hora} · {atual.lembrete.tipo === 'remedio' ? atual.lembrete.medicamento : atual.lembrete.titulo}</h2></div></header>
        <p><strong>{atual.lembrete.nomeCuidado || CUIDADOS[atual.lembrete.destinatarioCuidado] || 'Cuidado'}</strong></p>
        {atual.lembrete.tipo === 'remedio' && <div className="lembrete-remedio"><p><b>Posologia:</b> {atual.lembrete.posologia}</p></div>}
        <p className="text-muted">{atual.lembrete.responsavelDescricao} · Criado por {atual.lembrete.criadaPorNome}{atual.lembrete.criadaEmMs ? ` · ${new Date(atual.lembrete.criadaEmMs).toLocaleDateString('pt-BR')}` : ''}</p>
        {atual.lembrete.observacao && <p>{atual.lembrete.observacao}</p>}
        <button className="btn btn-success" disabled={ocupado || !atual.liberada} onClick={() => executar('concluir', { id: atual.lembrete.id, ocorrenciaId: atual.id }, 'Cuidado concluído.')}>{ocupado ? 'Confirmando…' : atual.liberada ? `Concluir como ${user.nome || user.email}` : `Disponível às ${atual.hora}`}</button>
        <p className="text-muted lembrete-seguinte">{seguinte ? `Depois: ${seguinte.hora} · ${seguinte.lembrete.tipo === 'remedio' ? seguinte.lembrete.medicamento : seguinte.lembrete.titulo}` : 'Nenhuma outra ação prevista para hoje.'}</p>
      </article> : <p className="card lembrete-concluido">Nenhuma ação pendente para hoje.</p>}
    </section>}
    {admin && lista.length > 0 && <details className="card"><summary>Gerenciar lembretes cadastrados ({lista.length})</summary>{lista.map(l => <article className="lembrete-card lembrete-gerenciar" key={l.id}><h2>{l.nomeCuidado ? l.nomeCuidado + ' · ' : ''}{l.titulo}</h2><p className="text-muted">{l.responsavelDescricao} · Criado por {l.criadaPorNome}{l.criadaEmMs ? ` · ${new Date(l.criadaEmMs).toLocaleDateString('pt-BR')}` : ''}</p><p>{(l.horarios || [l.horario]).join(' · ')} · {l.ativo ? 'Ativo' : 'Pausado'}</p><div className="lembrete-acoes"><button className="btn btn-secondary" disabled={ocupado} onClick={() => setEdicao(l)}>Editar</button><button className="btn btn-secondary" disabled={ocupado} onClick={() => executar('pausar', { id: l.id, versao: l.versao, ativo: !l.ativo }, l.ativo ? 'Lembrete pausado.' : 'Lembrete reativado.')}>{l.ativo ? 'Pausar' : 'Reativar'}</button><button className="compras-link" disabled={ocupado} onClick={() => { if (window.confirm(`Excluir o lembrete “${l.titulo}”?`)) executar('excluir', { id: l.id, versao: l.versao }, 'Lembrete excluído.'); }}>Excluir</button></div></article>)}</details>}
    {admin && <button className="btn btn-primary" onClick={() => setEdicao({})}>+ Novo lembrete</button>}
    {(alvo || cuidados.length > 0) && <details className="card"><summary>Escala de remédios e cuidados · PDF</summary><label className="field"><span>Pessoa ou pet no PDF</span><select value={cuidadoPdf} onChange={e => { setCuidadoPdf(e.target.value); setArquivo(null); }}><option value="todos">Todos, separados por pessoa ou pet</option>{cuidadosPdf.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}</select></label><button className="btn btn-secondary" disabled={gerandoPdf} onClick={gerarRelatorio}>{gerandoPdf ? 'Gerando PDF…' : 'Gerar PDF da escala'}</button>{arquivo && <div className="lembrete-acoes"><a className="btn btn-secondary" href={arquivo.url} download={arquivo.nomeArquivo}>Baixar PDF</a><a className="btn btn-secondary" href={arquivo.url} target="_blank" rel="noopener noreferrer">Abrir / Imprimir</a><button className="btn btn-success" onClick={async () => { try { if (!await compartilharPdfNativo(arquivo.file)) setErro('Baixe o PDF e anexe ao WhatsApp.'); } catch (e) { if (e.name !== 'AbortError') setErro(e.message); } }}>Compartilhar PDF</button></div>}</details>}
  </main><BottomNav user={user} activePath="/lembretes" onNavigate={onNavigate} /></div>;
}



export default function Lembretes({user,onNavigate}) {
  if(user.role === 'funcionario' && user.babaCuidadora !== true) return <div className="page-bg"><main className="page-shell"><PageHeader title="Lembretes" subtitle="Prato do dia e receitas" /><PratosDia user={user} /></main><BottomNav user={user} activePath="/lembretes" onNavigate={onNavigate} /></div>;
  return <LembretesCuidados user={user} onNavigate={onNavigate} />;
}
