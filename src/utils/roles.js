export const ROLE_ADMIN = "admin";
export const ROLE_FUNCIONARIO = "funcionario";
export const ROLE_CONSULTA = "consulta";

export const ROLE_LABELS = {
  [ROLE_ADMIN]: "Admin",
  [ROLE_FUNCIONARIO]: "Funcionário",
  [ROLE_CONSULTA]: "Consulta",
};

export function canAccessPonto(user) {
  return user?.role === ROLE_ADMIN || user?.role === ROLE_FUNCIONARIO;
}

export function canConsultSystem(user) {
  return user?.role === ROLE_ADMIN || user?.role === ROLE_CONSULTA;
}

export function canManageUsers(user) {
  return user?.role === ROLE_ADMIN;
}

export function canCreateTasks(user) {
  return user?.role === ROLE_ADMIN || user?.role === ROLE_CONSULTA;
}
