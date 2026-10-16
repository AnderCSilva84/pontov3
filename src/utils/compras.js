export const ORDEM_CATEGORIAS = ["Hortifruti", "Carnes", "Frios", "Padaria", "Bebidas", "Mercearia", "Limpeza", "Banheiro", "Outros"];
export function normalizarCategoria(valor) {
  return String(valor || "Outros").trim() || "Outros";
}
export function ordenarCategorias(a, b) {
  const aa = normalizarCategoria(a); const bb = normalizarCategoria(b);
  const ia = ORDEM_CATEGORIAS.findIndex((item) => item.toLowerCase() === aa.toLowerCase());
  const ib = ORDEM_CATEGORIAS.findIndex((item) => item.toLowerCase() === bb.toLowerCase());
  if (ia !== ib && (ia !== -1 || ib !== -1)) return ia === -1 ? 1 : ib === -1 ? -1 : ia - ib;
  return aa.localeCompare(bb, "pt-BR");
}
export function itensPendentesParaCompartilhar(lista) {
  return lista.filter((item) => item.solicitado !== false && !item.comprado).map((item) => ({ nome: String(item.nome || "Item"), categoria: normalizarCategoria(item.categoria) })).sort((a, b) => ordenarCategorias(a.categoria, b.categoria) || a.nome.localeCompare(b.nome, "pt-BR"));
}
