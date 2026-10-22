import { collection, doc } from '../services/dadosGrupo';
import useDialogFocus from '../utils/useDialogFocus';
import { PageHeader } from '../components/ui';
import AgendaTarefas from '../components/AgendaTarefas';
import { useEffect, useState, useRef, useCallback } from "react";
import { onSnapshot, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from "../services/firebase";
import BottomNav from "../components/BottomNav";
import { canCreateTasks } from "../utils/roles";
import { dataIsoLocal } from "../utils/feriados";
import "../styles/tarefas.css";
import "../styles/nav.css";

const DIAS_FORM = [
  { value: 1, label: "Segunda-feira" }, { value: 2, label: "Terça-feira" },
  { value: 3, label: "Quarta-feira" }, { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" }, { value: 6, label: "Sábado" },
];

export default function Tarefas({ user, onNavigate, rotaAtual }) {
  const podeCriar = canCreateTasks(user);
  const [titulo, setTitulo] = useState("");
  const [diaSemana, setDiaSemana] = useState(1);
  const [turno, setTurno] = useState("manha");
  const [horario, setHorario] = useState("");
  const [tarefas, setTarefas] = useState([]);
  const [fontesCarregadas,setFontesCarregadas] = useState({fixas:false,avulsas:false});
  const [tarefasAvulsas, setTarefasAvulsas] = useState([]);
  const [tituloAvulsa, setTituloAvulsa] = useState("");
  const [dataAvulsa, setDataAvulsa] = useState(dataIsoLocal());
  const [turnoAvulsa, setTurnoAvulsa] = useState("manha");
  const [horarioAvulsa, setHorarioAvulsa] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [edicao, setEdicao] = useState(null);
  const dialogRef = useRef(null);
  const fecharDialog = useCallback(() => setEdicao(null), []);
  useDialogFocus(dialogRef, Boolean(edicao), fecharDialog);

  useEffect(() => {
    if (!user) return undefined;
    return onSnapshot(collection(db, "tarefasSemanais"), (snapshot) => {
      setTarefas(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })).filter((item) => item.ativa !== false)); setFontesCarregadas(antes=>({...antes,fixas:true}));
    }, () => setErro("Não foi possível carregar as tarefas semanais."));
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;
    return onSnapshot(collection(db, "tarefas"), (snapshot) => {
      setTarefasAvulsas(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))); setFontesCarregadas(antes=>({...antes,avulsas:true}));
    }, () => setErro("Não foi possível carregar as tarefas avulsas."));
  }, [user]);

  async function adicionar(event) {
    event.preventDefault(); if (!titulo.trim() || !podeCriar) return;
    setSalvando(true); setErro("");
    try {
      const batch = writeBatch(db);
      const tarefaRef = doc(collection(db, "tarefasSemanais"));
      const notificacaoRef = doc(collection(db, "notificacoes"));
      const diaLabel = DIAS_FORM.find((dia) => dia.value === Number(diaSemana))?.label || "dia definido";
      batch.set(tarefaRef, { titulo: titulo.trim(), diaSemana: Number(diaSemana), turno, horario: horario || "", ativa: true, criadoEm: serverTimestamp(), criadoPor: user.uid });
      batch.set(notificacaoRef, {
        titulo: "Nova tarefa fixa",
        mensagem: `${titulo.trim()} · ${diaLabel} · ${turno === "tarde" ? "Tarde" : "Manhã"}${horario ? ` · ${horario}` : ""}`,
        tipo: "tarefa_fixa_criada",
        criadoEm: serverTimestamp(),
        criadoPor: user.uid,
      });
      await batch.commit();
      setTitulo("");
      setHorario("");
    } catch { setErro("Não foi possível cadastrar a tarefa."); }
    finally { setSalvando(false); }
  }

  async function adicionarAvulsa(event) {
    event.preventDefault();
    if (!tituloAvulsa.trim() || !dataAvulsa || !podeCriar) return;
    const [ano, numeroMes, dia] = dataAvulsa.split("-").map(Number);
    const data = new Date(ano, numeroMes - 1, dia);
    setSalvando(true); setErro("");
    try {
      const batch = writeBatch(db);
      const tarefaRef = doc(collection(db, "tarefas"));
      const notificacaoRef = doc(collection(db, "notificacoes"));
      batch.set(tarefaRef, { titulo: tituloAvulsa.trim(), dataAgendada: dataAvulsa, diaSemana: ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"][data.getDay()], turno: turnoAvulsa, horario: horarioAvulsa || "", concluida: false, criadoEm: serverTimestamp(), solicitadoPor: user.uid, solicitadoPorNome: user.nome || "Admin" });
      batch.set(notificacaoRef, {
        titulo: "Nova tarefa no calendário",
        mensagem: `${tituloAvulsa.trim()} · ${dataAvulsa.split("-").reverse().join("/")} · ${turnoAvulsa === "tarde" ? "Tarde" : "Manhã"}${horarioAvulsa ? ` · ${horarioAvulsa}` : ""}`,
        tipo: "tarefa_avulsa_criada",
        criadoEm: serverTimestamp(),
        criadoPor: user.uid,
      });
      await batch.commit();
      setTituloAvulsa("");
      setHorarioAvulsa("");
    } catch { setErro("Não foi possível cadastrar a tarefa avulsa."); }
    finally { setSalvando(false); }
  }

  async function excluirTarefaFixa(tarefa) {
    if (!podeCriar || !window.confirm('Excluir esta tarefa?')) return;
    setErro("");
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, "tarefasSemanais", tarefa.id));
      batch.set(doc(collection(db, "notificacoes")), {
        titulo: "Rotina fixa atualizada",
        mensagem: `A tarefa “${tarefa.titulo}” foi removida da rotina.`,
        tipo: "tarefa_fixa_removida",
        criadoEm: serverTimestamp(),
        criadoPor: user.uid,
      });
      await batch.commit();
    } catch {
      setErro("Não foi possível excluir a tarefa fixa.");
    }
  }

  async function excluirTarefaAvulsa(tarefa) {
    if (!podeCriar || !window.confirm('Excluir esta tarefa?')) return;
    setErro("");
    try {
      await writeBatch(db).delete(doc(db, "tarefas", tarefa.id)).commit();
    } catch {
      setErro("Não foi possível excluir a tarefa avulsa.");
    }
  }

  function tarefasDoDia(dia) {
    return tarefas.filter((item) => Number(item.diaSemana) === dia);
  }

  function avulsasDoDia(dia) {
    return tarefasAvulsas.filter((item) => {
      const [ano, mesNumero, dataDia] = String(item.dataAgendada || "").split("-").map(Number);
      return ano && mesNumero && dataDia && new Date(ano, mesNumero - 1, dataDia).getDay() === dia;
    });
  }

  function renderGrupoDia(dia, incluirAvulsas = false) {
    const fixas = tarefasDoDia(dia.value);
    const avulsas = incluirAvulsas ? avulsasDoDia(dia.value) : [];
    const itens = [
      ...fixas.map((item) => ({ ...item, tipoEdicao: "fixa" })),
      ...avulsas.map((item) => ({ ...item, tipoEdicao: "avulsa" })),
    ];
    return <details className="tarefas-dia-grupo" key={`${incluirAvulsas ? "gerenciar" : "rotina"}-${dia.value}`}><summary><span>{dia.label}</span><b>{itens.length}</b></summary>{itens.length ? <div className="tarefas-itens">{itens.map((item) => <div className="tarefas-item" key={`${item.tipoEdicao}-${item.id}`}><div><strong>{item.titulo}</strong><span className="tarefas-por">{item.tipoEdicao === "avulsa" ? `Avulsa · ${String(item.dataAgendada || "").split("-").reverse().join("/")}` : `Toda semana · ${item.turno === "tarde" ? "Tarde" : "Manhã"}`}{item.horario ? ` · ${item.horario}` : ""}</span></div>{podeCriar && <div className="tarefas-item-acoes"><button type="button" className="btn btn-secondary tarefas-concluir" onClick={() => iniciarEdicao(item, item.tipoEdicao)}>Editar</button><button type="button" className="btn btn-danger tarefas-concluir" onClick={() => item.tipoEdicao === "fixa" ? excluirTarefaFixa(item) : excluirTarefaAvulsa(item)}>Excluir</button></div>}</div>)}</div> : <p className="text-muted tarefas-dia-vazio">Nenhuma tarefa neste dia.</p>}</details>;
  }

  function iniciarEdicao(tarefa, tipo) {
    setEdicao({
      id: tarefa.id,
      tipo,
      titulo: tarefa.titulo || "",
      horario: tarefa.horario || "",
      turno: tarefa.turno || "manha",
      diaSemana: Number(tarefa.diaSemana) || 1,
      dataAgendada: tarefa.dataAgendada || dataIsoLocal(),
    });
    setErro("");
  }

  async function salvarEdicao(event) {
    event.preventDefault();
    if (!edicao?.titulo?.trim() || !podeCriar) return;
    setSalvando(true); setErro("");
    try {
      if (edicao.tipo === "fixa") {
        await updateDoc(doc(db, "tarefasSemanais", edicao.id), {
          titulo: edicao.titulo.trim(),
          horario: edicao.horario || "",
          turno: edicao.turno,
          diaSemana: Number(edicao.diaSemana),
          atualizadoEm: serverTimestamp(),
          atualizadoPor: user.uid,
        });
      } else {
        const [ano, numeroMes, dia] = edicao.dataAgendada.split("-").map(Number);
        const data = new Date(ano, numeroMes - 1, dia);
        await updateDoc(doc(db, "tarefas", edicao.id), {
          titulo: edicao.titulo.trim(),
          horario: edicao.horario || "",
          turno: edicao.turno,
          dataAgendada: edicao.dataAgendada,
          diaSemana: ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"][data.getDay()],
          atualizadoEm: serverTimestamp(),
          atualizadoPor: user.uid,
        });
      }
      setEdicao(null);
    } catch {
      setErro("Não foi possível atualizar a tarefa.");
    } finally {
      setSalvando(false);
    }
  }

  if (!user) return <div className="page-bg page-tarefas"><main className="page-shell tarefas-shell"><h1>Tarefas semanais</h1><p className="text-muted">Entre no aplicativo para visualizar o calendário.</p></main><BottomNav activePath={rotaAtual} onNavigate={onNavigate} user={user} /></div>;
  return (
    <div className="page-bg page-tarefas"><main className="page-shell tarefas-shell">
      <PageHeader title="Tarefas" subtitle="Sua rotina, um cuidado de cada vez." />
      <AgendaTarefas carregando={(!fontesCarregadas.fixas || !fontesCarregadas.avulsas) && !erro} user={user} fixas={tarefas} avulsas={tarefasAvulsas} editar={iniciarEdicao} podeEditar={podeCriar} />

      {podeCriar && <details className="card tarefas-expansivel"><summary>Cadastrar tarefa semanal</summary><form className="tarefas-card tarefas-form-semanal" onSubmit={adicionar}><label className="field"><span>Tarefa fixa</span><input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Trocar roupa de cama" required /></label><label className="field"><span>Repete toda</span><select value={diaSemana} onChange={(e) => setDiaSemana(e.target.value)}>{DIAS_FORM.map((dia) => <option key={dia.value} value={dia.value}>{dia.label}</option>)}</select></label><label className="field"><span>Período</span><select value={turno} onChange={(e) => setTurno(e.target.value)}><option value="manha">Manhã</option><option value="tarde">Tarde</option></select></label><label className="field"><span>Horário (opcional)</span><input type="time" value={horario} onChange={(e) => setHorario(e.target.value)} /></label><button className="btn btn-success" disabled={salvando}>{salvando ? "Salvando..." : "Cadastrar tarefa fixa"}</button></form></details>}
      {podeCriar && <details className="card tarefas-expansivel"><summary>Criar tarefa avulsa</summary><form className="tarefas-card tarefas-form-semanal" onSubmit={adicionarAvulsa}><label className="field"><span>Tarefa avulsa</span><input value={tituloAvulsa} onChange={(e) => setTituloAvulsa(e.target.value)} placeholder="Ex: Limpar os vidros" required /></label><label className="field"><span>Data</span><input type="date" value={dataAvulsa} onChange={(e) => setDataAvulsa(e.target.value)} required /></label><label className="field"><span>Período</span><select value={turnoAvulsa} onChange={(e) => setTurnoAvulsa(e.target.value)}><option value="manha">Manhã</option><option value="tarde">Tarde</option></select></label><label className="field"><span>Horário (opcional)</span><input type="time" value={horarioAvulsa} onChange={(e) => setHorarioAvulsa(e.target.value)} /></label><button className="btn btn-secondary" disabled={salvando}>{salvando ? "Salvando..." : "Criar tarefa avulsa"}</button></form></details>}
      {erro && <p role="alert" className="mensagem erro">{erro}</p>}
      {podeCriar && <details className="card tarefas-expansivel"><summary>Gerenciar tarefas por dia <b>{tarefas.length + tarefasAvulsas.length}</b></summary><div className="tarefas-dias-grupos">{DIAS_FORM.map((dia) => renderGrupoDia(dia, true))}</div></details>}
      {edicao && <div ref={dialogRef} className="tarefas-edicao-overlay" role="dialog" aria-modal="true" aria-label="Editar tarefa"><form className="card tarefas-edicao" onSubmit={salvarEdicao}><div className="section-header"><h2>Editar tarefa {edicao.tipo === "fixa" ? "fixa" : "avulsa"}</h2><button type="button" className="tarefas-edicao-fechar" onClick={() => setEdicao(null)} aria-label="Fechar">×</button></div><label className="field"><span>Texto da tarefa</span><input value={edicao.titulo} onChange={(e) => setEdicao({ ...edicao, titulo: e.target.value })} required /></label>{edicao.tipo === "fixa" ? <label className="field"><span>Dia da semana</span><select value={edicao.diaSemana} onChange={(e) => setEdicao({ ...edicao, diaSemana: e.target.value })}>{DIAS_FORM.map((dia) => <option key={dia.value} value={dia.value}>{dia.label}</option>)}</select></label> : <label className="field"><span>Data</span><input type="date" value={edicao.dataAgendada} onChange={(e) => setEdicao({ ...edicao, dataAgendada: e.target.value })} required /></label>}<label className="field"><span>Período</span><select value={edicao.turno} onChange={(e) => setEdicao({ ...edicao, turno: e.target.value })}><option value="manha">Manhã</option><option value="tarde">Tarde</option></select></label><label className="field"><span>Horário (opcional)</span><input type="time" value={edicao.horario} onChange={(e) => setEdicao({ ...edicao, horario: e.target.value })} /></label><div className="tarefas-edicao-acoes"><button type="submit" className="btn btn-success" disabled={salvando}>{salvando ? "Salvando..." : "Salvar alterações"}</button><button type="button" className="btn btn-muted" onClick={() => setEdicao(null)}>Cancelar</button></div></form></div>}
      {[...tarefas, ...tarefasAvulsas].some((item) => item.horario) && <section className="card tarefas-lista"><h2>Horários programados</h2><div className="tarefas-itens">{[...tarefas, ...tarefasAvulsas].filter((item) => item.horario).sort((a, b) => String(a.horario).localeCompare(String(b.horario))).map((item) => <div className="tarefas-item" key={`horario-${item.id}`}><div><strong>{item.horario} · {item.titulo}</strong><span className="tarefas-por">{item.dataAgendada ? item.dataAgendada.split("-").reverse().join("/") : DIAS_FORM.find((dia) => dia.value === Number(item.diaSemana))?.label}</span></div></div>)}</div></section>}

      <details className="card tarefas-expansivel"><summary>Rotina cadastrada <b>{tarefas.length}</b></summary>{tarefas.length ? <div className="tarefas-dias-grupos">{DIAS_FORM.map((dia) => renderGrupoDia(dia))}</div> : <p className="text-muted">Nenhuma tarefa fixa cadastrada.</p>}</details>
    </main><BottomNav activePath={rotaAtual} onNavigate={onNavigate} user={user} /></div>
  );
}
