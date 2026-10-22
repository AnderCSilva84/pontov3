const test=require('node:test'),assert=require('node:assert/strict');
const {urlLembrete}=require('../functions/lembretes-link.cjs');
test('notificação identifica lembrete, ocorrência e destinatário sem concluir por URL',()=>{
 const url=new URL(urlLembrete('cuidado-1','2_123456','usuario_1'),'https://example.test');
 assert.equal(url.pathname,'/lembretes');assert.equal(url.searchParams.get('lembreteId'),'cuidado-1');assert.equal(url.searchParams.get('ocorrenciaId'),'2_123456');assert.equal(url.searchParams.get('destinatario'),'usuario_1');assert.equal(url.searchParams.has('concluir'),false);
 assert.throws(()=>urlLembrete('../outro','2_123','uid'),/inválida/);
});
