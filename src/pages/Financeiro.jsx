import { collection, doc } from '../services/dadosGrupo';
import { calcularFolha, transportesDaCompetencia, calcularEspecial } from '../../functions/folha-calculos.mjs';
import CalculoPagamentoEspecial from '../components/CalculoPagamentoEspecial';
import { especialInicial } from '../utils/pagamentoEspecial';
import { PageHeader, Badge, Steps, FinancialSummary } from '../components/ui';
import { salvarFolhaPagamento } from '../services/folhaPagamento';
import { useEffect, useMemo, useState } from "react";
import { addDoc, deleteDoc, onSnapshot, serverTimestamp, getDoc, updateDoc } from 'firebase/firestore';
import { criarLancamentoFinanceiro, excluirLancamentoFinanceiro, observarLancamentosFinanceiros } from "../services/financeiro";
import { calcularBancoHorasMes } from "../services/ponto";
import { db } from "../services/firebase";
import BottomNav from "../components/BottomNav";
import { normalizeRole, ROLE_ADMIN } from "../utils/roles";
import { agruparComprovantes, nomeMesComprovante, urlComprovante, destinosCompartilhamento, compartilharPdfNativo } from "../utils/comprovantes";
import "../styles/admin.css";
import "../styles/nav.css";

const TIPOS = { transporte: "Transporte", salario: "Salário", vale: "Vale / adiantamento", decimo_terceiro: "13º salário", ferias: "Férias", rescisao: "Rescisão" };
const hoje = () => new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10);
const mesAtual = () => hoje().slice(0, 7);
const moeda = (valor) => Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const numero = (valor) => Number(String(valor || 0).replace(",", ".")) || 0;
const dataBr = (valor) => String(valor || "").split("-").reverse().join("/");
const pagamentoInicial = () => ({ tipo: "salario", valor: "", descontos: "", dataPagamento: hoje(), competenciaMes: mesAtual(), periodoInicio: hoje(), periodoFim: hoje(), descricao: "", chaveOperacao: crypto.randomUUID() });
const folhaInicial = () => ({ competencia: mesAtual(), salarioBase: "", bonus: "", horasExtras: "", adicionais: "", horasDevidas: "", divisorHoras: "220", descontarHoras: true, bonusBaseDesconto: false, bonusSemIncidenciaInss: true, faltas: "", inss: "", inssAutomatico: true, baseInssManual: false, baseInssInformada: "", cobrarValeTransporte: false, proporcaoVt: 100, adiantamentos: "", outrosDescontos: "", observacao: "" });
const cadastroInicial = () => ({ nome: "", telefone: "", email: "", cpf: "", ctps: "", rg: "", dataNascimento: "", cargo: "", dataAdmissao: "", salarioBase: "", endereco: "", cidade: "", estado: "", cep: "", contatoEmergencia: "", telefoneEmergencia: "", fotoUrl: "", esocialUrl: "", filialId: "", observacoes: "", desconsiderarIntervalo: false, intervaloPrevistoMin: "60" });
const filialInicial = () => ({ nome: "", cnpj: "", telefone: "", endereco: "", cidade: "", estado: "", cep: "" });

export default function Financeiro({ user, onNavigate, rotaAtual }) {
  const admin = normalizeRole(user?.role) === ROLE_ADMIN;
  const [etapaFolha, setEtapaFolha] = useState(0);
  const [aba, setAba] = useState("folha");
  const [funcionarios, setFuncionarios] = useState([]);
  const [funcionarioId, setFuncionarioId] = useState("");
  const [filiais, setFiliais] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [folhas, setFolhas] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [folha, setFolha] = useState(folhaInicial);
  const [competenciaFolha, setCompetenciaFolha] = useState(mesAtual);
  const [estadoFolha, setEstadoFolha] = useState({ status: 'nova', versao: 0 });
  const [carregandoFolha, setCarregandoFolha] = useState(true), [alterada, setAlterada] = useState(false), [recarregarFolha, setRecarregarFolha] = useState(0), [avisoFolha, setAvisoFolha] = useState('');
  const folhaBloqueada = !['nova', 'em_andamento'].includes(estadoFolha.status);
  const [pagamento, setPagamento] = useState(pagamentoInicial);
  const [especial, setEspecial] = useState(() => especialInicial());
  const [conferido, setConferido] = useState(false);
  const [financeiroCarregado, setFinanceiroCarregado] = useState(false);
  const [cadastro, setCadastro] = useState(cadastroInicial);
  const [filial, setFilial] = useState(filialInicial);
  const [documento, setDocumento] = useState({ titulo: "", tipo: "contrato", url: "", mesReferencia: mesAtual() });
  const [compartilhamento, setCompartilhamento] = useState(null);
  const [recibo, setRecibo] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const funcionario = useMemo(() => funcionarios.find((item) => item.id === funcionarioId), [funcionarios, funcionarioId]);
  const transporteAtual = useMemo(() => transportesDaCompetencia(lancamentos, funcionarioId, competenciaFolha), [lancamentos, funcionarioId, competenciaFolha]);
  const totais = useMemo(() => folhaBloqueada && folha.calculoVersao === 2 ? { ...folha, erroCalculo: '' } : calcularFolha(folha, folhaBloqueada ? { total: folha.valeTransportePago || 0, itens: folha.transportes || [] } : transporteAtual), [folha, folhaBloqueada, transporteAtual]);
  const pagamentoEspecial = ['decimo_terceiro','ferias','rescisao'].includes(pagamento.tipo);
  let calculoEspecial = null, erroEspecial = '';
  if (pagamentoEspecial) { try { calculoEspecial = calcularEspecial(pagamento.tipo, { ...especial, competencia: pagamento.competenciaMes }); } catch(e) { erroEspecial = e.message; } }
  function editarEspecial(dados) { setEspecial(dados); setConferido(false); }
  useEffect(() => {
    if (!alterada) return;
    const alertar = e => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', alertar);
    return () => window.removeEventListener('beforeunload', alertar);
  }, [alterada]);
  const recibos = lancamentos.filter((item) => !funcionarioId || item.funcionarioId === funcionarioId);

  useEffect(() => () => { if (recibo?.url) URL.revokeObjectURL(recibo.url); }, [recibo]);
  useEffect(() => {
  if (!admin) return undefined;
    const sairFuncionarios = onSnapshot(collection(db, "funcionarios"), (snap) => {
      const lista = snap.docs.map((item) => ({ id: item.id, ...item.data() })).filter((item) => item.ativo !== false).sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || "")));
      setFuncionarios(lista);
      const solicitado = sessionStorage.getItem("funcionarioCadastroSelecionado");
      if (solicitado && lista.some((item) => item.id === solicitado)) {
        setFuncionarioId(solicitado);
        setAba("cadastro");
        sessionStorage.removeItem("funcionarioCadastroSelecionado");
      } else {
        setFuncionarioId((atual) => atual && lista.some((item) => item.id === atual) ? atual : (lista[0]?.id || ""));
      }
    }, () => setErro("Não foi possível carregar os funcionários."));
    const sairFiliais = onSnapshot(collection(db, "filiais"), (snap) => setFiliais(snap.docs.map((item) => ({ id: item.id, ...item.data() })).sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || "")))));
    const sairFinanceiro = observarLancamentosFinanceiros(itens => { setLancamentos(itens); setFinanceiroCarregado(true); }, () => { setFinanceiroCarregado(false); setErro("Não foi possível carregar pagamentos. Confira o transporte antes de fechar."); });
    const sairFolhas = onSnapshot(collection(db, "folhasPagamento"), (snap) => setFolhas(snap.docs.map((item) => ({ id: item.id, ...item.data() })).sort((a, b) => String(b.competencia).localeCompare(String(a.competencia)))));
    const sairDocumentos = onSnapshot(collection(db, "documentosTrabalhistas"), (snap) => setDocumentos(snap.docs.map((item) => ({ id: item.id, ...item.data() }))));
    return () => { sairFuncionarios(); sairFiliais(); sairFinanceiro(); sairFolhas(); sairDocumentos(); };
  }, [admin]);
  useEffect(() => {
    if (!funcionario) return;
    setEspecial(especialInicial(funcionario)); setConferido(false);
    setCadastro({ ...cadastroInicial(), ...funcionario, salarioBase: funcionario.salarioBase || "", intervaloPrevistoMin: funcionario.intervaloPrevistoMin ?? "60" });

    setPagamento((atual) => ({ ...atual, valor: atual.valor || funcionario.salarioBase || "" }));
  }, [funcionario]);
  useEffect(() => {
    if (!admin || !funcionarioId) return;
    let ativo = true;
    setCarregandoFolha(true); setAvisoFolha(''); setAlterada(false);
    setFolha({ ...folhaInicial(), competencia: competenciaFolha });
    (async () => {
      try {
        const registro = await getDoc(doc(db, 'folhasPagamento', funcionarioId + '_' + competenciaFolha));
        if (registro.exists()) {
          if (ativo) { const f = registro.data(); setFolha({ ...folhaInicial(), ...f, bonusSemIncidenciaInss: f.bonusSemIncidenciaInss ?? (f.status === 'em_andamento'), inssAutomatico: f.inssAutomatico === true }); setEstadoFolha({ status: f.status, versao: f.versao || 0 }); }
        } else {
          const empregado = (await getDoc(doc(db, 'funcionarios', funcionarioId))).data();
          const anterior = new Date(competenciaFolha + '-01T12:00:00Z'); anterior.setUTCMonth(anterior.getUTCMonth() - 1);
          const saldo = await calcularBancoHorasMes(funcionarioId, anterior.toISOString().slice(0, 7), empregado?.bancoHorasInicio || '');
          if (ativo) { setFolha({ ...folhaInicial(), competencia: competenciaFolha, salarioBase: empregado?.salarioBase || '', horasDevidas: saldo < 0 ? String(Math.abs(saldo) / 60) : '' }); setEstadoFolha({ status: 'nova', versao: 0 }); }
        }
      } catch { if (ativo) { setErro('Não foi possível abrir a folha. Tente novamente.'); setEstadoFolha({ status: 'erro', versao: 0 }); } }
      finally { if (ativo) setCarregandoFolha(false); }
    })();
    return () => { ativo = false; };
  }, [admin, funcionarioId, competenciaFolha, recarregarFolha]);

  function editarFolha(campos) { setFolha(antes => ({ ...antes, ...campos })); setAlterada(true); setAvisoFolha(''); }
  function abrirCompetencia(valor) {
    if (alterada && !window.confirm('Há alterações não salvas. Deseja sair sem salvar?')) return;
    setEtapaFolha(0); setCarregandoFolha(true); setCompetenciaFolha(valor); setRecarregarFolha(n => n + 1);
  }
  async function guardarFolha(fechar = false) {
    if (ocupado || carregandoFolha || folhaBloqueada) return;
    if (!financeiroCarregado || totais.erroCalculo) { setErro(totais.erroCalculo || 'Aguarde o carregamento dos pagamentos de transporte.'); return; }
    if (fechar && !window.confirm('Finalizar e fechar esta folha? Após confirmar, os valores não poderão ser editados. O pagamento será registrado separadamente.')) return;
    setOcupado(true); setErro(''); setAvisoFolha('');
    try {
      const resultado = await salvarFolhaPagamento({ folha, totais, funcionarioId, funcionarioNome: funcionario?.nome || '', uid: user.uid, versao: estadoFolha.versao, fechar });
      setEstadoFolha(resultado); setFolha(antes => ({ ...antes, ...resultado.totais, calculoVersao: 2 })); if (fechar) setEtapaFolha(3); setAlterada(false); setAvisoFolha(fechar ? 'Folha finalizada e fechada. Pronta para pagamento.' : 'Folha salva em andamento. Você pode continuar depois.');
    } catch (e) { setErro(e.message || 'Não foi possível salvar a folha.'); }
    finally { setOcupado(false); }
  }

  async function executar(acao, mensagem) {
    if (ocupado) return;
    setOcupado(true); setErro("");
    try { await acao(); } catch (error) { console.error(error); setErro(error.code?.startsWith("functions/") && error.code !== "functions/internal" ? error.message : mensagem); } finally { setOcupado(false); }
  }
  function pagarFolha(item) {
    if (item.status !== "pronta_pagamento") return;
    executar(async () => {
      await criarLancamentoFinanceiro({ ...item, folhaId: item.id, tipo: "salario", valor: numero(item.proventos), descontos: numero(item.descontos), dataPagamento: hoje(), competenciaMes: item.competencia, descricao: "Pagamento da folha fechada", funcionarioId: item.funcionarioId, funcionarioNome: item.funcionarioNome });
      if (item.competencia === competenciaFolha) setEstadoFolha(antes => ({ ...antes, status: "paga" }));

    }, "Não foi possível registrar o pagamento.");
  }
  function salvarPagamento(event) {
    event.preventDefault();
    executar(async () => {
      if (!pagamentoEspecial && numero(pagamento.valor) <= 0) throw new Error("valor");
      if (pagamentoEspecial && (!calculoEspecial || !conferido)) throw new Error("Confira o cálculo antes de pagar.");
      await criarLancamentoFinanceiro({ ...pagamento, ...(pagamentoEspecial ? { calculoEspecial: { ...especial, competencia: pagamento.competenciaMes }, conferido, chaveOperacao: pagamento.chaveOperacao } : {}), valor: numero(pagamento.valor), descontos: numero(pagamento.descontos), funcionarioId, funcionarioNome: funcionario?.nome || "" });
      setPagamento(pagamentoInicial()); setConferido(false);
    }, "Revise os dados do pagamento.");
  }
  function salvarCadastro(event) {
    event.preventDefault();
    executar(async () => {
      if (!funcionarioId) throw new Error("funcionario");
      await updateDoc(doc(db, "funcionarios", funcionarioId), { ...cadastro, salarioBase: numero(cadastro.salarioBase), intervaloPrevistoMin: numero(cadastro.intervaloPrevistoMin), atualizadoEm: serverTimestamp() });
    }, "Não foi possível salvar o cadastro.");
  }
  function novoFuncionario() {
    if (alterada && !window.confirm("Há alterações não salvas. Deseja continuar sem salvar?")) return;
    executar(async () => {
      const novo = await addDoc(collection(db, "funcionarios"), { ...cadastroInicial(), ativo: true, criadoEm: serverTimestamp(), criadoPor: user.uid });
      setFuncionarioId(novo.id); setCadastro(cadastroInicial()); setAba("cadastro");
    }, "Não foi possível cadastrar o funcionário.");
  }
  function salvarFilial(event) {
    event.preventDefault();
    executar(async () => {
      await addDoc(collection(db, "filiais"), { ...filial, criadoEm: serverTimestamp(), criadoPor: user.uid });
      setFilial(filialInicial());
    }, "Não foi possível cadastrar a filial.");
  }
  function salvarDocumento(event) {
    event.preventDefault();
    executar(async () => {
      const url = urlComprovante(documento.url);
      if (!url || !funcionarioId || !documento.titulo.trim() || !/^\d{4}-(0[1-9]|1[0-2])$/.test(documento.mesReferencia)) throw new Error("dados");
      await addDoc(collection(db, "documentosTrabalhistas"), { ...documento, titulo: documento.titulo.trim(), url, funcionarioId, funcionarioNome: funcionario?.nome || "", criadoEm: serverTimestamp(), criadoPor: user.uid });
      setDocumento({ titulo: "", tipo: "contrato", url: "", mesReferencia: mesAtual() });
    }, "Informe o funcionário, o mês, um título e um link válido.");
  }
  function abrirRecibo(item, compartilhar = false) {
    executar(async () => {
      const { gerarReciboFinanceiro } = await import("../utils/exportarReciboFinanceiro");
      const folhaRelacionada = item.tipo === "salario" ? folhas.find((folhaItem) => folhaItem.id === item.folhaId || (folhaItem.funcionarioId === item.funcionarioId && folhaItem.competencia === item.competenciaMes)) : null;
      const funcionarioRelacionado = funcionarios.find((funcionarioItem) => funcionarioItem.id === item.funcionarioId);
      const arquivo = await gerarReciboFinanceiro({ ...folhaRelacionada, ...item, cargo: item.cargo || funcionarioRelacionado?.cargo, cpf: item.cpf || funcionarioRelacionado?.cpf });
      setRecibo({ ...arquivo, compartilhar, arquivo: typeof File !== "undefined" ? new File([arquivo.blob], arquivo.nomeArquivo, { type: "application/pdf" }) : null, url: URL.createObjectURL(arquivo.blob) });
    }, "Não foi possível abrir o recibo.");
  }

  async function compartilharLink(item) {
    setErro("");
    const url = urlComprovante(item.url);
    if (!url) return setErro("O comprovante não possui um link válido.");
    if (!navigator.share) return setCompartilhamento({ titulo: item.titulo, ...destinosCompartilhamento(item.titulo, url) });
    try { await navigator.share({ title: item.titulo, url }); }
    catch (error) {
      if (error.name === "AbortError") return;
      setCompartilhamento({ titulo: item.titulo, ...destinosCompartilhamento(item.titulo, url) });
    }
  }

  async function compartilharPdf() {
    setErro("");
    try {
      if (!await compartilharPdfNativo(recibo?.arquivo)) setErro("Neste navegador, baixe o PDF e anexe ao WhatsApp ou email.");
    }
    catch (error) { if (error.name !== "AbortError") setErro("Não foi possível compartilhar. Baixe o PDF e anexe ao WhatsApp ou email."); }
  }

  function apagarComprovante(item, categoria) {
    if (!window.confirm(categoria === "recibo" ? "Apagar este recibo? O lançamento financeiro também será removido." : "Apagar este comprovante?")) return;
    executar(() => categoria === "recibo" ? excluirLancamentoFinanceiro(item.id) : deleteDoc(doc(db, "documentosTrabalhistas", item.id)), "Não foi possível apagar o comprovante.");
  }

    function campoFolha(campo, label) { return <label className="field" key={campo}><span>{label}</span><input type="number" inputMode="decimal" step="0.01" min="0" value={folha[campo]} onChange={e => editarFolha({ [campo]: e.target.value })} /></label>; }
  const statusFolhaLabel = estadoFolha.status === 'em_andamento' ? 'Em preparação' : estadoFolha.status === 'paga' ? 'Paga' : estadoFolha.status === 'pronta_pagamento' ? 'Fechada · pronta para pagamento' : estadoFolha.status === 'erro' ? 'Falha ao abrir' : 'Não iniciada';
  if (!admin) return <div className="page-bg admin-bg"><main className="page-shell admin-shell"><p>Acesso restrito ao administrador.</p></main><BottomNav activePath={rotaAtual} onNavigate={onNavigate} user={user} /></div>;
  const folhasDaEmpregada = folhas.filter((item) => item.funcionarioId === funcionarioId);
  const docsDaEmpregada = documentos.filter((item) => item.funcionarioId === funcionarioId);
  const comprovantesPorMes = agruparComprovantes(recibos, docsDaEmpregada);
  return <div className="page-bg admin-bg"><main className="page-shell admin-shell escritorio-shell">
    <PageHeader title="Escritório contábil" subtitle="Folha, pagamentos e comprovantes" back={() => onNavigate("/admin")} />
    <div className="card escritorio-toolbar"><label className="field"><span>Funcionário</span><select value={funcionarioId} disabled={ocupado} onChange={(e) => { if (alterada && !window.confirm("Há alterações não salvas. Deseja trocar de funcionária sem salvar?")) return; setCarregandoFolha(true); setFuncionarioId(e.target.value); }}><option value="">Selecione</option>{funcionarios.map((item) => <option key={item.id} value={item.id}>{item.nome || "Funcionário sem nome"}{item.filialId ? ` · ${filiais.find((f) => f.id === item.filialId)?.nome || "Filial"}` : ""}</option>)}</select></label><button type="button" className="btn btn-secondary" onClick={novoFuncionario} disabled={ocupado}>Novo funcionário</button><a className="btn btn-secondary" href={cadastro.esocialUrl || "https://login.esocial.gov.br/login.aspx"} target="_blank" rel="noreferrer">Abrir eSocial</a></div>
    <nav className="escritorio-tabs">{[["folha","Folha"],["pagamentos","Avulsos"],["cadastro","Cadastro"],["filiais","Filiais"],["comprovantes","Comprovantes"]].map(([id,label]) => <button key={id} type="button" className={aba === id ? "active" : ""} onClick={() => setAba(id)}>{label}</button>)}</nav>
    {erro && <p role="alert" className="mensagem erro">{erro}</p>}

    {aba === 'folha' && <section className="admin-section">
      <label className="field"><span>Competência</span><input type="month" value={competenciaFolha} disabled={ocupado} onChange={e => { if (e.target.value) abrirCompetencia(e.target.value); }} /></label>
      {carregandoFolha && <p role="status">Carregando folha…</p>}
      {avisoFolha && <p className="mensagem" role="status">{avisoFolha}</p>}
      <article className="card"><div className="section-header"><h2>Vale-transporte antecipado</h2><Badge>{totais.valeTransportePago > 0 ? "PAGO" : "Sem antecipações"}</Badge></div><strong>{moeda(totais.valeTransportePago)}</strong><p className="text-muted">{folhaBloqueada ? 'Valor preservado no fechamento.' : 'Atualizado pelos pagamentos desta competência.'} Não será pago novamente com o salário.</p>{!financeiroCarregado && !folhaBloqueada && <p role="status">Carregando pagamentos…</p>}</article>
      {etapaFolha === 0 && <article className="card"><div className="section-header"><h2>Folha {dataBr(competenciaFolha)}</h2><Badge tone={estadoFolha.status === 'em_andamento' || estadoFolha.status === 'nova' ? 'warning' : 'success'}>{statusFolhaLabel}</Badge></div><FinancialSummary totais={totais} moeda={moeda} /><button className="btn btn-primary" disabled={carregandoFolha || !funcionarioId || estadoFolha.status === 'erro'} onClick={() => setEtapaFolha(folhaBloqueada ? 3 : 1)}>{folhaBloqueada ? 'Ver folha fechada' : estadoFolha.status === 'em_andamento' ? 'Continuar preparação' : 'Preparar folha'}</button></article>}
      {etapaFolha > 0 && <form className="folha-form" onSubmit={e => { e.preventDefault(); if (etapaFolha === 1) setEtapaFolha(2); else if (etapaFolha === 2) guardarFolha(true); }}>
        <div className="section-header"><h2>{etapaFolha === 1 ? 'Preparar folha' : etapaFolha === 2 ? 'Revisar folha' : 'Folha fechada'}</h2><button className="btn btn-secondary" type="button" onClick={() => setEtapaFolha(0)}>Voltar ao resumo</button></div>
        <p className="text-muted">{funcionario?.nome} · {dataBr(competenciaFolha)}</p><Steps step={etapaFolha} />
        {alterada && <p className="text-muted">Alterações ainda não salvas.</p>}
        {etapaFolha === 1 && <fieldset className="folha-editor" disabled={ocupado || carregandoFolha || folhaBloqueada}>
          <div className="folha-valores"><section className="card"><h2>Proventos</h2>{[['salarioBase','Salário base'],['bonus','Bônus'],['horasExtras','Horas extras (R$)'],['adicionais','Outros adicionais']].map(([c,l]) => campoFolha(c,l))}</section><section className="card"><h2>Descontos</h2>{[['faltas','Faltas / atrasos (R$)'],['adiantamentos','Vales / adiantamentos'],['outrosDescontos','Outros descontos']].map(([c,l]) => campoFolha(c,l))}<label className="folha-checkbox"><input type="checkbox" checked={folha.descontarHoras !== false} onChange={e => editarFolha({ descontarHoras: e.target.checked })} /><span>Descontar horas devidas nesta folha</span></label><p className="text-muted">Desconto aplicado: {moeda(totais.descontoHoras)}. Ao desmarcar, as horas continuam registradas no ponto.</p><label className="folha-checkbox"><input type="checkbox" checked={folha.inssAutomatico} onChange={e => editarFolha({ inssAutomatico: e.target.checked, inss: totais.inss })} /><span>Calcular INSS automaticamente</span></label><label className="folha-checkbox"><input type="checkbox" disabled={ocupado || folhaBloqueada} checked={folha.bonusSemIncidenciaInss} onChange={e => editarFolha({ bonusSemIncidenciaInss: e.target.checked })} /><span>Bônus sem incidência de INSS</span></label><p className="text-muted">Use para verba sem incidência conferida no eSocial. O bônus continua no valor a receber.</p>{folha.inssAutomatico ? <p>INSS progressivo: <strong>{moeda(totais.inss)}</strong> · base {moeda(totais.baseInss)}</p> : campoFolha('inss','INSS conferido no eSocial (R$)')}<label className="folha-checkbox"><input type="checkbox" checked={folha.cobrarValeTransporte} onChange={e => editarFolha({ cobrarValeTransporte: e.target.checked })} /><span>Cobrar participação no vale-transporte (até 6%)</span></label><p className="text-muted">Limite calculado pelo salário e proporção: {moeda(totais.limiteValeTransporte)}. O desconto é limitado ao transporte concedido.</p><p>Desconto de VT: <strong>{moeda(totais.descontoValeTransporte)}</strong></p>{totais.erroCalculo && <p role="alert" className="mensagem erro">{totais.erroCalculo}</p>}</section></div>
          <div className="folha-calculo-horas"><span>Horas devidas: <b>{Math.round(numero(folha.horasDevidas) * 60)} min</b></span><span>Desconto calculado: <b>{moeda(totais.descontoHoras)}</b></span></div>
          <details className="card"><summary>Ajustes do cálculo</summary><label className="folha-checkbox"><input type="checkbox" checked={folha.baseInssManual} onChange={e => editarFolha({ baseInssManual: e.target.checked, baseInssInformada: totais.baseInss })} /><span>Informar base de INSS conferida no eSocial</span></label>{folha.baseInssManual && campoFolha("baseInssInformada","Base de INSS (R$)")}{campoFolha("proporcaoVt","Proporção do VT no período (0 a 100%)")}<p className="text-muted">A base automática considera proventos menos o bônus marcado sem incidência, faltas e horas descontadas. Ajuste verbas sem incidência e outros vínculos.</p>{campoFolha('horasDevidas','Horas devidas do mês anterior (horas decimais)')}{campoFolha('divisorHoras','Divisor mensal para valor-hora')}<label className="folha-checkbox"><input type="checkbox" checked={folha.bonusBaseDesconto} onChange={e => editarFolha({ bonusBaseDesconto: e.target.checked })} /><span>Incluir o bônus na base do desconto das horas devidas</span></label><p className="text-muted">33 minutos = 0,55 hora. Valor-hora calculado: {moeda(totais.valorHora)}.</p></details>
          <FinancialSummary totais={totais} moeda={moeda} /><div className="folha-acoes"><button type="button" className="btn btn-secondary" onClick={() => guardarFolha()}>{estadoFolha.status === 'nova' ? 'Iniciar e salvar folha' : 'Salvar alterações'}</button><button className="btn btn-primary">Revisar folha</button></div>
        </fieldset>}
        {etapaFolha >= 2 && <div className="folha-revisao-grade"><section className="card folha-review"><h2>Resumo da folha</h2>{[['Salário base',numero(folha.salarioBase)],['Bônus',numero(folha.bonus)],['Horas extras',numero(folha.horasExtras)],['Outros adicionais',numero(folha.adicionais)],['Horas devidas',-totais.descontoHoras],['Faltas / atrasos',-numero(folha.faltas)],['INSS',-totais.inss],['Participação no vale-transporte',-totais.descontoValeTransporte],['Vales / adiantamentos',-numero(folha.adiantamentos)],['Outros descontos',-numero(folha.outrosDescontos)]].map(([l,v]) => <div className="folha-resumo-linha" key={l}><span>{l}</span><strong>{moeda(v)}</strong></div>)}<div className="folha-resumo-linha"><span>Vale-transporte antecipado · PAGO (informativo)</span><strong>{moeda(totais.valeTransportePago)}</strong></div><FinancialSummary totais={totais} moeda={moeda} label="Valor líquido" /></section><div className="folha-revisao-acoes"><label className="field"><span>Observação (opcional)</span><input maxLength={300} disabled={ocupado || folhaBloqueada} value={folha.observacao} onChange={e => editarFolha({ observacao:e.target.value })} /></label>
          {etapaFolha === 2 && <><p className="text-muted">Ao fechar, a folha ficará pronta para pagamento.</p><div className="folha-acoes"><button type="button" className="btn btn-secondary" disabled={ocupado} onClick={() => setEtapaFolha(1)}>Voltar e editar</button><button type="button" className="btn btn-secondary" disabled={ocupado} onClick={() => guardarFolha()}>{estadoFolha.status === 'nova' ? 'Iniciar e salvar folha' : 'Salvar alterações'}</button><button className="btn btn-primary" disabled={ocupado || estadoFolha.status !== 'em_andamento'}>Fechar folha</button></div>{estadoFolha.status === 'nova' && <p className="text-muted">Salve a folha em andamento antes de confirmar o fechamento.</p>}</>}
          {etapaFolha === 3 && <Badge>{statusFolhaLabel}</Badge>}
        </div></div>}
      </form>}
      <h2>Histórico</h2><div className="financeiro-lista">{folhasDaEmpregada.length === 0 && <p className="text-muted">Nenhuma folha salva para esta funcionária.</p>}{folhasDaEmpregada.map(item => <article className="card financeiro-item" key={item.id}><div><strong>Folha {dataBr(item.competencia)}</strong><span>{item.status === 'em_andamento' ? 'Em preparação' : item.status === 'paga' ? 'Paga' : 'Fechada · pronta para pagamento'} · {moeda(item.liquido)}</span></div><button type="button" className="btn btn-secondary" disabled={ocupado} onClick={() => abrirCompetencia(item.competencia)}>{item.status === 'em_andamento' ? 'Continuar edição' : 'Ver folha'}</button>{item.status === 'pronta_pagamento' && <button type="button" className="btn btn-success" disabled={ocupado} onClick={() => pagarFolha(item)}>Registrar pagamento</button>}</article>)}</div>
    </section>}

    {aba === "pagamentos" && <section className="admin-section"><div className="pagamento-atalhos"><button type="button" className={pagamento.tipo === "transporte" ? "active" : ""} onClick={() => setPagamento({ ...pagamento, tipo: "transporte", valor: "" })}><strong>Transporte semanal</strong><span>Informe o período da semana</span></button><button type="button" className={pagamento.tipo === "vale" ? "active" : ""} onClick={() => setPagamento({ ...pagamento, tipo: "vale", valor: "" })}><strong>Vale / adiantamento</strong><span>Pagamento quando solicitado</span></button><button type="button" className={pagamento.tipo === "salario" ? "active" : ""} onClick={() => setPagamento({ ...pagamento, tipo: "salario", valor: funcionario?.salarioBase || "" })}><strong>Salário avulso</strong><span>Fora do fechamento da folha</span></button></div><form className="card financeiro-form" onSubmit={salvarPagamento}><label className="field"><span>Tipo</span><select value={pagamento.tipo} onChange={(e) => { setPagamento({ ...pagamento, tipo: e.target.value, chaveOperacao: crypto.randomUUID() }); setEspecial(especialInicial(funcionario, pagamento.competenciaMes)); setConferido(false); }}>{Object.entries(TIPOS).map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></label><>{pagamentoEspecial && <CalculoPagamentoEspecial tipo={pagamento.tipo} dados={especial} onChange={editarEspecial} calculo={calculoEspecial} erro={erroEspecial} />}{!pagamentoEspecial && <><label className="field"><span>Valor</span><input type="number" step="0.01" value={pagamento.valor} onChange={(e) => setPagamento({ ...pagamento, valor: e.target.value })} /></label><label className="field"><span>Descontos</span><input type="number" step="0.01" value={pagamento.descontos} onChange={(e) => setPagamento({ ...pagamento, descontos: e.target.value })} /></label></>}</><label className="field"><span>Data do pagamento</span><input type="date" value={pagamento.dataPagamento} onChange={(e) => setPagamento({ ...pagamento, dataPagamento: e.target.value })} /></label>{pagamento.tipo === "transporte" ? <><label className="field"><span>Início da semana</span><input type="date" value={pagamento.periodoInicio} onChange={(e) => setPagamento({ ...pagamento, periodoInicio: e.target.value })} /></label><label className="field"><span>Fim da semana</span><input type="date" value={pagamento.periodoFim} onChange={(e) => setPagamento({ ...pagamento, periodoFim: e.target.value })} /></label></> : null}<label className="field"><span>Mês de referência</span><input type="month" required value={pagamento.competenciaMes} onChange={(e) => { setPagamento({ ...pagamento, competenciaMes: e.target.value }); setConferido(false); }} /></label><label className="field financeiro-descricao"><span>Observação / motivo</span><input value={pagamento.descricao} onChange={(e) => setPagamento({ ...pagamento, descricao: e.target.value })} /></label><>{pagamentoEspecial && <label className="folha-checkbox financeiro-descricao"><input type="checkbox" required checked={conferido} onChange={e => setConferido(e.target.checked)} /><span>Conferi as verbas, períodos e retenções no eSocial e confirmo este pagamento.</span></label>}<button className="btn btn-success" disabled={ocupado || pagamentoEspecial && (!calculoEspecial || !conferido)}>Salvar pagamento e arquivar recibo</button></></form></section>}

    {aba === "cadastro" && <form className="card financeiro-form cadastro-funcionario" onSubmit={salvarCadastro}>
      {cadastro.fotoUrl && <img className="funcionario-foto" src={cadastro.fotoUrl} alt="Foto do funcionário" />}
      {[["nome","Nome","text"],["telefone","Telefone","tel"],["email","E-mail","email"],["cpf","CPF","text"],["ctps","CTPS","text"],["rg","RG","text"],["dataNascimento","Nascimento","date"],["cargo","Cargo","text"],["dataAdmissao","Admissão","date"],["salarioBase","Salário base","number"],["endereco","Endereço","text"],["cidade","Cidade","text"],["estado","Estado","text"],["cep","CEP","text"],["contatoEmergencia","Contato de emergência","text"],["telefoneEmergencia","Telefone de emergência","tel"],["fotoUrl","Link da foto","url"],["esocialUrl","Link eSocial","url"]].map(([campo,label,tipo]) => <label className={campo === "endereco" || campo === "fotoUrl" || campo === "esocialUrl" ? "field financeiro-descricao" : "field"} key={campo}><span>{label}</span><input type={tipo} step={tipo === "number" ? "0.01" : undefined} value={cadastro[campo] ?? ""} onChange={(e) => setCadastro({ ...cadastro, [campo]: e.target.value })} /></label>)}
      <label className="field"><span>Filial</span><select value={cadastro.filialId || ""} onChange={(e) => setCadastro({ ...cadastro, filialId: e.target.value })}><option value="">Sem filial</option>{filiais.map((item) => <option key={item.id} value={item.id}>{item.nome || "Filial sem nome"}</option>)}</select></label>
      <label className="folha-checkbox cadastro-checkbox"><input type="checkbox" checked={Boolean(cadastro.desconsiderarIntervalo)} onChange={(e) => setCadastro({ ...cadastro, desconsiderarIntervalo: e.target.checked })} /><span>Desconsiderar marcações de intervalo</span></label>
      {cadastro.desconsiderarIntervalo && <label className="field"><span>Intervalo previsto (minutos)</span><input type="number" min="0" step="1" value={cadastro.intervaloPrevistoMin ?? "60"} onChange={(e) => setCadastro({ ...cadastro, intervaloPrevistoMin: e.target.value })} /></label>}
      <label className="field financeiro-linha-inteira"><span>Observações</span><textarea value={cadastro.observacoes || ""} onChange={(e) => setCadastro({ ...cadastro, observacoes: e.target.value })} /></label>
      <p className="cadastro-ajuda financeiro-linha-inteira">Todos os campos são opcionais. Quando o intervalo for desconsiderado, o ponto pedirá apenas entrada e saída e descontará o intervalo previsto automaticamente.</p>
      <button className="btn btn-primary" disabled={ocupado || !funcionarioId}>Salvar cadastro</button>
    </form>}

    {aba === "filiais" && <section className="admin-section"><form className="card financeiro-form" onSubmit={salvarFilial}>{[["nome","Nome da filial","text"],["cnpj","CNPJ","text"],["telefone","Telefone","tel"],["endereco","Endereço","text"],["cidade","Cidade","text"],["estado","Estado","text"],["cep","CEP","text"]].map(([campo,label,tipo]) => <label className="field" key={campo}><span>{label}</span><input type={tipo} value={filial[campo]} onChange={(e) => setFilial({ ...filial, [campo]: e.target.value })} /></label>)}<button className="btn btn-primary" disabled={ocupado}>Cadastrar filial</button></form><div className="financeiro-lista">{filiais.map((item) => <article className="card financeiro-item" key={item.id}><div><strong>{item.nome || "Filial sem nome"}</strong><span>{[item.cidade, item.estado, item.cnpj].filter(Boolean).join(" · ") || "Cadastro sem detalhes"}</span></div></article>)}</div></section>}

    {aba === "comprovantes" && <section className="admin-section">
      <details className="card"><summary>Arquivar novo comprovante</summary><form className="financeiro-form" onSubmit={salvarDocumento}>
        <label className="field"><span>Mês do comprovante</span><input type="month" required value={documento.mesReferencia} onChange={(e) => setDocumento({ ...documento, mesReferencia: e.target.value })} /></label>
        <label className="field"><span>Tipo</span><select value={documento.tipo} onChange={(e) => setDocumento({ ...documento, tipo: e.target.value })}><option value="contrato">Contrato</option><option value="esocial">eSocial</option><option value="outro">Outro</option></select></label>
        <label className="field"><span>Título</span><input required value={documento.titulo} onChange={(e) => setDocumento({ ...documento, titulo: e.target.value })} /></label>
        <label className="field financeiro-descricao"><span>Link do arquivo</span><input type="url" required value={documento.url} onChange={(e) => setDocumento({ ...documento, url: e.target.value })} /></label>
        <button className="btn btn-primary" disabled={ocupado || !funcionarioId}>Arquivar comprovante</button>
      </form></details>
      <p className="text-muted">Recibos organizados pelo mês do pagamento. Outros comprovantes pelo mês informado ou, nos antigos, pelo mês do cadastro.</p>
      {!comprovantesPorMes.length && <p className="card text-muted">Nenhum comprovante para este funcionário.</p>}
      {comprovantesPorMes.map((grupo) => <details className="card comprovantes-mes comprovantes-pasta" key={`${funcionarioId}-${grupo.mes}`}>
        <summary className="comprovantes-pasta-capa"><span aria-hidden="true">📁</span><strong>{nomeMesComprovante(grupo.mes)}</strong><span>{grupo.itens.length} documento{grupo.itens.length === 1 ? "" : "s"}</span></summary>
        <div className="financeiro-lista">{grupo.itens.map(({ item, categoria, chave }) => <article className="card financeiro-item" key={chave}>
          <div><strong>{categoria === "recibo" ? `Recibo · ${TIPOS[item.tipo] || item.tipoLabel || item.tipo}` : item.titulo}</strong><span>{categoria === "recibo" ? `${dataBr(item.dataPagamento)} · ${moeda(item.valorLiquido ?? item.valor)}` : item.tipo}</span></div>
          <div className="financeiro-acoes">
            {categoria === "recibo" ? <button type="button" className="btn btn-secondary" disabled={ocupado} onClick={() => abrirRecibo(item)}>Abrir</button> : urlComprovante(item.url) ? <a className="btn btn-secondary" href={urlComprovante(item.url)} target="_blank" rel="noreferrer">Abrir</a> : <button type="button" className="btn btn-secondary" disabled>Link indisponível</button>}
            <button type="button" className="btn btn-secondary" disabled={ocupado} onClick={() => categoria === "recibo" ? abrirRecibo(item, true) : compartilharLink(item)}>Compartilhar</button>
            <button type="button" className="btn btn-danger" disabled={ocupado} onClick={() => apagarComprovante(item, categoria)}>Apagar</button>
          </div>
        </article>)}</div>
      </details>)}
    </section>}

    <footer className="app-footer"><span>Desenvolvido por ACS Informática</span><a href="https://acstech.dev.br/" target="_blank" rel="noreferrer">https://acstech.dev.br/</a></footer>
  </main>
  {recibo && <div className="recibo-modal" role="dialog" aria-modal="true" aria-label="Comprovante em PDF"><div className="recibo-modal-painel">
    <div className="recibo-modal-topo"><strong>{recibo.compartilhar ? "Compartilhar comprovante" : "Recibo arquivado"}</strong><button type="button" aria-label="Fechar comprovante" onClick={() => setRecibo(null)}>×</button></div>
    <iframe src={`${recibo.url}#toolbar=0`} title="Recibo" />
    <p className="comprovante-compartilhar-ajuda">Toque em Compartilhar PDF e escolha WhatsApp ou email no menu do celular. Se o navegador não permitir, baixe o PDF para anexar.</p>
    {erro && <p className="mensagem erro" role="alert">{erro}</p>}
    <div className="recibo-modal-acoes"><button type="button" className="btn btn-success" onClick={compartilharPdf}>Compartilhar PDF</button><a className="btn btn-primary" href={recibo.url} download={recibo.nomeArquivo}>Baixar PDF</a><button type="button" className="btn btn-muted" onClick={() => setRecibo(null)}>Fechar</button></div>
  </div></div>}
  {compartilhamento && <div className="recibo-modal" role="dialog" aria-modal="true" aria-label="Compartilhar comprovante"><div className="card comprovante-compartilhar-painel">
    <div className="recibo-modal-topo"><strong>Compartilhar comprovante</strong><button type="button" aria-label="Fechar compartilhamento" onClick={() => setCompartilhamento(null)}>×</button></div>
    <p>{compartilhamento.titulo}</p><p className="text-muted">Escolha onde enviar o link do comprovante.</p>
    <div className="financeiro-acoes"><a className="btn btn-success" href={compartilhamento.whatsapp} target="_blank" rel="noreferrer">WhatsApp</a><a className="btn btn-secondary" href={compartilhamento.email}>Email</a><button type="button" className="btn btn-muted" onClick={() => setCompartilhamento(null)}>Fechar</button></div>
  </div></div>}
  <BottomNav activePath={rotaAtual} onNavigate={path => { if (!alterada || window.confirm("Há alterações não salvas. Deseja sair sem salvar?")) onNavigate(path); }} user={user} /></div>;
}
