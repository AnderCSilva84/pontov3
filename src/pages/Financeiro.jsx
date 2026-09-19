import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { criarLancamentoFinanceiro, excluirLancamentoFinanceiro, observarLancamentosFinanceiros } from "../services/financeiro";
import { calcularBancoHorasMes, listarFuncionarios } from "../services/ponto";
import { db } from "../services/firebase";
import BottomNav from "../components/BottomNav";
import { normalizeRole, ROLE_ADMIN } from "../utils/roles";
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

export default function Financeiro({ user, onNavigate, rotaAtual }) {
  const admin = normalizeRole(user?.role) === ROLE_ADMIN;
  const [aba, setAba] = useState("folha");
  const [funcionarios, setFuncionarios] = useState([]);
  const [funcionarioId, setFuncionarioId] = useState("");
  const [lancamentos, setLancamentos] = useState([]);
  const [folhas, setFolhas] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [folha, setFolha] = useState(folhaInicial);
  const [pagamento, setPagamento] = useState(pagamentoInicial);
  const [cadastro, setCadastro] = useState({ salarioBase: "", cargo: "", cpf: "", dataAdmissao: "", esocialUrl: "" });
  const [documento, setDocumento] = useState({ titulo: "", tipo: "contrato", url: "" });
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
    listarFuncionarios().then((lista) => { setFuncionarios(lista); if (lista[0]) setFuncionarioId(lista[0].id); }).catch(() => setErro("Não foi possível carregar as empregadas."));
    const sairFinanceiro = observarLancamentosFinanceiros(setLancamentos, () => setErro("Não foi possível carregar pagamentos."));
    const sairFolhas = onSnapshot(collection(db, "folhasPagamento"), (snap) => setFolhas(snap.docs.map((item) => ({ id: item.id, ...item.data() })).sort((a, b) => String(b.competencia).localeCompare(String(a.competencia)))));
    const sairDocumentos = onSnapshot(collection(db, "documentosTrabalhistas"), (snap) => setDocumentos(snap.docs.map((item) => ({ id: item.id, ...item.data() }))));
    return () => { sairFinanceiro(); sairFolhas(); sairDocumentos(); };
  }, [admin]);
  useEffect(() => {
    if (!funcionario) return;
    setCadastro({ salarioBase: funcionario.salarioBase || "", cargo: funcionario.cargo || "", cpf: funcionario.cpf || "", dataAdmissao: funcionario.dataAdmissao || "", esocialUrl: funcionario.esocialUrl || "" });
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
      await criarLancamentoFinanceiro({ tipo: "salario", valor: numero(item.proventos), descontos: numero(item.descontos), dataPagamento: hoje(), competenciaMes: item.competencia, descricao: "Pagamento da folha fechada", funcionarioId: item.funcionarioId, funcionarioNome: item.funcionarioNome });
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
      await updateDoc(doc(db, "funcionarios", funcionarioId), { ...cadastro, salarioBase: numero(cadastro.salarioBase), atualizadoEm: serverTimestamp() });
      setFuncionarios((lista) => lista.map((item) => item.id === funcionarioId ? { ...item, ...cadastro, salarioBase: numero(cadastro.salarioBase) } : item));
    }, "Não foi possível salvar o cadastro.");
  }
  function salvarDocumento(event) {
    event.preventDefault();
    executar(async () => {
      const url = new URL(documento.url);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error("url");
      await addDoc(collection(db, "documentosTrabalhistas"), { ...documento, funcionarioId, funcionarioNome: funcionario?.nome || "", criadoEm: serverTimestamp(), criadoPor: user.uid });
      setDocumento({ titulo: "", tipo: "contrato", url: "" });
    }, "Informe um título e um link válido.");
  }
  function abrirRecibo(item) {
    executar(async () => {
      const { gerarReciboFinanceiro } = await import("../utils/exportarReciboFinanceiro");
      const arquivo = await gerarReciboFinanceiro(item);
      setRecibo({ ...arquivo, url: URL.createObjectURL(arquivo.blob) });
    }, "Não foi possível abrir o recibo.");
  }

  if (!admin) return <div className="page-bg admin-bg"><main className="page-shell admin-shell"><p>Acesso restrito ao administrador.</p></main><BottomNav activePath={rotaAtual} onNavigate={onNavigate} user={user} /></div>;
  const folhasDaEmpregada = folhas.filter((item) => item.funcionarioId === funcionarioId);
  const docsDaEmpregada = documentos.filter((item) => item.funcionarioId === funcionarioId);
  return <div className="page-bg admin-bg"><main className="page-shell admin-shell escritorio-shell">
    <header className="financeiro-header"><img src={logo} alt="Logo" /><div><h1>Escritório contábil</h1><p>Folha, pagamentos, recibos e documentos</p></div></header>
    <div className="card escritorio-toolbar"><label className="field"><span>Empregada</span><select value={funcionarioId} onChange={(e) => setFuncionarioId(e.target.value)}>{funcionarios.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label><a className="btn btn-secondary" href={cadastro.esocialUrl || "https://login.esocial.gov.br/login.aspx"} target="_blank" rel="noreferrer">Abrir eSocial</a></div>
    <nav className="escritorio-tabs">{[["folha","Folha"],["pagamentos","Pagamentos avulsos"],["cadastro","Cadastro"],["documentos","Documentos"]].map(([id,label]) => <button key={id} type="button" className={aba === id ? "active" : ""} onClick={() => setAba(id)}>{label}</button>)}</nav>
    {erro && <p className="mensagem erro">{erro}</p>}

    {aba === "folha" && <section className="admin-section"><form className="card folha-form" onSubmit={fecharFolha}><div className="section-header"><h2>Fechar folha de pagamento</h2><span className="section-sub">Fechada = pronta para pagar</span></div><div className="folha-grid">
      {[["competencia","Competência","month"],["salarioBase","Salário base","number"],["bonus","Bônus","number"],["horasExtras","Horas extras (R$)","number"],["adicionais","Outros adicionais","number"],["horasDevidas","Horas devidas do mês anterior","number"],["divisorHoras","Divisor mensal para valor-hora","number"],["faltas","Faltas / atrasos (R$)","number"],["inss","INSS (R$)","number"],["adiantamentos","Vales / adiantamentos","number"],["outrosDescontos","Outros descontos","number"]].map(([campo,label,tipo]) => <label className="field" key={campo}><span>{label}</span><input type={tipo} step={campo === "horasDevidas" ? "0.01" : tipo === "number" ? "0.01" : undefined} min={tipo === "number" ? "0" : undefined} value={folha[campo]} onChange={(e) => setFolha({ ...folha, [campo]: e.target.value })} /></label>)}
    </div><label className="folha-checkbox"><input type="checkbox" checked={folha.bonusBaseDesconto} onChange={(e) => setFolha({ ...folha, bonusBaseDesconto: e.target.checked })} /><span>Incluir o bônus na base de cálculo do desconto das horas devidas</span></label><div className="folha-calculo-horas"><span>Valor-hora calculado: <b>{moeda(totais.valorHora)}</b></span><span>Desconto pelas horas devidas: <b>{moeda(totais.descontoHoras)}</b></span></div><label className="field"><span>Observação</span><input value={folha.observacao} onChange={(e) => setFolha({ ...folha, observacao: e.target.value })} /></label><div className="folha-totais"><span>Proventos <b>{moeda(totais.proventos)}</b></span><span>Descontos <b>{moeda(totais.descontos)}</b></span><strong>Líquido {moeda(totais.liquido)}</strong></div><button className="btn btn-primary" disabled={ocupado}>Fechar folha</button></form>
      <div className="financeiro-lista">{folhasDaEmpregada.map((item) => <article className="card financeiro-item" key={item.id}><div><strong>Folha {String(item.competencia).split("-").reverse().join("/")}</strong><span>{item.status === "paga" ? "Paga" : "Pronta para pagamento"} · {moeda(item.liquido)}</span></div>{item.status !== "paga" && <button type="button" className="btn btn-success" disabled={ocupado} onClick={() => pagarFolha(item)}>Registrar pagamento</button>}</article>)}</div>
    </section>}

    {aba === "pagamentos" && <section className="admin-section"><div className="pagamento-atalhos"><button type="button" className={pagamento.tipo === "transporte" ? "active" : ""} onClick={() => setPagamento({ ...pagamento, tipo: "transporte", valor: "" })}><strong>Transporte semanal</strong><span>Informe o período da semana</span></button><button type="button" className={pagamento.tipo === "vale" ? "active" : ""} onClick={() => setPagamento({ ...pagamento, tipo: "vale", valor: "" })}><strong>Vale / adiantamento</strong><span>Pagamento quando solicitado</span></button><button type="button" className={pagamento.tipo === "salario" ? "active" : ""} onClick={() => setPagamento({ ...pagamento, tipo: "salario", valor: funcionario?.salarioBase || "" })}><strong>Salário avulso</strong><span>Fora do fechamento da folha</span></button></div><form className="card financeiro-form" onSubmit={salvarPagamento}><label className="field"><span>Tipo</span><select value={pagamento.tipo} onChange={(e) => setPagamento({ ...pagamento, tipo: e.target.value })}>{Object.entries(TIPOS).map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></label><label className="field"><span>Valor</span><input type="number" step="0.01" value={pagamento.valor} onChange={(e) => setPagamento({ ...pagamento, valor: e.target.value })} /></label><label className="field"><span>Descontos</span><input type="number" step="0.01" value={pagamento.descontos} onChange={(e) => setPagamento({ ...pagamento, descontos: e.target.value })} /></label><label className="field"><span>Data do pagamento</span><input type="date" value={pagamento.dataPagamento} onChange={(e) => setPagamento({ ...pagamento, dataPagamento: e.target.value })} /></label>{pagamento.tipo === "transporte" ? <><label className="field"><span>Início da semana</span><input type="date" value={pagamento.periodoInicio} onChange={(e) => setPagamento({ ...pagamento, periodoInicio: e.target.value })} /></label><label className="field"><span>Fim da semana</span><input type="date" value={pagamento.periodoFim} onChange={(e) => setPagamento({ ...pagamento, periodoFim: e.target.value })} /></label></> : <label className="field"><span>Mês de referência</span><input type="month" value={pagamento.competenciaMes} onChange={(e) => setPagamento({ ...pagamento, competenciaMes: e.target.value })} /></label>}<label className="field financeiro-descricao"><span>Observação / motivo</span><input value={pagamento.descricao} onChange={(e) => setPagamento({ ...pagamento, descricao: e.target.value })} /></label><button className="btn btn-success" disabled={ocupado}>Salvar pagamento e arquivar recibo</button></form></section>}

    {aba === "cadastro" && <form className="card financeiro-form" onSubmit={salvarCadastro}>{[["salarioBase","Salário base","number"],["cargo","Cargo","text"],["cpf","CPF","text"],["dataAdmissao","Admissão","date"],["esocialUrl","Link eSocial","url"]].map(([campo,label,tipo]) => <label className={campo === "esocialUrl" ? "field financeiro-descricao" : "field"} key={campo}><span>{label}</span><input type={tipo} step={tipo === "number" ? "0.01" : undefined} value={cadastro[campo]} onChange={(e) => setCadastro({ ...cadastro, [campo]: e.target.value })} /></label>)}<button className="btn btn-primary" disabled={ocupado}>Salvar cadastro</button></form>}

    {aba === "documentos" && <section className="admin-section"><form className="card financeiro-form" onSubmit={salvarDocumento}><label className="field"><span>Tipo</span><select value={documento.tipo} onChange={(e) => setDocumento({ ...documento, tipo: e.target.value })}><option value="contrato">Contrato</option><option value="esocial">eSocial</option><option value="outro">Outro</option></select></label><label className="field"><span>Título</span><input required value={documento.titulo} onChange={(e) => setDocumento({ ...documento, titulo: e.target.value })} /></label><label className="field financeiro-descricao"><span>Link do arquivo</span><input type="url" required value={documento.url} onChange={(e) => setDocumento({ ...documento, url: e.target.value })} /></label><button className="btn btn-primary">Arquivar link</button></form><div className="financeiro-lista">{recibos.map((item) => <article className="card financeiro-item" key={item.id}><div><strong>Recibo · {TIPOS[item.tipo] || item.tipoLabel}</strong><span>{dataBr(item.dataPagamento)} · {moeda(item.valorLiquido ?? item.valor)}</span></div><div className="financeiro-acoes"><button className="btn btn-secondary" onClick={() => abrirRecibo(item)}>Abrir</button><button className="btn btn-danger" onClick={() => excluirLancamentoFinanceiro(item.id)}>Apagar</button></div></article>)}{docsDaEmpregada.map((item) => <article className="card financeiro-item" key={item.id}><div><strong>{item.titulo}</strong><span>{item.tipo}</span></div><div className="financeiro-acoes"><a className="btn btn-secondary" href={item.url} target="_blank" rel="noreferrer">Abrir</a><button className="btn btn-danger" onClick={() => deleteDoc(doc(db, "documentosTrabalhistas", item.id))}>Apagar</button></div></article>)}</div></section>}

    <footer className="app-footer"><span>Desenvolvido por ACS Informática</span><a href="https://acstech.dev.br/" target="_blank" rel="noreferrer">https://acstech.dev.br/</a></footer>
  </main>{recibo && <div className="recibo-modal" role="dialog" aria-modal="true"><div className="recibo-modal-painel"><div className="recibo-modal-topo"><strong>Recibo arquivado</strong><button onClick={() => setRecibo(null)}>×</button></div><iframe src={`${recibo.url}#toolbar=0`} title="Recibo" /><div className="recibo-modal-acoes"><a className="btn btn-primary" href={recibo.url} download={recibo.nomeArquivo}>Baixar PDF</a><button className="btn btn-muted" onClick={() => setRecibo(null)}>Fechar</button></div></div></div>}<BottomNav activePath={rotaAtual} onNavigate={onNavigate} user={user} /></div>;
}
