import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";

function dataParaDate(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return valor;
  if (typeof valor.toDate === "function") return valor.toDate();
  if (typeof valor.seconds === "number") return new Date(valor.seconds * 1000);
  return null;
}

function formatarDataHora(valor) {
  const data = dataParaDate(valor);
  if (!data) return "-";
  return data.toLocaleString("pt-BR");
}

function labelDiaSemana(valor) {
  const mapa = {
    segunda: "Segunda",
    terca: "Terça",
    quarta: "Quarta",
    quinta: "Quinta",
    sexta: "Sexta",
    sabado: "Sábado",
    domingo: "Domingo",
  };
  return mapa[valor] || valor || "-";
}

function ordenarTarefas(lista) {
  return [...lista].sort((a, b) => {
    if (a.concluida !== b.concluida) return a.concluida ? 1 : -1;
    const dataA = dataParaDate(a.criadoEm);
    const dataB = dataParaDate(b.criadoEm);
    if (dataA && dataB) return dataB.getTime() - dataA.getTime();
    if (dataA) return -1;
    if (dataB) return 1;
    return (a.titulo || "").localeCompare(b.titulo || "");
  });
}

async function buscarTarefas() {
  const snapshot = await getDocs(collection(db, "tarefas"));
  const itens = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data() || {};
    itens.push({
      id: docSnap.id,
      titulo: data.titulo || docSnap.id,
      diaSemana: data.diaSemana || "",
      concluida: Boolean(data.concluida),
      solicitadoPorNome: data.solicitadoPorNome || "-",
      criadoEm: data.criadoEm || null,
      concluidaEm: data.concluidaEm || null,
    });
  });

  return itens;
}

export async function exportarPdfTarefas(tarefas) {
  const lista = Array.isArray(tarefas) ? tarefas : await buscarTarefas();
  const ordenadas = ordenarTarefas(lista);

  const pdf = new jsPDF();
  pdf.setFontSize(16);
  pdf.text("Tarefas", 14, 20);

  pdf.setFontSize(11);
  pdf.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 28);

  autoTable(pdf, {
    startY: 36,
    head: [["Tarefa", "Dia", "Status", "Solicitado por", "Criada em", "Concluída em"]],
    body: ordenadas.map((item) => [
      item.titulo,
      labelDiaSemana(item.diaSemana),
      item.concluida ? "Concluída" : "Pendente",
      item.solicitadoPorNome || "-",
      formatarDataHora(item.criadoEm),
      formatarDataHora(item.concluidaEm),
    ]),
  });

  pdf.save("Tarefas.pdf");
}

