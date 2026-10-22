import NoBolsoConnection from "./pages/NoBolsoConnection";
import { useEffect, useState } from "react";
import CadastroGrupo from './pages/CadastroGrupo';
import MeusComprovantes from './pages/MeusComprovantes';
import { observeAuth } from "./services/auth";
import Ponto from "./pages/Ponto";
import ListaCompras from "./pages/ListaCompras";
import Tarefas from "./pages/Tarefas";
import Lembretes from './pages/Lembretes';
import Admin from "./pages/Admin";
import Financeiro from "./pages/Financeiro";
import NotificacoesPush from "./components/NotificacoesPush";
import CarregandoGatinho from "./components/CarregandoGatinho";
import { normalizeRole, ROLE_ADMIN } from "./utils/roles";
import { resolverRotaUsuario, ehRotaCompras } from "./utils/rotas";
import "./styles/App.css";

const ROTAS_VALIDAS = new Set(["/ponto", "/lista-compras", "/tarefas", "/lembretes", "/admin", "/admin/financeiro"]);

function normalizarRota(caminho) {
  if (!caminho || caminho === "/") return "/ponto";
  return caminho.replace(/\/+$/, "") || "/ponto";
}

function PaginaNaoEncontrada({ onNavigate }) {
  return <div className="page-bg"><main className="page-shell"><section className="card"><h1>Página não encontrada</h1><p className="text-muted">O endereço acessado não existe neste aplicativo.</p><button type="button" className="btn btn-primary" onClick={() => onNavigate("/ponto")}>Ir para o início</button></section></main></div>;
}

function AppConteudo({ user }) {
  const [rotaAtual, setRotaAtual] = useState(normalizarRota(window.location.pathname));
  const role = normalizeRole(user?.role);
  const rotaEfetiva = resolverRotaUsuario(user, rotaAtual);

  useEffect(() => {
    if (window.location.pathname === "/") {
      window.history.replaceState({}, "", "/ponto");
    }
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
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  if (user === undefined) return <CarregandoGatinho />;
  if (rotaAtual === '/cadastro') return <CadastroGrupo user={user} onNavigate={navegarPara} />;
  if (rotaAtual === '/meus-comprovantes' && user?.grupoId && role === 'funcionario') return <MeusComprovantes user={user} onNavigate={navegarPara} />;
  if (rotaAtual === "/integracoes/no-bolso") return <NoBolsoConnection user={user} onNavigate={navegarPara} />;

  if (user && role !== ROLE_ADMIN && rotaEfetiva === "/admin/financeiro") {
    return <Admin user={user} onNavigate={navegarPara} rotaAtual="/admin" />;
  }

  if (!ROTAS_VALIDAS.has(rotaEfetiva) && !ehRotaCompras(rotaEfetiva)) {
    return <PaginaNaoEncontrada onNavigate={navegarPara} />;
  }

  if (!user) {
    if (rotaEfetiva === "/admin/financeiro") {
      return <Admin user={null} onNavigate={navegarPara} rotaAtual="/admin" />;
    }
    if (rotaEfetiva === "/admin") {
      return <Admin user={null} onNavigate={navegarPara} rotaAtual={rotaEfetiva} />;
    }

    if (ehRotaCompras(rotaEfetiva)) {
      return <ListaCompras user={null} onNavigate={navegarPara} rotaAtual={rotaEfetiva} />;
    }

    if (rotaEfetiva === "/tarefas") {
      return <Tarefas user={null} onNavigate={navegarPara} rotaAtual={rotaEfetiva} />;
    }

    return <Ponto user={null} onNavigate={navegarPara} rotaAtual={rotaEfetiva} />;
  }

  if (rotaEfetiva === '/lembretes') return <Lembretes key={user.uid} user={user} onNavigate={navegarPara} />;
  if (ehRotaCompras(rotaEfetiva)) {
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

export default function App() {
  const [user, setUser] = useState(undefined);
  useEffect(() => observeAuth(setUser), []);
  const chave = `${user?.uid || 'visitante'}:${user?.grupoId || 'legado'}`;
  return <>{user && !(import.meta.env.DEV && import.meta.env.MODE === 'compras-test') && <NotificacoesPush key={chave} uid={user.uid} />}<AppConteudo key={chave} user={user} /></>;
}
