export const ROLE_ADMIN = "admin";
export const ROLE_FUNCIONARIO = "funcionario";
export const ROLE_CONSULTA = "consulta";

export const ROLE_LABELS = {
  [ROLE_ADMIN]: "Admin",
  [ROLE_FUNCIONARIO]: "Funcionario",
  [ROLE_CONSULTA]: "Consulta",
};

export function normalizeRole(role) {
  const valor = String(role || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (
    valor === ROLE_ADMIN ||
    valor === "administrador" ||
    valor === "administracao" ||
    valor === "gestor"
  ) {
    return ROLE_ADMIN;
  }

  if (
    valor === ROLE_FUNCIONARIO ||
    valor === "funcionaria" ||
    valor === "colaborador" ||
    valor === "empregado"
  ) {
    return ROLE_FUNCIONARIO;
  }

  if (valor === ROLE_CONSULTA || valor === "consultor" || valor === "consulta_only") {
    return ROLE_CONSULTA;
  }

  return valor;
}

export function getDefaultPermissionsForRole(role) {
  switch (normalizeRole(role)) {
    case ROLE_ADMIN:
      return {
        accessPonto: true,
        accessAdmin: true,
        manageUsers: true,
        createTasks: true,
      };
    case ROLE_FUNCIONARIO:
      return {
        accessPonto: true,
        accessAdmin: false,
        manageUsers: false,
        createTasks: false,
      };
    case ROLE_CONSULTA:
      return {
        accessPonto: false,
        accessAdmin: true,
        manageUsers: false,
        createTasks: true,
      };
    default:
      return {
        accessPonto: false,
        accessAdmin: false,
        manageUsers: false,
        createTasks: false,
      };
  }
}

export function getUserPermissions(user) {
  const roleNormalizado = normalizeRole(user?.role);
  const base = getDefaultPermissionsForRole(roleNormalizado);
  const custom = user?.permissions && typeof user.permissions === "object" ? user.permissions : {};
  const merged = {
    ...base,
    ...custom,
  };

  if (roleNormalizado === ROLE_ADMIN) {
    return {
      ...merged,
      accessPonto: true,
      accessAdmin: true,
      manageUsers: true,
      createTasks: true,
    };
  }

  if (roleNormalizado === ROLE_FUNCIONARIO) {
    return {
      ...merged,
      accessPonto: true,
    };
  }

  if (roleNormalizado === ROLE_CONSULTA) {
    return {
      ...merged,
      accessPonto: false,
    };
  }

  return merged;
}

export function canAccessPonto(user) {
  return getUserPermissions(user).accessPonto;
}

export function canConsultSystem(user) {
  return getUserPermissions(user).accessAdmin;
}

export function canManageUsers(user) {
  return getUserPermissions(user).manageUsers;
}

export function canCreateTasks(user) {
  return getUserPermissions(user).createTasks;
}
