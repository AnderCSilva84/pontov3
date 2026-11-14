const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {validarMiniatura}=require('../functions/foto-perfil.cjs');
const foto=fs.readFileSync(require('node:path').join(__dirname,'fixtures/avatar-demo.jpg')).toString('base64');
test('miniatura rejeita formatos falsos, conteúdo grande e metadados',()=>{
 assert.ok(validarMiniatura(foto).length<24576);
 for(const f of ['<svg/>',Buffer.from('arquivo falso').toString('base64'),'A'.repeat(32769)])assert.throws(()=>validarMiniatura(f));
 const b=Buffer.from(foto,'base64');const exif=Buffer.concat([b.subarray(0,2),Buffer.from([255,225,0,4,0,0]),b.subarray(2)]);
 assert.throws(()=>validarMiniatura(exif.toString('base64')),/metadados/);
});
test('foto privada: própria edição, leitura autorizada, troca, remoção e isolamento',{skip:!process.env.FIRESTORE_EMULATOR_HOST},async t=>{
 const projeto='demo-foto-'+Date.now();process.env.GCLOUD_PROJECT=projeto;process.env.FIREBASE_CONFIG=JSON.stringify({projectId:projeto});
 const api=require('../functions/index.js'),admin=require('../functions/node_modules/firebase-admin'),app=admin.app(),db=app.firestore();t.after(()=>app.delete());
 const {operarConta}=require('../functions/conta.cjs');
 for(const [uid,role,g]of [['funcionario_foto_teste','funcionario','a'],['admin_foto_teste','admin','a'],['outro_foto_teste','funcionario','a'],['outra_conta_grupo','admin','b']]){
  await db.doc('grupos/'+g).set({ativo:true});await db.doc('vinculosUsuarios/'+uid).set({ativo:true,grupoId:g});await db.doc(`grupos/${g}/users/${uid}`).set({role,ativo:true,funcionarioId:uid,nome:'Pessoa fictícia'});await db.doc(`grupos/${g}/funcionarios/${uid}`).set({ativo:true});
 }
 const op=(uid,acao,d={})=>operarConta(db,app.auth(),{auth:uid?{uid}:null,data:{acao,...d}});
 await assert.rejects(op(null,'fotoPerfilConsultar'),{code:'unauthenticated'});
 await op('funcionario_foto_teste','fotoPerfilSalvar',{foto});
 const p='grupos/a/',ref=db.doc(p+'fotosPerfis/funcionario_foto_teste');
 assert.ok(Buffer.isBuffer((await ref.get()).data().bytes));
 assert.equal((await db.doc(p+'users/funcionario_foto_teste').get()).data().foto,undefined);
 assert.equal((await op('admin_foto_teste','fotoPerfilConsultar',{usuarioId:'funcionario_foto_teste'})).foto,foto);
 await assert.rejects(op('outro_foto_teste','fotoPerfilConsultar',{usuarioId:'funcionario_foto_teste'}),{code:'permission-denied'});
 await assert.rejects(op('outra_conta_grupo','fotoPerfilConsultar',{usuarioId:'funcionario_foto_teste'}),{code:'permission-denied'});
 await assert.rejects(op('admin_foto_teste','fotoPerfilSalvar',{usuarioId:'funcionario_foto_teste',foto}),{code:'permission-denied'});
 assert.equal((await op('funcionario_foto_teste','fotoPerfilSalvar',{foto})).versao,2);
 await op('funcionario_foto_teste','fotoPerfilRemover');assert.equal((await ref.get()).exists,false);
 assert.equal((await db.doc(p+'users/funcionario_foto_teste').get()).data().temFotoPerfil,false);
 await op('funcionario_foto_teste','fotoPerfilSalvar',{foto});
 await app.auth().createUser({uid:'funcionario_foto_teste'});
 await api.excluirUsuario.run({auth:{uid:'admin_foto_teste'},data:{uid:'funcionario_foto_teste'}});
 assert.equal((await ref.get()).exists,false);
 assert.equal((await db.doc(p+'funcionarios/funcionario_foto_teste').get()).data().fotoPerfilUid,undefined);
 // Mesmo contrato do JPEG preparado pelo cliente, sem flexibilizar o servidor.
 const {limparMetadadosJpeg}=await import('../src/utils/fotoPerfil.js');
 const bytes=Buffer.from(foto,'base64'),comExif=Buffer.concat([bytes.subarray(0,2),Buffer.from([255,225,0,8,69,120,105,102,0,0]),bytes.subarray(2)]).toString('base64');
 await assert.rejects(op('admin_foto_teste','fotoPerfilSalvar',{foto:comExif}),{code:'invalid-argument'});
 await op('admin_foto_teste','fotoPerfilSalvar',{foto:limparMetadadosJpeg(comExif)});
 assert.equal((await op('admin_foto_teste','fotoPerfilConsultar')).foto,foto);
});
