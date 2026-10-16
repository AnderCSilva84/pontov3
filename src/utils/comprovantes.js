const mesValido = (valor) => typeof valor === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(valor);

function mesDoCadastro(item) {
  if (mesValido(item.mesReferencia)) return item.mesReferencia;
  try {
    const data = item.criadoEm?.toDate?.() ?? (item.criadoEm ? new Date(item.criadoEm) : null);
    if (!data || !Number.isFinite(data.getTime())) return "sem-mes";
    const partes = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza", year: "numeric", month: "2-digit" }).formatToParts(data).map(({ type, value }) => [type, value]));
    return `${partes.year}-${partes.month}`;
  } catch { return "sem-mes"; }
}

export function agruparComprovantes(recibos, documentos) {
  const grupos = new Map();
  const adicionar = (item, categoria, mes) => {
    if (!grupos.has(mes)) grupos.set(mes, []);
    grupos.get(mes).push({ item, categoria, chave: `${categoria}:${item.id}` });
  };
  recibos.forEach((item) => {
    const pagamento = typeof item.dataPagamento === "string" ? item.dataPagamento.slice(0, 7) : "";
    adicionar(item, "recibo", mesValido(pagamento) ? pagamento : mesValido(item.competenciaMes) ? item.competenciaMes : "sem-mes");
  });
  documentos.forEach((item) => adicionar(item, "documento", mesDoCadastro(item)));
  return [...grupos].sort(([a], [b]) => a === "sem-mes" ? 1 : b === "sem-mes" ? -1 : b.localeCompare(a)).map(([mes, itens]) => ({
    mes, itens: itens.sort((a, b) => String(b.item.dataPagamento || "").localeCompare(String(a.item.dataPagamento || "")) || String(a.item.titulo || "").localeCompare(String(b.item.titulo || ""), "pt-BR")),
  }));
}

export function nomeMesComprovante(mes) {
  if (!mesValido(mes)) return "Sem mês informado";
  const [ano, numeroMes] = mes.split("-").map(Number);
  const nome = new Date(ano, numeroMes - 1, 15).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return nome[0].toUpperCase() + nome.slice(1);
}

export function urlComprovante(valor) {
  try { const url = new URL(valor); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}

export function destinosCompartilhamento(titulo, url) {
  const segura = urlComprovante(url);
  if (!segura) throw new Error("O comprovante não possui um link válido.");
  return { whatsapp: `https://wa.me/?text=${encodeURIComponent(`${titulo}\n${segura}`)}`, email: `mailto:?subject=${encodeURIComponent(titulo)}&body=${encodeURIComponent(`${titulo}\n\n${segura}`)}` };
}

export async function compartilharPdfNativo(arquivo, navegador = navigator) {
  if (!arquivo || !navegador.share || !navegador.canShare?.({ files: [arquivo] })) return false;
  await navegador.share({ files: [arquivo], title: arquivo.name });
  return true;
}
