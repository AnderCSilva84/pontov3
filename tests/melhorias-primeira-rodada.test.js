import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {dataExibicao, dataHoraExibicao} from '../src/utils/datasExibicao.js';

test('datas de apresentação preservam o dia ISO e respeitam o fuso de instantes',()=>{
  assert.equal(dataExibicao('2026-01-01'),'01-01-26');
  assert.equal(dataExibicao('2026-10',{timeZone:'America/Fortaleza'}),'10-26');
  assert.equal(dataExibicao('2026-11'),'11-26');
  assert.equal(dataExibicao(Date.UTC(2026,0,1,1),{timeZone:'America/Fortaleza'}),'31-12-25');
  assert.equal(dataExibicao('inválida'),'—');
  assert.equal(dataHoraExibicao(Date.UTC(2026,0,1,1,30),{timeZone:'America/Fortaleza'}),'31-12-25 22:30');
  assert.equal(dataExibicao({toDate:()=>new Date(2026,9,27)}),'27-10-26');
});
test('cadastro impede senha divergente antes de criar conta e não envia a confirmação',()=>{
  const s=fs.readFileSync('src/pages/CadastroGrupo.jsx','utf8');
  assert.ok(s.indexOf('dados.senha !== dados.confirmacaoSenha')<s.indexOf('await cadastrarTitular(dados)'));
  assert.match(s,/delete dados.confirmacaoSenha/);
  assert.match(s,/name="confirmacaoSenha" required/);
});
test('cardápio em tarefas, sem polling remoto e sem cuidados no serviço culinário da loja',()=>{
  assert.match(fs.readFileSync('src/pages/Tarefas.jsx','utf8'),/<PratosDia user={user}/);
  assert.doesNotMatch(fs.readFileSync('src/pages/Lembretes.jsx','utf8'),/<PratosDia/);
  assert.doesNotMatch(fs.readFileSync('src/components/PratosDia.jsx','utf8'),/setInterval\(carregar/);
  const s=fs.readFileSync('src/services/receitasLoja.js','utf8');
  assert.match(s,/if\(!\['listarPratos','salvarPrato','arquivarPrato','obterPrato','buscarImagemReceita'\]/);
});
