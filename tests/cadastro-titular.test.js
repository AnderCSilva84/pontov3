import test from 'node:test';
import assert from 'node:assert/strict';
import {criarCadastroTitular} from '../src/services/cadastroTitular.js';
test('cadastro retoma falha de grupo na mesma sessão/projeto, sem guardar senha ou criar outro login',async()=>{
  const dados=new Map();let user=null,contas=0,grupos=0;
  const armazenamento={getItem:k=>dados.get(k)||null,setItem:(k,v)=>dados.set(k,v),removeItem:k=>dados.delete(k)};
  const deps={sessao:()=>user,projeto:'demo-ap1303',armazenamento,criarConta:async()=>{contas++;user={uid:'uid-ficticio',email:'teste@example.test'};return{user};},criarGrupo:async()=>{if(++grupos===1)throw Object.assign(Error('Indisponível'),{code:'functions/unavailable'});return{grupoId:'g_uid-ficticio',jaCriado:true};}};
  const primeira=criarCadastroTitular(deps);
  await assert.rejects(primeira.cadastrar({nome:'Teste',nomeGrupo:'Demo',email:'teste@example.test',senha:'senha-ficticia'}),e=>e.etapaCadastro==='grupo');
  assert.equal(contas,1);assert.equal(primeira.pendente().nomeGrupo,'Demo');
  assert.ok(![...dados.values()].join().includes('senha-ficticia'));
  const reaberta=criarCadastroTitular(deps);
  assert.equal((await reaberta.cadastrar()).grupoId,'g_uid-ficticio');assert.equal(contas,1);assert.equal(grupos,2);assert.equal(dados.size,0);
  user={uid:'outro',email:'outro@example.test'};assert.equal(primeira.pendente(),null);
  await assert.rejects(primeira.cadastrar({nome:'Teste',nomeGrupo:'Demo',email:'teste@example.test'}),e=>e.code==='cadastro/sessao-diferente');
  assert.equal(contas,1);
});
test('erro Auth é identificado antes do callable; concorrência local compartilha a operação',async()=>{
  let calls=0;
  const erro=Object.assign(Error('Rede'),{code:'auth/network-request-failed'});
  const c=criarCadastroTitular({sessao:()=>null,criarConta:async()=>{throw erro;},criarGrupo:async()=>calls++,armazenamento:{},projeto:'demo-ap1303'});
  const dados={nome:'Teste',nomeGrupo:'Demo',email:'teste@example.test',senha:'ficticia'};
  const a=c.cadastrar(dados),b=c.cadastrar(dados);assert.equal(a,b);
  await assert.rejects(a,e=>e===erro&&e.etapaCadastro==='auth');assert.equal(calls,0);
});
