import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";

function ordenarItens(itens) {
  return [...itens].sort((a, b) => {
    const cat = (a.categoria || "").localeCompare(b.categoria || "");
    if (cat !== 0) return cat;
    return (a.nome || "").localeCompare(b.nome || "");
  });
}

export async function exportarPdfListaCompras() {
  const [listaSnap, funcionariosSnap] = await Promise.all([
    getDocs(collection(db, "listaCompras")),
    getDocs(collection(db, "funcionarios")),
  ]);

  const mapaFuncionarios = {};
  funcionariosSnap.forEach((docSnap) => {
    const data = docSnap.data() || {};
    mapaFuncionarios[docSnap.id] = data.nome || docSnap.id;
  });

  const itens = [];
  listaSnap.forEach((doc) => {
    const data = doc.data() || {};
    if (data.solicitado === false || data.comprado === true) return;

    itens.push({
      nome: data.nome || doc.id,
      categoria: data.categoria || "Outros",
      solicitadoPor:
        data.solicitadoPorNome ||
        mapaFuncionarios[data.solicitadoPor] ||
        data.solicitadoPor ||
        "-",
    });
  });

  const ordenados = ordenarItens(itens);

  const pdf = new jsPDF();
  pdf.setFontSize(16);
  pdf.text("Lista de Compras", 14, 20);

  pdf.setFontSize(11);
  pdf.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 28);

  autoTable(pdf, {
    startY: 36,
    head: [["Item", "Categoria", "Solicitado por"]],
    body: ordenados.map((item) => [item.nome, item.categoria, item.solicitadoPor]),
  });

  pdf.save("Lista_Compras.pdf");
}
