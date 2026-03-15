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

export default function ListaCompras({ user, onNavigate, rotaAtual }) {
  const [catalogo, setCatalogo] = useState([]);
  const [selecionados, setSelecionados] = useState({});
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState({});
  const [erro, setErro] = useState("");
  const [mostrandoForm, setMostrandoForm] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novaCategoria, setNovaCategoria] = useState("");
  const [categoriaSelecionada, setCategoriaSelecionada] = useState("");
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
            categoria: data.categoria || "Outros",
          });
        });

        setCatalogo(itensCatalogo);
      } catch (error) {
        console.error("[LISTA][ERRO] Falha ao carregar catalogo/lista:", error);
        setErro("Não foi possível carregar o catálogo. Tente novamente.");
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
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() || {};
          solicitados[docSnap.id] =
            data.solicitado === undefined ? true : Boolean(data.solicitado);
        });
        setSelecionados(solicitados);
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
      const categoria = item.categoria || "Outros";
      if (!mapa.has(categoria)) mapa.set(categoria, []);
      mapa.get(categoria).push(item);
    });

    return Array.from(mapa.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([categoria, itens]) => ({
        categoria,
        itens: itens.sort((a, b) => (a.nome || "").localeCompare(b.nome || "")),
      }));
  }, [catalogo]);

  const gruposFiltrados = useMemo(() => {
    if (!categoriaSelecionada) return catalogoPorCategoria;
    return catalogoPorCategoria.filter((grupo) => grupo.categoria === categoriaSelecionada);
  }, [catalogoPorCategoria, categoriaSelecionada]);

  async function atualizarItem(item, marcado) {
    const ref = doc(db, "listaCompras", item.id);
    const payloadBase = {
      nome: item.nome,
      categoria: item.categoria,
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
    } catch (error) {
      setSelecionados((prev) => ({ ...prev, [item.id]: atual }));
    } finally {
      setSalvando((prev) => ({ ...prev, [item.id]: false }));
    }
  }

  async function handleAdicionarItem() {
    if (!novoNome.trim()) return;

    const categoriaFinal = novaCategoria.trim() || "Outros";

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
      setErro("Não foi possível adicionar o item. Tente novamente.");
    }
  }

  return (
    <div className="page-bg page-compras">
      <main className="page-shell compras-shell">
        <header className="page-header">
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
          <p className="page-subtitle">Selecionar itens</p>
        </header>

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
              <button type="button" className="btn btn-secondary" onClick={() => setMostrandoForm(false)}>
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

        {loading && <p className="text-muted">Carregando catálogo...</p>}
        {erro && <p className="mensagem erro">{erro}</p>}

        {!loading && catalogoPorCategoria.length === 0 && (
          <p className="text-muted">Nenhum item encontrado no catálogo.</p>
        )}

        {!loading &&
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
      </main>

      <BottomNav activePath={rotaAtual} onNavigate={onNavigate} />
    </div>
  );
}
