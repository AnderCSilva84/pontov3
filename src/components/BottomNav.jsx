import { Icon } from './ui';
import { normalizeRole, ROLE_ADMIN, ROLE_FUNCIONARIO, canConsultSystem } from "../utils/roles";

export default function BottomNav({ activePath, onNavigate, user }) {
  const themeClass =
    activePath === "/lista-compras"
      ? "theme-compras"
      : activePath === "/tarefas"
      ? "theme-tarefas"
      : activePath?.startsWith("/admin")
      ? "theme-admin"
      : "theme-ponto";

  const tabs = [
    {
      path: "/ponto",
      label: "Ponto",
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8" />
          <path d="M12 7.5v5l3 2" />
        </svg>
      ),
    },
    {
      path: "/lista-compras",
      label: "Compras",
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6h14l-1.5 8H8.5L7 5H4" />
          <circle cx="9" cy="20" r="1.5" />
          <circle cx="17" cy="20" r="1.5" />
        </svg>
      ),
    },
    {
      path: "/tarefas",
      label: "Tarefas",
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 6h14" />
          <path d="M5 12h14" />
          <path d="M5 18h10" />
        </svg>
      ),
    },
    {
      path: "/admin",
      label: "Gestão",
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z" />
          <path d="M9.5 12.5l2 2 3.5-4" />
        </svg>
      ),
    },
  ];

  const role = normalizeRole(user?.role);
  if (role === ROLE_FUNCIONARIO && user?.grupoId) tabs.push({ path: '/meus-comprovantes', label: 'Comprovantes' });
  if (role === ROLE_ADMIN || role === ROLE_FUNCIONARIO) {
    tabs.splice(3, 0, { path: '/lembretes', label: 'Lembretes', icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 8H3c0-1 3-1 3-8" /><path d="M10 21h4" /></svg> });
  }
  const tabsVisiveis = role === ROLE_FUNCIONARIO
    ? tabs.filter((tab) => tab.path === "/ponto" || tab.path === "/lista-compras" || tab.path === '/lembretes' || tab.path === '/meus-comprovantes')
    : role === ROLE_ADMIN
      ? tabs
      : tabs.filter((tab) => tab.path !== "/ponto" && (tab.path !== '/admin' || !user || canConsultSystem(user)));

  return (
    <nav className={`bottom-nav ${themeClass}`} aria-label="Navegação principal">
      {tabsVisiveis.map((tab) => (
        <button
          key={tab.path}
          type="button"
          className={`nav-item ${(activePath === tab.path || tab.path === "/admin" && activePath?.startsWith("/admin/")) ? "active" : ""}`}
          aria-current={(activePath === tab.path || tab.path === "/admin" && activePath?.startsWith("/admin/")) ? "page" : undefined}
          onClick={() => onNavigate && onNavigate(tab.path)}
        >
          <span className="nav-icon">{<Icon name={{"/ponto":"clock","/lista-compras":"cart","/tarefas":"tasks","/lembretes":"bell","/admin":"chart","/meus-comprovantes":"tasks"}[tab.path]} />}</span>
          <span className="nav-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
