import { ROLE_CONSULTA } from "../utils/roles";

export default function BottomNav({ activePath, onNavigate, user }) {
  const themeClass =
    activePath === "/lista-compras"
      ? "theme-compras"
      : activePath === "/tarefas"
      ? "theme-tarefas"
      : activePath === "/admin"
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
      label: "Admin",
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z" />
          <path d="M9.5 12.5l2 2 3.5-4" />
        </svg>
      ),
    },
  ];

  const tabsVisiveis =
    user?.role === ROLE_CONSULTA ? tabs.filter((tab) => tab.path !== "/ponto") : tabs;

  return (
    <nav className={`bottom-nav ${themeClass}`} aria-label="Navegação principal">
      {tabsVisiveis.map((tab) => (
        <button
          key={tab.path}
          type="button"
          className={`nav-item ${activePath === tab.path ? "active" : ""}`}
          onClick={() => onNavigate && onNavigate(tab.path)}
        >
          <span className="nav-icon">{tab.icon}</span>
          <span className="nav-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
