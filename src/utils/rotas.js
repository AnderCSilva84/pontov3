import { canAccessPonto, normalizeRole, ROLE_FUNCIONARIO } from "./roles.js";

export function ehRotaCompras(rota) {
  return /^\/lista-compras(?:\/(?:historico|consulta|precos|rankings|categorias|catalogo)|\/listas\/[\w-]{1,128})?$/.test(rota);
}

export function resolverRotaUsuario(user, rota) {
  if (rota === '/meus-comprovantes') return user?.grupoId && normalizeRole(user.role) === ROLE_FUNCIONARIO ? rota : '/ponto';
  if (rota === '/lembretes') return user && ['admin',ROLE_FUNCIONARIO].includes(normalizeRole(user.role)) ? rota : '/ponto';
  if (rota === '/lista-compras/categorias' && user && normalizeRole(user.role) !== 'admin') return '/lista-compras';
  if (normalizeRole(user?.role) === ROLE_FUNCIONARIO) return ehRotaCompras(rota) ? rota : "/ponto";
  return user && !canAccessPonto(user) && rota === "/ponto" ? "/admin" : rota;
}
