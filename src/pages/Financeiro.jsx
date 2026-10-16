import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { criarLancamentoFinanceiro, excluirLancamentoFinanceiro, observarLancamentosFinanceiros } from "../services/financeiro";
import { calcularBancoHorasMes } from "../services/ponto";
import { db } from "../services/firebase";
import BottomNav from "../components/BottomNav";
import { normalizeRole, ROLE_ADMIN } from "../utils/roles";
import { agruparComprovantes, nomeMesComprovante, urlComprovante, destinosCompartilhamento, compartilharPdfNativo } from "../utils/comprovantes";
import logo from "../assets/ap1303.jpeg";
import "../styles/admin.css";
import "../styles/nav.css";

const TIPOS = { transporte: "Transporte", salario: "Salário", vale: "Vale / adiantamento" };
const hoje = () => new Date().toISOString().slice(0, 10);
const mesAtual = () => hoje().slice(0, 7);
const moeda = (valor) => Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const numero = (valor) => Number(String(valor || 0).replace(",", ".")) || 0;
const dataBr = (valor) => String(valor || "").split("-").reverse().join("/");
const pagamentoInicial = () => ({ tipo: "salario", valor: "", descontos: "", dataPagamento: hoje(), competenciaMes: mesAtual(), periodoInicio: hoje(), periodoFim: hoje(), descricao: "" });
const folhaInicial = () => ({ competencia: mesAtual(), salarioBase: "", bonus: "", horasExtras: "", adicionais: "", horasDevidas: "", divisorHoras: "220", bonusBaseDesconto: false, faltas: "", inss: "", adiantamentos: "", outrosDescontos: "", observacao: "" });
const cadastroInicial = () => ({ nome: "", telefone: "", email: "", cpf: "", ctps: "", rg: "", dataNascimento: "", cargo: "", dataAdmissao: "", salarioBase: "", endereco: "", cidade: "", estado: "", cep: "", contatoEmergencia: "", telefoneEmergencia: "", fotoUrl: "", esocialUrl: "", filialId: "", observacoes: "", desconsiderarIntervalo: false, intervaloPrevistoMin: "60" });
const filialInicial = () => ({ nome: "", cnpj: "", telefone: "", endereco: "", cidade: "", estado: "", cep: "" });

export default function Financeiro({ user, onNavigate, rotaAtual }) {
  const admin = normalizeRole(user?.role) === ROLE_ADMIN;
  const [aba, setAba] = useState("folha");
  const [funcionarios, setFuncionarios] = useState([]);
  const [funcionarioId, setFuncionarioId] = useState("");
  const [filiais, setFiliais] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [folhas, setFolhas] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [folha, setFolha] = useState(folhaInicial);
  const [pagamento, setPagamento] = useState(pagamentoInicial);
  const [cadastro, setCadastro] = useState(cadastroInicial);
  const [filial, setFilial] = useState(filialInicial);
  const [documento, setDocumento] = useState({ titulo: "", tipo: "contrato", url: "", mesReferencia: mesAtual() });
  const [compartilhamento, setCompartilhamento] = useState(null);
  const [recibo, setRecibo] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const funcionario = useMemo(() => funcionarios.find((item) => item.id === funcionarioId), [funcionarios, funcionarioId]);
  const totais = useMemo(() => {
    const proventos = numero(folha.salarioBase) + numero(folha.bonus) + numero(folha.horasExtras) + numero(folha.adicionais);
    const baseHora = numero(folha.salarioBase) + (folha.bonusBaseDesconto ? numero(folha.bonus) : 0);
    const valorHora = numero(folha.divisorHoras) > 0 ? baseHora / numero(folha.divisorHoras) : 0;
    const descontoHoras = valorHora * numero(folha.horasDevidas);
    const descontos = descontoHoras + numero(folha.faltas) + numero(folha.inss) + numero(folha.adiantamentos) + numero(folha.outrosDescontos);
    return { proventos, descontos, descontoHoras, valorHora, liquido: Math.max(0, proventos - descontos) };
  }, [folha]);
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
    const sairFinanceiro = observarLancamentosFinanceiros(setLancamentos, () => setErro("Não foi possível carregar pagamentos."));
    const sairFolhas = onSnapshot(collection(db, "folhasPagamento"), (snap) => setFolhas(snap.docs.map((item) => ({ id: item.id, ...item.data() })).sort((a, b) => String(b.competencia).localeCompare(String(a.competencia)))));
    const sairDocumentos = onSnapshot(collection(db, "documentosTrabalhistas"), (snap) => setDocumentos(snap.docs.map((item) => ({ id: item.id, ...item.data() }))));
    return () => { sairFuncionarios(); sairFiliais(); sairFinanceiro(); sairFolhas(); sairDocumentos(); };
  }, [admin]);
  useEffect(() => {
    if (!funcionario) return;
    setCadastro({ ...cadastroInicial(), ...funcionario, salarioBase: funcionario.salarioBase || "", intervaloPrevistoMin: funcionario.intervaloPrevistoMin ?? "60" });
    setFolha((atual) => ({ ...atual, salarioBase: funcionario.salarioBase || "" }));
    setPagamento((atual) => ({ ...atual, valor: atual.valor || funcionario.salarioBase || "" }));
    const agora = new Date();
    const anterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
    const competenciaAnterior = `${anterior.getFullYear()}-${String(anterior.getMonth() + 1).padStart(2, "0")}`;
    calcularBancoHorasMes(funcionario.id, competenciaAnterior, funcionario.bancoHorasInicio || "")
      .then((saldo) => setFolha((atual) => ({ ...atual, horasDevidas: saldo < 0 ? String(Math.abs(saldo) / 60) : "" })))
      .catch(() => {});
  }, [funcionario]);

  async function executar(acao, mensagem) {
    setOcupado(true); setErro("");
    try { await acao(); } catch (error) { console.error(error); setErro(mensagem); } finally { setOcupado(false); }
  }
  function fecharFolha(event) {
    event.preventDefault();
    if (!funcionarioId || !folha.competencia || totais.proventos <= 0) return setErro("Informe a competência e os valores da folha.");
    executar(() => setDoc(doc(db, "folhasPagamento", `${funcionarioId}_${folha.competencia}`), { ...folha, ...totais, funcionarioId, funcionarioNome: funcionario?.nome || "", status: "pronta_pagamento", fechadaEm: serverTimestamp(), fechadaPor: user.uid }), "Não foi possível fechar a folha.");
  }
  function pagarFolha(item) {
    executar(async () => {
      await criarLancamentoFinanceiro({ ...item, folhaId: item.id, tipo: "salario", valor: numero(item.proventos), descontos: numero(item.descontos), dataPagamento: hoje(), competenciaMes: item.competencia, descricao: "Pagamento da folha fechada", funcionarioId: item.funcionarioId, funcionarioNome: item.funcionarioNome });
      await updateDoc(doc(db, "folhasPagamento", item.id), { status: "paga", pagaEm: serverTimestamp() });
    }, "Não foi possível registrar o pagamento.");
  }
  function salvarPagamento(event) {
    event.preventDefault();
    executar(async () => {
      if (numero(pagamento.valor) <= 0) throw new Error("valor");
      await criarLancamentoFinanceiro({ ...pagamento, valor: numero(pagamento.valor), descontos: numero(pagamento.descontos), funcionarioId, funcionarioNome: funcionario?.nome || "" });
      setPagamento(pagamentoInicial());
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

  if (!admin) return <div className="page-bg admin-bg"><main className="page-shell admin-shell"><p>Acesso restrito ao administrador.</p></main><BottomNav activePath={rotaAtual} onNavigate={onNavigate} user={user} /></div>;
  const folhasDaEmpregada = folhas.filter((item) => item.funcionarioId === funcionarioId);
  const docsDaEmpregada = documentos.filter((item) => item.funcionarioId === funcionarioId);
  const comprovantesPorMes = agruparComprovantes(recibos, docsDaEmpregada);
  return <div className="page-bg admin-bg"><main className="page-shell admin-shell escritorio-shell">
    <header className="financeiro-header"><img src={logo} alt="Logo" /><div><h1>Escritório contábil</h1><p>Folha, pagamentos e comprovantes</p></div></header>
    <div className="card escritorio-toolbar"><label className="field"><span>Funcionário</span><select value={funcionarioId} onChange={(e) => setFuncionarioId(e.target.value)}><option value="">Selecione</option>{funcionarios.map((item) => <option key={item.id} value={item.id}>{item.nome || "Funcionário sem nome"}{item.filialId ? ` · ${filiais.find((f) => f.id === item.filialId)?.nome || "Filial"}` : ""}</option>)}</select></label><button type="button" className="btn btn-success" onClick={novoFuncionario} disabled={ocupado}>Novo funcionário</button><a className="btn btn-secondary" href={cadastro.esocialUrl || "https://login.esocial.gov.br/login.aspx"} target="_blank" rel="noreferrer">Abrir eSocial</a></div>
    <nav className="escritorio-tabs">{[["folha","Folha"],["pagamentos","Pagamentos avulsos"],["cadastro","Funcionário"],["filiais","Filiais"],["comprovantes","Comprovantes"]].map(([id,label]) => <button key={id} type="button" className={aba === id ? "active" : ""} onClick={() => setAba(id)}>{label}</button>)}</nav>
    {erro && <p className="mensagem erro">{erro}</p>}

    {aba === "folha" && <section className="admin-section"><form className="card folha-form" onSubmit={fecharFolha}><div className="section-header"><h2>Fechar folha de pagamento</h2><span className="section-sub">Fechada = pronta para pagar</span></div><div className="folha-grid">
      {[["competencia","Competência","month"],["salarioBase","Salário base","number"],["bonus","Bônus","number"],["horasExtras","Horas extras (R$)","number"],["adicionais","Outros adicionais","number"],["horasDevidas","Horas devidas do mês anterior","number"],["divisorHoras","Divisor mensal para valor-hora","number"],["faltas","Faltas / atrasos (R$)","number"],["inss","INSS (R$)","number"],["adiantamentos","Vales / adiantamentos","number"],["outrosDescontos","Outros descontos","number"]].map(([campo,label,tipo]) => <label className="field" key={campo}><span>{label}</span><input type={tipo} step={campo === "horasDevidas" ? "0.01" : tipo === "number" ? "0.01" : undefined} min={tipo === "number" ? "0" : undefined} value={folha[campo]} onChange={(e) => setFolha({ ...folha, [campo]: e.target.value })} /></label>)}
    </div><label className="folha-checkbox"><input type="checkbox" checked={folha.bonusBaseDesconto} onChange={(e) => setFolha({ ...folha, bonusBaseDesconto: e.target.checked })} /><span>Incluir o bônus na base de cálculo do desconto das horas devidas</span></label><div className="folha-calculo-horas"><span>Valor-hora calculado: <b>{moeda(totais.valorHora)}</b></span><span>Desconto pelas horas devidas: <b>{moeda(totais.descontoHoras)}</b></span></div><label className="field"><span>Observação</span><input value={folha.observacao} onChange={(e) => setFolha({ ...folha, observacao: e.target.value })} /></label><div className="folha-totais"><span>Proventos <b>{moeda(totais.proventos)}</b></span><span>Descontos <b>{moeda(totais.descontos)}</b></span><strong>Líquido {moeda(totais.liquido)}</strong></div><button className="btn btn-primary" disabled={ocupado}>Fechar folha</button></form>
      <div className="financeiro-lista">{folhasDaEmpregada.map((item) => <article className="card financeiro-item" key={item.id}><div><strong>Folha {String(item.competencia).split("-").reverse().join("/")}</strong><span>{item.status === "paga" ? "Paga" : "Pronta para pagamento"} · {moeda(item.liquido)}</span></div>{item.status !== "paga" && <button type="button" className="btn btn-success" disabled={ocupado} onClick={() => pagarFolha(item)}>Registrar pagamento</button>}</article>)}</div>
    </section>}

    {aba === "pagamentos" && <section className="admin-section"><div className="pagamento-atalhos"><button type="button" className={pagamento.tipo === "transporte" ? "active" : ""} onClick={() => setPagamento({ ...pagamento, tipo: "transporte", valor: "" })}><strong>Transporte semanal</strong><span>Informe o período da semana</span></button><button type="button" className={pagamento.tipo === "vale" ? "active" : ""} onClick={() => setPagamento({ ...pagamento, tipo: "vale", valor: "" })}><strong>Vale / adiantamento</strong><span>Pagamento quando solicitado</span></button><button type="button" className={pagamento.tipo === "salario" ? "active" : ""} onClick={() => setPagamento({ ...pagamento, tipo: "salario", valor: funcionario?.salarioBase || "" })}><strong>Salário avulso</strong><span>Fora do fechamento da folha</span></button></div><form className="card financeiro-form" onSubmit={salvarPagamento}><label className="field"><span>Tipo</span><select value={pagamento.tipo} onChange={(e) => setPagamento({ ...pagamento, tipo: e.target.value })}>{Object.entries(TIPOS).map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></label><label className="field"><span>Valor</span><input type="number" step="0.01" value={pagamento.valor} onChange={(e) => setPagamento({ ...pagamento, valor: e.target.value })} /></label><label className="field"><span>Descontos</span><input type="number" step="0.01" value={pagamento.descontos} onChange={(e) => setPagamento({ ...pagamento, descontos: e.target.value })} /></label><label className="field"><span>Data do pagamento</span><input type="date" value={pagamento.dataPagamento} onChange={(e) => setPagamento({ ...pagamento, dataPagamento: e.target.value })} /></label>{pagamento.tipo === "transporte" ? <><label className="field"><span>Início da semana</span><input type="date" value={pagamento.periodoInicio} onChange={(e) => setPagamento({ ...pagamento, periodoInicio: e.target.value })} /></label><label className="field"><span>Fim da semana</span><input type="date" value={pagamento.periodoFim} onChange={(e) => setPagamento({ ...pagamento, periodoFim: e.target.value })} /></label></> : <label className="field"><span>Mês de referência</span><input type="month" value={pagamento.competenciaMes} onChange={(e) => setPagamento({ ...pagamento, competenciaMes: e.target.value })} /></label>}<label className="field financeiro-descricao"><span>Observação / motivo</span><input value={pagamento.descricao} onChange={(e) => setPagamento({ ...pagamento, descricao: e.target.value })} /></label><button className="btn btn-success" disabled={ocupado}>Salvar pagamento e arquivar recibo</button></form></section>}

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
      <form className="card financeiro-form" onSubmit={salvarDocumento}>
        <label className="field"><span>Mês do comprovante</span><input type="month" required value={documento.mesReferencia} onChange={(e) => setDocumento({ ...documento, mesReferencia: e.target.value })} /></label>
        <label className="field"><span>Tipo</span><select value={documento.tipo} onChange={(e) => setDocumento({ ...documento, tipo: e.target.value })}><option value="contrato">Contrato</option><option value="esocial">eSocial</option><option value="outro">Outro</option></select></label>
        <label className="field"><span>Título</span><input required value={documento.titulo} onChange={(e) => setDocumento({ ...documento, titulo: e.target.value })} /></label>
        <label className="field financeiro-descricao"><span>Link do arquivo</span><input type="url" required value={documento.url} onChange={(e) => setDocumento({ ...documento, url: e.target.value })} /></label>
        <button className="btn btn-primary" disabled={ocupado || !funcionarioId}>Arquivar comprovante</button>
      </form>
      <p className="text-muted">Recibos organizados pelo mês do pagamento. Outros comprovantes pelo mês informado ou, nos antigos, pelo mês do cadastro.</p>
      {!comprovantesPorMes.length && <p className="card text-muted">Nenhum comprovante para este funcionário.</p>}
      {comprovantesPorMes.map((grupo) => <section className="comprovantes-mes" key={grupo.mes}>
        <header className="section-header"><h2>{nomeMesComprovante(grupo.mes)}</h2><span className="section-sub">{grupo.itens.length} comprovante{grupo.itens.length === 1 ? "" : "s"}</span></header>
        <div className="financeiro-lista">{grupo.itens.map(({ item, categoria, chave }) => <article className="card financeiro-item" key={chave}>
          <div><strong>{categoria === "recibo" ? `Recibo · ${TIPOS[item.tipo] || item.tipoLabel || item.tipo}` : item.titulo}</strong><span>{categoria === "recibo" ? `${dataBr(item.dataPagamento)} · ${moeda(item.valorLiquido ?? item.valor)}` : item.tipo}</span></div>
          <div className="financeiro-acoes">
            {categoria === "recibo" ? <button type="button" className="btn btn-secondary" disabled={ocupado} onClick={() => abrirRecibo(item)}>Abrir</button> : urlComprovante(item.url) ? <a className="btn btn-secondary" href={urlComprovante(item.url)} target="_blank" rel="noreferrer">Abrir</a> : <button type="button" className="btn btn-secondary" disabled>Link indisponível</button>}
            <button type="button" className="btn btn-secondary" disabled={ocupado} onClick={() => categoria === "recibo" ? abrirRecibo(item, true) : compartilharLink(item)}>Compartilhar</button>
            <button type="button" className="btn btn-danger" disabled={ocupado} onClick={() => apagarComprovante(item, categoria)}>Apagar</button>
          </div>
        </article>)}</div>
      </section>)}
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
  <BottomNav activePath={rotaAtual} onNavigate={onNavigate} user={user} /></div>;
}
