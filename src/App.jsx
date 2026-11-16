import AcessoRecurso from './components/AcessoRecurso';
import AvisosNovosProvider from './components/AvisosNovosProvider';
import {SessaoContext} from './components/ui/SessaoContext';
import NotificacoesAndroid from './components/NotificacoesAndroid';
import RotaCarregamento from './components/RotaCarregamento';
import {androidPush as androidPushDisponivel} from './services/pushNativo';
import { lazy, Suspense, useEffect, useState } from "react";
import { observeAuth } from "./services/auth";
import Ponto from "./pages/Ponto";
import NotificacoesPush from "./components/NotificacoesPush";
import CarregandoGatinho from "./components/CarregandoGatinho";
import { normalizeRole, ROLE_ADMIN } from "./utils/roles";
import { resolverRotaUsuario, ehRotaCompras } from "./utils/rotas";
import "./styles/App.css";
import {registrarShell} from './services/appShell';
import {nativo,recursosWeb} from './services/plataforma';
import {conectarCicloMobile} from './services/cicloMobile';
import {ambiente} from './services/firebase';
import {App as AppNativo} from '@capacitor/app';

const androidPush = () => !ambiente.emuladores && androidPushDisponivel();

const NoBolsoConnection=lazy(()=>import('./pages/NoBolsoConnection'));
const CadastroGrupo=lazy(()=>import('./pages/CadastroGrupo'));
const Conta=lazy(()=>import('./pages/Conta'));
const Planos=lazy(()=>import('./pages/Planos'));
const Demonstracao=lazy(()=>import('./pages/Demonstracao'));
const RecuperarSenha=lazy(()=>import('./pages/RecuperarSenha'));
const MeusComprovantes=lazy(()=>import('./pages/MeusComprovantes'));
const ListaCompras=lazy(()=>import('./pages/ListaCompras'));
const Tarefas=lazy(()=>import('./pages/Tarefas'));
const Avisos=lazy(()=>import('./pages/Avisos'));
const Lembretes=lazy(()=>import('./pages/Lembretes'));
const Admin=lazy(()=>import('./pages/Admin'));
const HistoricoContabil=lazy(()=>import('./pages/HistoricoContabil'));
const Financeiro=lazy(()=>import('./pages/Financeiro'));
const Alimentacao=lazy(()=>import('./pages/Alimentacao'));

const ROTAS_VALIDAS = new Set(["/ponto", "/alimentacao", "/lista-compras", "/tarefas", "/avisos", "/lembretes", "/admin", "/admin/financeiro"]);

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

  if (rotaAtual === '/cadastro') return <CadastroGrupo user={user} onNavigate={navegarPara} />;
  if (rotaAtual === '/conta') return <Conta onNavigate={navegarPara} />;
  if (rotaAtual === '/planos') return user === undefined ? <CarregandoGatinho /> : <Planos key={`${user?.uid}:${user?.grupoId}`} user={user} onNavigate={navegarPara} />;
  if (rotaAtual === '/recuperar-senha') return <RecuperarSenha onNavigate={navegarPara} />;
  if (rotaAtual === '/demonstracao' && user?.grupoId === 'demo_play_ap1303_v1') return <Demonstracao key={user.uid} user={user} onNavigate={navegarPara}/>;
  if (user === undefined) return <CarregandoGatinho />;
  if (rotaAtual === '/historico-contabil') return user === undefined ? <CarregandoGatinho /> : user && role === ROLE_ADMIN ? <HistoricoContabil key={`${user.uid}:${user.grupoId}`} user={user} onNavigate={navegarPara} /> : <PaginaNaoEncontrada onNavigate={navegarPara} />;
  if (rotaAtual === '/meus-comprovantes' && user?.grupoId && (role === 'funcionario' || user.funcionarioId)) return <MeusComprovantes user={user} onNavigate={navegarPara} />;
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

  if (rotaEfetiva === '/avisos') return <AcessoRecurso user={user} recurso="compartilhamento" onNavigate={navegarPara}><Avisos key={user.uid+':'+user.grupoId} user={user} onNavigate={navegarPara} /></AcessoRecurso>;
  if (rotaEfetiva === '/alimentacao') return <AcessoRecurso user={user} recurso="compartilhamento" onNavigate={navegarPara}><Alimentacao user={user} onNavigate={navegarPara}/></AcessoRecurso>;
  if (rotaEfetiva === '/lembretes') return <AcessoRecurso user={user} recurso="compartilhamento" onNavigate={navegarPara}><Lembretes key={user.uid} user={user} onNavigate={navegarPara} /></AcessoRecurso>;
  if (ehRotaCompras(rotaEfetiva)) {
    return <AcessoRecurso user={user} recurso="compartilhamento" onNavigate={navegarPara}><ListaCompras user={user} onNavigate={navegarPara} rotaAtual={rotaEfetiva} /></AcessoRecurso>;
  }

  if (rotaEfetiva === "/tarefas") {
    return <AcessoRecurso user={user} recurso="compartilhamento" onNavigate={navegarPara}><Tarefas user={user} onNavigate={navegarPara} rotaAtual={rotaEfetiva} /></AcessoRecurso>;
  }

  if (rotaEfetiva === "/admin") {
    return <AcessoRecurso user={user} recurso="compartilhamento" onNavigate={navegarPara}><Admin user={user} onNavigate={navegarPara} rotaAtual={rotaEfetiva} /></AcessoRecurso>;
  }

  if (rotaEfetiva === "/admin/financeiro") {
    return <AcessoRecurso user={user} recurso="escritorioContabil" onNavigate={navegarPara}><Financeiro user={user} onNavigate={navegarPara} rotaAtual={rotaEfetiva} /></AcessoRecurso>;
  }

  return <Ponto user={user} onNavigate={navegarPara} rotaAtual={rotaEfetiva} />;
}

export default function App() {
  const [user, setUser] = useState(undefined);
  useEffect(()=>nativo()?conectarCicloMobile({app:AppNativo,janela:window,documento:document}):undefined,[]);
  useEffect(()=>{if(import.meta.env.PROD)registrarShell().catch(()=>{});},[user?.uid]);
  useEffect(() => observeAuth(setUser), []);
  const chave = `${user?.uid || 'visitante'}:${user?.grupoId || 'legado'}`;
  const demo=user?.grupoId==='demo_play_ap1303_v1';
  return <SessaoContext.Provider value={user}><AvisosNovosProvider key={chave} user={user}>{demo&&<aside className="demo-faixa" role="status"><strong>DEMONSTRAÇÃO · Dados fictícios</strong><button className="demo-acao" onClick={()=>{window.history.pushState({}, "", "/demonstracao");window.dispatchEvent(new PopStateEvent("popstate"));}}>Simular ponto sem GPS</button></aside>}{ambiente.teste && <div className="ambiente-teste" role="status">TESTE · {ambiente.destino}{nativo()?' · Offline nativo em validação':''}</div>}{user && recursosWeb() && !ambiente.teste && <NotificacoesPush key={chave} uid={user.uid} />}{androidPush() && <NotificacoesAndroid user={user} />}<RotaCarregamento key={chave}><Suspense fallback={<CarregandoGatinho />}><AppConteudo key={chave} user={user} /></Suspense></RotaCarregamento></AvisosNovosProvider></SessaoContext.Provider>;
}
