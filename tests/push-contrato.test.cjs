const test=require('node:test'),assert=require('node:assert/strict');
const {montarMensagem,revisaoTarefa}=require('../functions/push-contrato.cjs');
test('payload Android genérico, expirável, sem notification/segredos e ação por ocorrência; web preservado',()=>{
 const op={titulo:'Nome sensível',mensagem:'Medicamento sensível',url:'/lembretes?lembreteId=lem-a&ocorrenciaId=1_123&destinatario=uid',eventoId:'evento-ficticio',grupoId:'g',ttl:300,agora:1000};
 const a=montarMensagem({uid:'u',token:'fake',transporte:'fcm-android'},op);assert.equal(a.notification,undefined);assert.equal(a.data.title,undefined);assert.equal(a.data.itemId,'lem-a');assert.equal(a.data.ocorrenciaId,'1_123');assert.equal(a.android.ttl,300000);assert.equal(a.data.expiraEm,'301000');assert.ok(!JSON.stringify(a).includes('sensível'));
 const w=montarMensagem({uid:'u',token:'fake'},op);assert.equal(w.webpush.headers.TTL,'300');assert.equal(w.data.title,op.titulo);assert.equal(w.data.url,op.url);
});
test('revisão de tarefa detecta alteração sem depender do status de conclusão',()=>{const t={titulo:'Teste',dataAgendada:'2026-10-23',diaSemana:'sexta'};assert.notEqual(revisaoTarefa(t),revisaoTarefa({...t,titulo:'Outra'}));assert.equal(revisaoTarefa(t),revisaoTarefa({...t,concluida:true}));});
