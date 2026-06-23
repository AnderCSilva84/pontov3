import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../services/firebase";
import BottomNav from "../components/BottomNav";
import "../styles/compras.css";
import "../styles/nav.css";

const ORDEM_CATEGORIAS = [
  "Hortifruti",
  "Carnes",
  "Frios",
  "Padaria",
  "Bebidas",
  "Mercearia",
  "Limpeza",
  "Banheiro",
  "Outros",
];

function normalizarCategoria(valor) {
  return String(valor || "Outros").trim() || "Outros";
}

function ordenarCategorias(a, b) {
  const categoriaA = normalizarCategoria(a);
  const categoriaB = normalizarCategoria(b);
  const indiceA = ORDEM_CATEGORIAS.findIndex((item) => item.toLowerCase() === categoriaA.toLowerCase());
  const indiceB = ORDEM_CATEGORIAS.findIndex((item) => item.toLowerCase() === categoriaB.toLowerCase());

  if (indiceA !== -1 || indiceB !== -1) {
    if (indiceA === -1) return 1;
    if (indiceB === -1) return -1;
    if (indiceA !== indiceB) return indiceA - indiceB;
  }

  return categoriaA.localeCompare(categoriaB);
}

export default function ListaCompras({ user, onNavigate, rotaAtual }) {
  const [catalogo, setCatalogo] = useState([]);
  const [listaMercado, setListaMercado] = useState([]);
  const [selecionados, setSelecionados] = useState({});
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState({});
  const [erro, setErro] = useState("");
  const [mostrandoForm, setMostrandoForm] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novaCategoria, setNovaCategoria] = useState("");
  const [categoriaSelecionada, setCategoriaSelecionada] = useState("");
  const [modoVisualizacao, setModoVisualizacao] = useState("compras");
  const [filtroCompras, setFiltroCompras] = useState("pendentes");
  const [buscaCompras, setBuscaCompras] = useState("");
  const funcionarioId = user?.funcionarioId || user?.uid;

  useEffect(() => {
    async function carregarDados() {
      setLoading(true);
      setErro("");

      try {
        const catalogoSnap = await getDocs(collection(db, "catalogoCompras"));

        const itensCatalogo = [];
        catalogoSnap.forEach((docSnap) => {
          const data = docSnap.data() || {};
          itensCatalogo.push({
            id: docSnap.id,
            nome: data.nome || docSnap.id,
            categoria: normalizarCategoria(data.categoria),
          });
        });

        setCatalogo(itensCatalogo);
      } catch (error) {
        console.error("[LISTA][ERRO] Falha ao carregar catalogo/lista:", error);
        setErro("Nao foi possivel carregar o catalogo. Tente novamente.");
      } finally {
        setLoading(false);
      }
    }

    carregarDados();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "listaCompras"),
      (snapshot) => {
        const solicitados = {};
        const itens = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() || {};
          const solicitado = data.solicitado === undefined ? true : Boolean(data.solicitado);
          const comprado = Boolean(data.comprado);

          solicitados[docSnap.id] = solicitado;
          itens.push({
            id: docSnap.id,
            nome: data.nome || docSnap.id,
            categoria: normalizarCategoria(data.categoria),
            solicitado,
            comprado,
            solicitadoPor: data.solicitadoPor || null,
            solicitadoPorNome: data.solicitadoPorNome || "",
            criadoEm: data.criadoEm || null,
          });
        });

        setSelecionados(solicitados);
        setListaMercado(itens);
      },
      (error) => {
        console.error("[LISTA][ERRO] Falha ao observar lista:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  const catalogoPorCategoria = useMemo(() => {
    const mapa = new Map();
    catalogo.forEach((item) => {
      const categoria = normalizarCategoria(item.categoria);
      if (!mapa.has(categoria)) mapa.set(categoria, []);
      mapa.get(categoria).push(item);
    });

    return Array.from(mapa.entries())
      .sort((a, b) => ordenarCategorias(a[0], b[0]))
      .map(([categoria, itens]) => ({
        categoria,
        itens: itens.sort((a, b) => (a.nome || "").localeCompare(b.nome || "")),
      }));
  }, [catalogo]);

  const gruposFiltrados = useMemo(() => {
    if (!categoriaSelecionada) return catalogoPorCategoria;
    return catalogoPorCategoria.filter((grupo) => grupo.categoria === categoriaSelecionada);
  }, [catalogoPorCategoria, categoriaSelecionada]);

  const itensMercadoFiltrados = useMemo(() => {
    const termo = buscaCompras.trim().toLowerCase();

    return listaMercado
      .filter((item) => {
        if (filtroCompras === "pendentes") return item.solicitado && !item.comprado;
        if (filtroCompras === "comprados") return item.comprado;
        return item.solicitado || item.comprado;
      })
      .filter((item) => {
        if (!termo) return true;
        return (
          (item.nome || "").toLowerCase().includes(termo) ||
          (item.categoria || "").toLowerCase().includes(termo)
        );
      });
  }, [buscaCompras, filtroCompras, listaMercado]);

  const comprasPorCategoria = useMemo(() => {
    const mapa = new Map();

    itensMercadoFiltrados.forEach((item) => {
      const categoria = normalizarCategoria(item.categoria);
      if (!mapa.has(categoria)) mapa.set(categoria, []);
      mapa.get(categoria).push(item);
    });

    return Array.from(mapa.entries())
      .sort((a, b) => ordenarCategorias(a[0], b[0]))
      .map(([categoria, itens]) => ({
        categoria,
        itens: itens.sort((a, b) => {
          if (a.comprado !== b.comprado) return a.comprado ? 1 : -1;
          return (a.nome || "").localeCompare(b.nome || "");
        }),
      }));
  }, [itensMercadoFiltrados]);

  const resumoCompras = useMemo(() => {
    const itensAtivos = listaMercado.filter((item) => item.solicitado || item.comprado);
    const comprados = itensAtivos.filter((item) => item.comprado).length;
    const pendentes = itensAtivos.filter((item) => item.solicitado && !item.comprado).length;

    return {
      total: itensAtivos.length,
      comprados,
      pendentes,
    };
  }, [listaMercado]);

  async function atualizarItem(item, marcado) {
    const ref = doc(db, "listaCompras", item.id);
    const payloadBase = {
      nome: item.nome,
      categoria: normalizarCategoria(item.categoria),
      solicitado: marcado,
    };

    try {
      const existente = await getDoc(ref);

      if (marcado) {
        await setDoc(
          ref,
          {
            ...payloadBase,
            comprado: false,
            solicitadoPor: funcionarioId || null,
            solicitadoPorNome: user?.nome || null,
            criadoEm: serverTimestamp(),
          },
          { merge: true }
        );
        return;
      }

      if (existente.exists()) {
        await updateDoc(ref, { solicitado: false });
      } else {
        await setDoc(ref, payloadBase, { merge: true });
      }
    } catch (error) {
      console.error("[LISTA][ERRO] Falha ao atualizar item:", error);
      throw error;
    }
  }

  async function handleToggle(item) {
    const atual = Boolean(selecionados[item.id]);
    const proximo = !atual;

    setSelecionados((prev) => ({ ...prev, [item.id]: proximo }));
    setSalvando((prev) => ({ ...prev, [item.id]: true }));

    try {
      await atualizarItem(item, proximo);
    } catch {
      setSelecionados((prev) => ({ ...prev, [item.id]: atual }));
    } finally {
      setSalvando((prev) => ({ ...prev, [item.id]: false }));
    }
  }

  async function handleMarcarComprado(item, comprado) {
    setSalvando((prev) => ({ ...prev, [item.id]: true }));

    try {
      await updateDoc(doc(db, "listaCompras", item.id), {
        comprado,
        solicitado: comprado ? false : true,
      });
    } catch (error) {
      console.error("[LISTA][ERRO] Falha ao atualizar compra:", error);
      setErro("Nao foi possivel atualizar o status do item.");
    } finally {
      setSalvando((prev) => ({ ...prev, [item.id]: false }));
    }
  }

  async function handleAdicionarItem() {
    if (!novoNome.trim()) return;

    const categoriaFinal = normalizarCategoria(novaCategoria);

    try {
      const docRef = await addDoc(collection(db, "catalogoCompras"), {
        nome: novoNome.trim(),
        categoria: categoriaFinal,
      });

      setCatalogo((prev) => [
        ...prev,
        { id: docRef.id, nome: novoNome.trim(), categoria: categoriaFinal },
      ]);
      setNovoNome("");
      setNovaCategoria("");
      setMostrandoForm(false);
    } catch (error) {
      console.error("[LISTA][ERRO] Falha ao adicionar item:", error);
      setErro("Nao foi possivel adicionar o item. Tente novamente.");
    }
  }

  return (
    <div className="page-bg page-compras">
      <main className="page-shell compras-shell">
        <header className="page-header compras-header">
          <div className="page-title-row">
            <span className="page-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M6 6h14l-1.5 8H8.5L7 5H4" />
                <circle cx="9" cy="20" r="1.5" />
                <circle cx="17" cy="20" r="1.5" />
              </svg>
            </span>
            <h1>Lista de Compras</h1>
          </div>
          <p className="page-subtitle">
            {modoVisualizacao === "compras"
              ? "Modo compras para usar no mercado"
              : "Monte a lista antes de sair"}
          </p>
        </header>

        <section className="card compras-modo-switch">
          <button
            type="button"
            className={`modo-chip ${modoVisualizacao === "compras" ? "active" : ""}`}
            onClick={() => setModoVisualizacao("compras")}
          >
            Modo Compras
          </button>
          <button
            type="button"
            className={`modo-chip ${modoVisualizacao === "montar" ? "active" : ""}`}
            onClick={() => setModoVisualizacao("montar")}
          >
            Montar Lista
          </button>
        </section>

        {modoVisualizacao === "compras" && (
          <>
            <section className="card compras-resumo">
              <div>
                <span className="compras-resumo-label">Restantes</span>
                <strong>{resumoCompras.pendentes}</strong>
              </div>
              <div>
                <span className="compras-resumo-label">Comprados</span>
                <strong>{resumoCompras.comprados}</strong>
              </div>
              <div>
                <span className="compras-resumo-label">Total</span>
                <strong>{resumoCompras.total}</strong>
              </div>
            </section>

            <section className="card compras-toolbar">
              <div className="compras-filtro-tabs" role="tablist" aria-label="Filtrar compras">
                <button
                  type="button"
                  className={`filtro-tab ${filtroCompras === "pendentes" ? "active" : ""}`}
                  onClick={() => setFiltroCompras("pendentes")}
                >
                  Pendentes
                </button>
                <button
                  type="button"
                  className={`filtro-tab ${filtroCompras === "comprados" ? "active" : ""}`}
                  onClick={() => setFiltroCompras("comprados")}
                >
                  Comprados
                </button>
                <button
                  type="button"
                  className={`filtro-tab ${filtroCompras === "todos" ? "active" : ""}`}
                  onClick={() => setFiltroCompras("todos")}
                >
                  Todos
                </button>
              </div>

              <label className="field busca-field">
                <span>Buscar item</span>
                <input
                  type="search"
                  value={buscaCompras}
                  onChange={(event) => setBuscaCompras(event.target.value)}
                  placeholder="Ex: arroz, detergente, carnes"
                />
              </label>
            </section>
          </>
        )}

        {modoVisualizacao === "montar" && (
          <>
            <button
              type="button"
              className="btn btn-success btn-add-item"
              onClick={() => setMostrandoForm((prev) => !prev)}
            >
              + Adicionar item
            </button>

            {mostrandoForm && (
              <section className="card add-item-card">
                <label className="field">
                  <span>Item</span>
                  <input
                    type="text"
                    value={novoNome}
                    onChange={(event) => setNovoNome(event.target.value)}
                    placeholder="Nome do item"
                  />
                </label>
                <label className="field">
                  <span>Categoria</span>
                  <input
                    type="text"
                    value={novaCategoria}
                    onChange={(event) => setNovaCategoria(event.target.value)}
                    placeholder="Ex: Banheiro"
                  />
                </label>
                <div className="add-item-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setMostrandoForm(false)}
                  >
                    Cancelar
                  </button>
                  <button type="button" className="btn btn-success" onClick={handleAdicionarItem}>
                    Salvar
                  </button>
                </div>
              </section>
            )}

            {!loading && catalogoPorCategoria.length > 0 && (
              <section className="card lista-filtros">
                <label className="field">
                  <span>Categoria</span>
                  <select
                    value={categoriaSelecionada}
                    onChange={(event) => setCategoriaSelecionada(event.target.value)}
                  >
                    <option value="">Todas as categorias</option>
                    {catalogoPorCategoria.map((grupo) => (
                      <option key={grupo.categoria} value={grupo.categoria}>
                        {grupo.categoria}
                      </option>
                    ))}
                  </select>
                </label>
              </section>
            )}
          </>
        )}

        {loading && <p className="text-muted">Carregando catalogo...</p>}
        {erro && <p className="mensagem erro">{erro}</p>}

        {!loading && modoVisualizacao === "montar" && catalogoPorCategoria.length === 0 && (
          <p className="text-muted">Nenhum item encontrado no catalogo.</p>
        )}

        {!loading && modoVisualizacao === "montar" &&
          gruposFiltrados.map((grupo) => (
            <section key={grupo.categoria} className="card compras-categoria">
              <h2>{grupo.categoria}</h2>
              <div className="itens-lista">
                {grupo.itens.map((item) => (
                  <label key={item.id} className="item-checkbox">
                    <input
                      type="checkbox"
                      checked={Boolean(selecionados[item.id])}
                      onChange={() => handleToggle(item)}
                      disabled={Boolean(salvando[item.id])}
                    />
                    <span className="check-custom" aria-hidden="true" />
                    <span className="item-nome">{item.nome}</span>
                  </label>
                ))}
              </div>
            </section>
          ))}

        {!loading && modoVisualizacao === "compras" && comprasPorCategoria.length === 0 && (
          <section className="card compras-vazio">
            <h2>Nada por aqui</h2>
            <p className="text-muted">
              {resumoCompras.total === 0
                ? "Monte a lista primeiro para aparecer no modo compras."
                : "Nenhum item combina com o filtro atual."}
            </p>
          </section>
        )}

        {!loading && modoVisualizacao === "compras" &&
          comprasPorCategoria.map((grupo) => (
            <section key={grupo.categoria} className="card compras-categoria compras-categoria-mercado">
              <div className="compras-categoria-head">
                <h2>{grupo.categoria}</h2>
                <span>{grupo.itens.filter((item) => !item.comprado).length} restantes</span>
              </div>

              <div className="compras-mercado-lista">
                {grupo.itens.map((item) => (
                  <article
                    key={item.id}
                    className={`compra-mercado-item ${item.comprado ? "comprado" : "pendente"}`}
                  >
                    <div className="compra-mercado-info">
                      <strong>{item.nome}</strong>
                      {item.solicitadoPorNome && (
                        <span>Pedido por {item.solicitadoPorNome}</span>
                      )}
                    </div>

                    <button
                      type="button"
                      className={`compra-mercado-acao ${item.comprado ? "desfazer" : "confirmar"}`}
                      onClick={() => handleMarcarComprado(item, !item.comprado)}
                      disabled={Boolean(salvando[item.id])}
                    >
                      {salvando[item.id]
                        ? "Salvando..."
                        : item.comprado
                        ? "Desfazer"
                        : "Comprado"}
                    </button>
                  </article>
                ))}
              </div>
            </section>
          ))}
      </main>

      <BottomNav activePath={rotaAtual} onNavigate={onNavigate} user={user} />
    </div>
  );
}
