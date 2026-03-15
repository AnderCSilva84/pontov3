import { useEffect, useState } from "react";
import { observeAuth } from "./services/auth";
import Ponto from "./pages/Ponto";
import ListaCompras from "./pages/ListaCompras";
import Tarefas from "./pages/Tarefas";
import Admin from "./pages/Admin";
import "./styles/App.css";

function normalizarRota(caminho) {
  if (!caminho || caminho === "/") return "/ponto";
  return caminho;
}

function App() {
  const [user, setUser] = useState(undefined);
  const [rotaAtual, setRotaAtual] = useState(normalizarRota(window.location.pathname));

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

  if (!user) {
    if (rotaAtual === "/admin") {
      return <Admin user={null} onNavigate={navegarPara} rotaAtual={rotaAtual} />;
    }

    if (rotaAtual === "/lista-compras") {
      return <ListaCompras user={null} onNavigate={navegarPara} rotaAtual={rotaAtual} />;
    }

    if (rotaAtual === "/tarefas") {
      return <Tarefas user={null} onNavigate={navegarPara} rotaAtual={rotaAtual} />;
    }

    return <Ponto user={null} onNavigate={navegarPara} rotaAtual={rotaAtual} />;
  }

  if (rotaAtual === "/lista-compras") {
    return <ListaCompras user={user} onNavigate={navegarPara} rotaAtual={rotaAtual} />;
  }

  if (rotaAtual === "/tarefas") {
    return <Tarefas user={user} onNavigate={navegarPara} rotaAtual={rotaAtual} />;
  }

  if (rotaAtual === "/admin") {
    return <Admin user={user} onNavigate={navegarPara} rotaAtual={rotaAtual} />;
  }

  return <Ponto user={user} onNavigate={navegarPara} rotaAtual={rotaAtual} />;
}

export default App;
