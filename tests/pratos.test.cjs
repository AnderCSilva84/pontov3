const test=require('node:test'),assert=require('node:assert/strict');
const {validarPrato,pratoNoDia}=require('../functions/pratos-dia.cjs');
const base={titulo:'Almoço',usuarioId:'func1',modo:'data',data:'2026-10-22',receita:'',linkReceita:''};
test('prato admite data ou dias semanais e receita/foto opcionais',()=>{
 const p=validarPrato(base);assert.equal(pratoNoDia({...p,ativo:true},'2026-10-22'),true);assert.equal(pratoNoDia(p,'2026-10-23'),false);
 const semanal=validarPrato({...base,modo:'semanal',diasSemana:[4,1],receita:'Preparar conforme receita'});assert.deepEqual(semanal.diasSemana,[1,4]);assert.equal(pratoNoDia(semanal,'2026-10-22'),true);assert.equal(pratoNoDia({...semanal,ativo:false},'2026-10-22'),false);
});
test('cadastro de prato rejeita datas impossíveis, HTML executável em links e fotos fora do limite',()=>{
 assert.throws(()=>validarPrato({...base,data:'2026-02-30'}),/data/);
 assert.throws(()=>validarPrato({...base,modo:'semanal',diasSemana:[]}),/dias/);
 assert.throws(()=>validarPrato({...base,linkReceita:'javascript:alert(1)'}),/HTTPS/);
 assert.throws(()=>validarPrato({...base,linkReceita:'https://user:senha@example.test'}),/HTTPS/);
 assert.throws(()=>validarPrato({...base,foto:'data:image/svg+xml;base64,AAAA'}),/foto/);
 assert.throws(()=>validarPrato({...base,foto:'a'.repeat(180001)}),/foto/);
 assert.equal(validarPrato({...base,linkReceita:'https://example.test/receita'}).linkReceita,'https://example.test/receita');
});
