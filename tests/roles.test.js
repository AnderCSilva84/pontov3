import test from "node:test";
import assert from "node:assert/strict";
import { canAccessPonto, canCreateTasks, canManageUsers, normalizeRole } from "../src/utils/roles.js";
import { resolverRotaUsuario } from '../src/utils/rotas.js';
test('funcionária sem perfil de cuidadora acessa receitas, sem habilitar cuidados',()=>{
 assert.equal(resolverRotaUsuario({role:'funcionario',babaCuidadora:false},'/lembretes'),'/lembretes');
 assert.equal(resolverRotaUsuario({role:'consulta'},'/lembretes'),'/ponto');
});

test('comprovantes pessoais exigem funcionário vinculado a grupo', () => {
  assert.equal(resolverRotaUsuario({ role: 'funcionario', grupoId: 'casa-a' }, '/meus-comprovantes'), '/meus-comprovantes');
  assert.equal(resolverRotaUsuario({ role: 'funcionario' }, '/meus-comprovantes'), '/ponto');
  assert.equal(resolverRotaUsuario({ role: 'consulta', grupoId: 'casa-a' }, '/meus-comprovantes'), '/ponto');
});

test("normaliza nomes alternativos de perfil", () => {
  assert.equal(normalizeRole("Funcionária"), "funcionario");
  assert.equal(normalizeRole("Administrador"), "admin");
});

test("mantém privilégios obrigatórios do administrador", () => {
  const admin = { role: "admin", permissions: { manageUsers: false, createTasks: false } };
  assert.equal(canManageUsers(admin), true);
  assert.equal(canCreateTasks(admin), true);
});

test("funcionária acessa ponto mas não cria tarefas por padrão", () => {
  const funcionaria = { role: "funcionario" };
  assert.equal(canAccessPonto(funcionaria), true);
  assert.equal(canCreateTasks(funcionaria), false);
});
