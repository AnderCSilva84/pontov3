import { useEffect, useState } from "react";
import { observeAuth } from "./services/auth";
import Ponto from "./pages/Ponto";
import ListaCompras from "./pages/ListaCompras";
import Tarefas from "./pages/Tarefas";
import Admin from "./pages/Admin";
import Financeiro from "./pages/Financeiro";
import { canAccessPonto } from "./utils/roles";
import "./styles/App.css";

const ROTAS_VALIDAS = new Set(["/ponto", "/lista-compras", "/tarefas", "/admin", "/admin/financeiro"]);

function normalizarRota(caminho) {
  if (!caminho || caminho === "/") return "/ponto";
  return caminho.replace(/\/+$/, "") || "/ponto";
}

function PaginaNaoEncontrada({ onNavigate }) {
  return <div className="page-bg"><main className="page-shell"><section className="card"><h1>Página não encontrada</h1><p className="text-muted">O endereço acessado não existe neste aplicativo.</p><button type="button" className="btn btn-primary" onClick={() => onNavigate("/ponto")}>Ir para o início</button></section></main></div>;
}

function App() {
  const [user, setUser] = useState(undefined);
  const [rotaAtual, setRotaAtual] = useState(normalizarRota(window.location.pathname));
  const rotaEfetiva = user && !canAccessPonto(user) && rotaAtual === "/ponto" ? "/admin" : rotaAtual;

  useEffect(() => {
    if (window.location.pathname === "/") {
      window.history.replaceState({}, "", "/ponto");
    }
  }, []);

  useEffect(() => {
    const unsubscribe = observeAuth(setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    function handlePopState() {
      const rota = normalizarRota(window.location.pathname);
      if (window.location.pathname === "/") {
        window.history.replaceState({}, "", rota);
      }
      setRotaAtual(rota);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function navegarPara(caminho) {
    const destino = normalizarRota(caminho);
    if (window.location.pathname === destino) return;
    window.history.pushState({}, "", destino);
    setRotaAtual(destino);
  }

  if (user === undefined) return <p>Carregando...</p>;

  if (!ROTAS_VALIDAS.has(rotaEfetiva)) {
    return <PaginaNaoEncontrada onNavigate={navegarPara} />;
  }

  if (!user) {
    if (rotaEfetiva === "/admin/financeiro") {
      return <Admin user={null} onNavigate={navegarPara} rotaAtual="/admin" />;
    }
    if (rotaEfetiva === "/admin") {
      return <Admin user={null} onNavigate={navegarPara} rotaAtual={rotaEfetiva} />;
    }

    if (rotaEfetiva === "/lista-compras") {
      return <ListaCompras user={null} onNavigate={navegarPara} rotaAtual={rotaEfetiva} />;
    }

    if (rotaEfetiva === "/tarefas") {
      return <Tarefas user={null} onNavigate={navegarPara} rotaAtual={rotaEfetiva} />;
    }

    return <Ponto user={null} onNavigate={navegarPara} rotaAtual={rotaEfetiva} />;
  }

  if (rotaEfetiva === "/lista-compras") {
    return <ListaCompras user={user} onNavigate={navegarPara} rotaAtual={rotaEfetiva} />;
  }

  if (rotaEfetiva === "/tarefas") {
    return <Tarefas user={user} onNavigate={navegarPara} rotaAtual={rotaEfetiva} />;
  }

  if (rotaEfetiva === "/admin") {
    return <Admin user={user} onNavigate={navegarPara} rotaAtual={rotaEfetiva} />;
  }

  if (rotaEfetiva === "/admin/financeiro") {
    return <Financeiro user={user} onNavigate={navegarPara} rotaAtual={rotaEfetiva} />;
  }

  return <Ponto user={user} onNavigate={navegarPara} rotaAtual={rotaEfetiva} />;
}

export default App;
