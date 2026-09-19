import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, serverTimestamp, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "../services/firebase";
import BottomNav from "../components/BottomNav";
import { canCreateTasks } from "../utils/roles";
import { dataIsoLocal, feriadosBrasil } from "../utils/feriados";
import "../styles/tarefas.css";
import "../styles/nav.css";

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DIAS_FORM = [
  { value: 1, label: "Segunda-feira" }, { value: 2, label: "Terça-feira" },
  { value: 3, label: "Quarta-feira" }, { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" }, { value: 6, label: "Sábado" },
];
function tituloMes(data) { return data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }); }

export default function Tarefas({ user, onNavigate, rotaAtual }) {
  const podeCriar = canCreateTasks(user);
  const [mes, setMes] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [titulo, setTitulo] = useState("");
  const [diaSemana, setDiaSemana] = useState(1);
  const [turno, setTurno] = useState("manha");
  const [horario, setHorario] = useState("");
  const [tarefas, setTarefas] = useState([]);
  const [tarefasAvulsas, setTarefasAvulsas] = useState([]);
  const [tituloAvulsa, setTituloAvulsa] = useState("");
  const [dataAvulsa, setDataAvulsa] = useState(dataIsoLocal());
  const [turnoAvulsa, setTurnoAvulsa] = useState("manha");
  const [horarioAvulsa, setHorarioAvulsa] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [edicao, setEdicao] = useState(null);

  useEffect(() => {
    if (!user) return undefined;
    return onSnapshot(collection(db, "tarefasSemanais"), (snapshot) => {
      setTarefas(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })).filter((item) => item.ativa !== false));
    }, () => setErro("Não foi possível carregar as tarefas semanais."));
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;
    return onSnapshot(collection(db, "tarefas"), (snapshot) => {
      setTarefasAvulsas(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })).filter((item) => !item.concluida));
    }, () => setErro("Não foi possível carregar as tarefas avulsas."));
  }, [user]);

  const diasCalendario = useMemo(() => {
    const ano = mes.getFullYear(), numeroMes = mes.getMonth();
    const primeiro = new Date(ano, numeroMes, 1), ultimo = new Date(ano, numeroMes + 1, 0);
    const feriados = feriadosBrasil(ano), celulas = [];
    for (let i = 0; i < primeiro.getDay(); i += 1) celulas.push(null);
    for (let dia = 1; dia <= ultimo.getDate(); dia += 1) {
      const data = new Date(ano, numeroMes, dia), dataKey = dataIsoLocal(data);
      celulas.push({ dia, dataKey, domingo: data.getDay() === 0, hoje: dataKey === dataIsoLocal(), feriado: feriados[dataKey] || "", tarefas: tarefas.filter((item) => Number(item.diaSemana) === data.getDay()), avulsas: tarefasAvulsas.filter((item) => item.dataAgendada === dataKey) });
    }
    return celulas;
  }, [mes, tarefas, tarefasAvulsas]);

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
  function mudarMes(delta) { setMes((atual) => new Date(atual.getFullYear(), atual.getMonth() + delta, 1)); }

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
    if (!podeCriar) return;
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
      <header className="page-header"><div className="page-title-row"><span className="page-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg></span><h1>Tarefas semanais</h1></div><p className="page-subtitle">Rotina fixa, feriados e dias úteis em um só lugar</p></header>
      {podeCriar && <form className="card tarefas-card tarefas-form-semanal" onSubmit={adicionar}><label className="field"><span>Tarefa fixa</span><input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Trocar roupa de cama" required /></label><label className="field"><span>Repete toda</span><select value={diaSemana} onChange={(e) => setDiaSemana(e.target.value)}>{DIAS_FORM.map((dia) => <option key={dia.value} value={dia.value}>{dia.label}</option>)}</select></label><label className="field"><span>Período</span><select value={turno} onChange={(e) => setTurno(e.target.value)}><option value="manha">Manhã</option><option value="tarde">Tarde</option></select></label><label className="field"><span>Horário (opcional)</span><input type="time" value={horario} onChange={(e) => setHorario(e.target.value)} /></label><button className="btn btn-success" disabled={salvando}>{salvando ? "Salvando..." : "Cadastrar tarefa fixa"}</button></form>}
      {podeCriar && <form className="card tarefas-card tarefas-form-semanal" onSubmit={adicionarAvulsa}><label className="field"><span>Tarefa avulsa</span><input value={tituloAvulsa} onChange={(e) => setTituloAvulsa(e.target.value)} placeholder="Ex: Limpar os vidros" required /></label><label className="field"><span>Data</span><input type="date" value={dataAvulsa} onChange={(e) => setDataAvulsa(e.target.value)} required /></label><label className="field"><span>Período</span><select value={turnoAvulsa} onChange={(e) => setTurnoAvulsa(e.target.value)}><option value="manha">Manhã</option><option value="tarde">Tarde</option></select></label><label className="field"><span>Horário (opcional)</span><input type="time" value={horarioAvulsa} onChange={(e) => setHorarioAvulsa(e.target.value)} /></label><button className="btn btn-secondary" disabled={salvando}>{salvando ? "Salvando..." : "Criar tarefa avulsa"}</button></form>}
      {erro && <p className="mensagem erro">{erro}</p>}
      {podeCriar && <section className="card tarefas-lista"><h2>Gerenciar tarefas</h2><div className="tarefas-itens">{[...tarefas.map((item) => ({ ...item, tipoEdicao: "fixa" })), ...tarefasAvulsas.map((item) => ({ ...item, tipoEdicao: "avulsa" }))].map((item) => <div className="tarefas-item" key={`gerenciar-${item.tipoEdicao}-${item.id}`}><div><strong>{item.titulo}</strong><span className="tarefas-por">{item.tipoEdicao === "fixa" ? `Fixa · ${DIAS_FORM.find((dia) => dia.value === Number(item.diaSemana))?.label || "Dia não informado"}` : `Avulsa · ${String(item.dataAgendada || "").split("-").reverse().join("/")}`}{item.horario ? ` · ${item.horario}` : ""}</span></div><button type="button" className="btn btn-secondary tarefas-concluir" onClick={() => iniciarEdicao(item, item.tipoEdicao)}>Editar</button></div>)}</div></section>}
      {edicao && <div className="tarefas-edicao-overlay" role="dialog" aria-modal="true" aria-label="Editar tarefa"><form className="card tarefas-edicao" onSubmit={salvarEdicao}><div className="section-header"><h2>Editar tarefa {edicao.tipo === "fixa" ? "fixa" : "avulsa"}</h2><button type="button" className="tarefas-edicao-fechar" onClick={() => setEdicao(null)} aria-label="Fechar">×</button></div><label className="field"><span>Texto da tarefa</span><input value={edicao.titulo} onChange={(e) => setEdicao({ ...edicao, titulo: e.target.value })} required /></label>{edicao.tipo === "fixa" ? <label className="field"><span>Dia da semana</span><select value={edicao.diaSemana} onChange={(e) => setEdicao({ ...edicao, diaSemana: e.target.value })}>{DIAS_FORM.map((dia) => <option key={dia.value} value={dia.value}>{dia.label}</option>)}</select></label> : <label className="field"><span>Data</span><input type="date" value={edicao.dataAgendada} onChange={(e) => setEdicao({ ...edicao, dataAgendada: e.target.value })} required /></label>}<label className="field"><span>Período</span><select value={edicao.turno} onChange={(e) => setEdicao({ ...edicao, turno: e.target.value })}><option value="manha">Manhã</option><option value="tarde">Tarde</option></select></label><label className="field"><span>Horário (opcional)</span><input type="time" value={edicao.horario} onChange={(e) => setEdicao({ ...edicao, horario: e.target.value })} /></label><div className="tarefas-edicao-acoes"><button type="submit" className="btn btn-success" disabled={salvando}>{salvando ? "Salvando..." : "Salvar alterações"}</button><button type="button" className="btn btn-muted" onClick={() => setEdicao(null)}>Cancelar</button></div></form></div>}
      {[...tarefas, ...tarefasAvulsas].some((item) => item.horario) && <section className="card tarefas-lista"><h2>Horários programados</h2><div className="tarefas-itens">{[...tarefas, ...tarefasAvulsas].filter((item) => item.horario).sort((a, b) => String(a.horario).localeCompare(String(b.horario))).map((item) => <div className="tarefas-item" key={`horario-${item.id}`}><div><strong>{item.horario} · {item.titulo}</strong><span className="tarefas-por">{item.dataAgendada ? item.dataAgendada.split("-").reverse().join("/") : DIAS_FORM.find((dia) => dia.value === Number(item.diaSemana))?.label}</span></div></div>)}</div></section>}
      <section className="card calendario-card"><div className="calendario-topo"><button type="button" onClick={() => mudarMes(-1)} aria-label="Mês anterior">‹</button><h2>{tituloMes(mes)}</h2><button type="button" onClick={() => mudarMes(1)} aria-label="Próximo mês">›</button></div><div className="calendario-grid calendario-semana">{DIAS.map((dia) => <span key={dia}>{dia}</span>)}</div><div className="calendario-grid calendario-dias">{diasCalendario.map((item, index) => item ? <article key={item.dataKey} className={`calendario-dia ${item.domingo ? "nao-util" : ""} ${item.feriado ? "feriado" : ""} ${item.hoje ? "hoje" : ""}`}><b>{item.dia}</b>{item.feriado && <><small title={item.feriado}>{item.feriado}</small><span className="calendario-folga">Folga</span></>}{!item.domingo && !item.feriado && (item.tarefas.length > 0 || item.avulsas.length > 0) && <div className="calendario-turno"><em>Manhã</em>{[...item.tarefas, ...item.avulsas].filter((tarefa) => !tarefa.turno || tarefa.turno === "manha").map((tarefa) => <span className={`calendario-tarefa manha ${tarefa.dataAgendada ? "avulsa" : ""}`} key={tarefa.id}>{tarefa.titulo}</span>)}<em>Tarde</em>{[...item.tarefas, ...item.avulsas].filter((tarefa) => tarefa.turno === "tarde").map((tarefa) => <span className={`calendario-tarefa tarde ${tarefa.dataAgendada ? "avulsa" : ""}`} key={tarefa.id}>{tarefa.titulo}</span>)}</div>}</article> : <span className="calendario-vazio" key={`vazio-${index}`} />)}</div><div className="calendario-legenda"><span><i className="legenda-feriado" /> Feriado / folga</span><span><i className="legenda-domingo" /> Domingo (não útil)</span></div></section>
      <section className="card tarefas-lista"><h2>Rotina cadastrada</h2>{tarefas.length ? <div className="tarefas-itens">{[...tarefas].sort((a,b) => a.diaSemana-b.diaSemana).map((tarefa) => <div className="tarefas-item" key={tarefa.id}><div><strong>{tarefa.titulo}</strong><span className="tarefas-por">Toda {DIAS_FORM.find((dia) => dia.value === Number(tarefa.diaSemana))?.label} · {tarefa.turno === "tarde" ? "Tarde" : "Manhã"}</span></div>{podeCriar && <button className="btn btn-danger tarefas-concluir" onClick={() => excluirTarefaFixa(tarefa)}>Excluir</button>}</div>)}</div> : <p className="text-muted">Nenhuma tarefa fixa cadastrada.</p>}</section>
    </main><BottomNav activePath={rotaAtual} onNavigate={onNavigate} user={user} /></div>
  );
}
