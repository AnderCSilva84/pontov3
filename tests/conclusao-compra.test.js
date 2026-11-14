import test from 'node:test';
import assert from 'node:assert/strict';
import {camposFaltantesCupom,assinaturaConferencia,cupomConferido,compraConcluida} from '../src/utils/conclusaoCompra.js';

for (const tipoCompra of ['supermercado','farmacia','material_construcao','oficina','pet']) {
  test(`${tipoCompra}: conclusão requer confirmação, invalida edição e separa envio de salvamento`, () => {
    const i = {tipoCompra, nome:'PRODUTO FICTÍCIO', novoConfirmado:true, apresentacao:'Embalagem teste', categoriaId:'teste', unidadeCompra:'un', quantidade:1, precoUnitarioCentavos:1200,totalCentavos:1200};
    assert.deepEqual(camposFaltantesCupom(i), []);
    assert.equal(cupomConferido(i), false);
    assert.equal(cupomConferido({...i,produtoId:'selecionado'}), false);
    const assinatura = assinaturaConferencia(i);
    assert.equal(cupomConferido(i,assinatura), true);
    for(const alteracao of [{nome:''},{apresentacao:''},{categoriaId:''},{quantidade:0},{marca:'Outra'},{precoUnitarioCentavos:0},{erroRevisao:'Falha'},{descartar:true}]) assert.equal(cupomConferido({...i,...alteracao},assinatura), false);
    assert.equal(cupomConferido({...i,unidadeConferir:true},assinatura),false);
    assert.equal(cupomConferido({...i,unidadePendente:true},assinatura),false);
    const salvo = {tipoCompra,estado:'comprado',nomeSnapshot:i.nome,apresentacao:i.apresentacao,categoriaId:'teste',supermercadoId:'demo',unidadeCompra:'un',quantidadeComprada:1,precoUnitarioCentavos:1200,totalCentavos:1200};
    assert.equal(compraConcluida(salvo),true);
    assert.equal(compraConcluida(salvo,true),false);
    for(const alteracao of [{estado:'comprado_sem_preco'},{estado:'pendente'},{precoUnitarioCentavos:0},{quantidadeComprada:0},{supermercadoId:''}]) assert.equal(compraConcluida({...salvo,...alteracao}),false);
  });
}
