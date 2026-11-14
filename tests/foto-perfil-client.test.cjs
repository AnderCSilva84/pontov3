const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {validarMiniatura}=require('../functions/foto-perfil.cjs');
const original=fs.readFileSync('tests/fixtures/avatar-demo.jpg');
const segmento=(tipo,texto)=>{const payload=Buffer.from(texto),h=Buffer.from([255,tipo,0,0]);h.writeUInt16BE(payload.length+2,2);return Buffer.concat([h,payload]);};
const comMetadados=Buffer.concat([original.subarray(0,2),segmento(225,'Exif\0\0metadados sintéticos'),segmento(237,'IPTC fictício'),segmento(254,'comentário fictício'),original.subarray(2)]).toString('base64');
test('foto com prévia válida e metadados rejeitada pelo servidor é normalizada sem alterar o JPEG visual',async()=>{
 const {limparMetadadosJpeg}=await import('../src/utils/fotoPerfil.js');
 assert.throws(()=>validarMiniatura(comMetadados),/metadados/);
 const limpa=limparMetadadosJpeg(comMetadados);assert.deepEqual(validarMiniatura(limpa),original);assert.equal(limparMetadadosJpeg(original.toString('base64')),original.toString('base64'));
 for(const b of [Buffer.alloc(20),original.subarray(0,-3)])assert.throws(()=>limparMetadadosJpeg(b.toString('base64')));
});
test('preparo real remove metadados do resultado do encoder e rejeita fallback PNG antes de mostrar prévia',async()=>{
 const fonte=fs.readFileSync('src/utils/fotoPerfil.js','utf8').replace(/export /g,''),urls=[];let saida='data:image/jpeg;base64,'+comMetadados;
 class Imagem{naturalWidth=192;naturalHeight=192;set src(v){Promise.resolve().then(()=>this.onload());}}
 const c={Uint8Array,atob,btoa,Image:Imagem,URL:{createObjectURL:()=> 'blob:ficticio',revokeObjectURL:x=>urls.push(x)},document:{createElement:()=>({getContext:()=>({fillRect(){},drawImage(){}}),toDataURL:()=>saida})}};
 vm.createContext(c);vm.runInContext(fonte,c);const arquivo={size:original.length,slice:()=>({arrayBuffer:async()=>original.subarray(0,12).buffer.slice(original.byteOffset,original.byteOffset+12)})};
 const foto=await c.prepararFotoPerfil(arquivo);assert.deepEqual(validarMiniatura(foto),original);assert.equal(urls.length,1);
 saida='data:image/png;base64,AAAA';await assert.rejects(c.prepararFotoPerfil(arquivo),/JPEG/);assert.equal(urls.length,2);
});
function servico(resolver){
 const eventos={},auth={currentUser:{uid:'pessoa-a'}},navigator={onLine:true},chamadas=[];let grupo='a';
 const c={auth,navigator,functions:{},obterGrupoAtual:()=>grupo,window:{addEventListener:(n,f)=>eventos[n]=f},httpsCallable:(_f,nome,opts)=>async d=>{chamadas.push({nome,opts,d});return{data:await resolver(d)};}};
 vm.createContext(c);vm.runInContext(fs.readFileSync('src/services/fotoPerfil.js','utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,''),c);
 return{...c,auth,navigator,chamadas,trocar:()=>{grupo='b';eventos['ap1303-contexto-alterado']();}};
}
test('sucesso exige resposta confirmada e atualiza avatar próprio sem leitura extra',async()=>{
 const s=servico(async()=>({ok:true,versao:3,temFoto:true}));await s.salvarFotoPerfil('miniatura');const src=await s.consultarFotoPerfil({uid:'pessoa-a',grupoId:'a'},{uid:'pessoa-a',temFotoPerfil:true,fotoPerfilVersao:3});assert.equal(src,'data:image/jpeg;base64,miniatura');assert.equal(s.chamadas.length,1);assert.equal(s.chamadas[0].opts.timeout,25000);
 const falha=servico(async()=>({}));await assert.rejects(falha.salvarFotoPerfil('miniatura'),/não confirmou/);
 const leitura=s.consultarFotoPerfil({uid:'pessoa-a',grupoId:'a'},{uid:'pessoa-a',temFotoPerfil:true,fotoPerfilVersao:3});s.trocar();await assert.rejects(leitura,/sessão mudou/);
});
test('rede indisponível e timeout produzem erro acionável; não anunciam sucesso',async()=>{
 const s=servico(async()=>{throw{code:'functions/deadline-exceeded'};});await assert.rejects(s.salvarFotoPerfil('miniatura'),/prévia foi mantida/);s.navigator.onLine=false;await assert.rejects(s.salvarFotoPerfil('miniatura'),/sem conexão/);assert.equal(s.chamadas.length,1);
});
test('troca de conta ou grupo durante salvamento não atualiza estado nem cache da nova sessão',async()=>{
 const s=servico(async()=>{s.trocar();return{ok:true,versao:1,temFoto:true};});await assert.rejects(s.salvarFotoPerfil('miniatura'),/sessão mudou/);
 const a=servico(async()=>{a.auth.currentUser={uid:'pessoa-b'};return{ok:true,versao:1,temFoto:true};});await assert.rejects(a.salvarFotoPerfil('miniatura'),/sessão mudou/);
});
