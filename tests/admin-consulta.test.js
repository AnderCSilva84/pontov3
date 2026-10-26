import test from 'node:test';
import assert from 'node:assert/strict';
import {canListEmployees} from '../src/utils/roles.js';
test('gestão não consulta coleção trabalhista para perfil consulta de grupo; preserva admin e legado',()=>{
 assert.equal(canListEmployees({role:'consulta',grupoId:'a',ativo:true}),false);
 assert.equal(canListEmployees({role:'consulta',grupoId:'b',permissions:{accessAdmin:true,manageUsers:true}}),false);
 assert.equal(canListEmployees({role:'admin',grupoId:'a'}),true);
 assert.equal(canListEmployees({role:'funcionario',grupoId:'a'}),false);
 assert.equal(canListEmployees({role:'consulta'}),true);
 assert.equal(canListEmployees(null),false);
});
