import test from 'node:test';
import assert from 'node:assert/strict';
import {criarControlePushAndroid,destinoAviso} from '../src/utils/pushAndroid.js';
test('aviso alimentar abre ambiente próprio, inclusive ao tocar em aviso antigo',()=>{
 const user={uid:'a',grupoId:'g',role:'admin'},aviso={versao:'1',uid:'a',grupoId:'g',eventId:'a'.repeat(64),expiraEm:String(Date.now()+60000),rota:'/alimentacao',canal:'tarefas',conteudo:'alimentacao'};
 assert.equal(destinoAviso(aviso,user),'/alimentacao');assert.equal(destinoAviso({...aviso,rota:'/tarefas'},user),'/alimentacao');assert.equal(destinoAviso({...aviso,uid:'outra'},user),null);
});
function fixture(opcoes={}){
 let user={uid:'pessoa-a',grupoId:'grupo-a'},registro={token:'token-ficticio',instalacaoId:'instalacao-a',registrado:false},configurado=true,permitido=true;
 const chamadas=[],store=new Map();const ponte={estado:async()=>({configurado,permitido,permissao:permitido?'granted':'denied'}),contexto:async()=>{},token:async()=>({...registro}),confirmarCadastro:async()=>{registro.registrado=true;},ativar:async()=>{chamadas.push('local-ativar');},suspender:async()=>({instalacaoId:registro.instalacaoId}),confirmarRevogacao:async()=>{},permissao:async()=>{chamadas.push('permissao');return{permitido:true};},...opcoes.ponte};
 const api=criarControlePushAndroid({ponte,chamar:opcoes.chamar|| (async(nome,d)=>{chamadas.push([nome,d]);}),contexto:()=>user,armazenamento:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)}});
 return{api,ponte,chamadas,store,trocar:()=>{user={uid:'pessoa-b',grupoId:'grupo-b'};api.invalidar();},rotacionar:()=>{registro={...registro,token:'token-renovado',registrado:false};},semConfig:()=>configurado=false,recusar:()=>permitido=false};
}
test('cadastro deduplicado, retomada sem backend, rotação gera um único novo cadastro',async()=>{
 const f=fixture();await Promise.all([f.api.ativar(true),f.api.ativar(true)]);assert.equal(f.chamadas.filter(c=>c[0]==='registrarDispositivoPush').length,1);
 await f.api.ativar(false);assert.equal(f.chamadas.filter(c=>c[0]==='registrarDispositivoPush').length,1);
 f.rotacionar();await f.api.ativar(false);assert.equal(f.chamadas.filter(c=>c[0]==='registrarDispositivoPush').length,2);
});
test('recusa, bloqueio e demo sem configuração não cadastram nem repetem permissão',async()=>{
 for(const tipo of ['recusa','demo']){const f=fixture();if(tipo==='recusa')f.recusar();else f.semConfig();await assert.rejects(f.api.ativar(true));assert.equal(f.chamadas.length,0);}
});
test('opção explícita de desativar é preservada e logout sem rede não bloqueia',async()=>{
 const f=fixture();await f.api.ativar(true);await f.api.suspender(true);assert.equal(f.api.preferencia(),false);let n=f.chamadas.length;await f.api.ativar(false);assert.equal(f.chamadas.length,n);
 const offline=fixture({chamar:async()=>{throw new Error('offline');}});await assert.doesNotReject(offline.api.suspender());
});
test('callback antigo não ativa nova conta após troca de sessão',async()=>{
 let liberar;const f=fixture({chamar:()=>new Promise(r=>liberar=r)});const p=f.api.ativar(true);for(let i=0;i<8&&!liberar;i++)await Promise.resolve();assert.ok(liberar);f.trocar();liberar({});await assert.rejects(p,/Sessão alterada/);assert.equal(f.chamadas.includes('local-ativar'),false);
});
test('intenção espera perfil, rejeita conta/grupo/rota/expiração e não executa negócio',()=>{
 const u={uid:'pessoa-a',grupoId:'grupo-a',role:'funcionario',babaCuidadora:true};const d={versao:'1',uid:u.uid,grupoId:u.grupoId,eventId:'a'.repeat(64),expiraEm:String(Date.now()+60000),rota:'/lembretes',tipo:'lembrete',itemId:'lembrete-a',ocorrenciaId:'1_123'};
 assert.equal(destinoAviso(d,undefined),null);assert.equal(destinoAviso(d,u),'/lembretes');
 for(const invalido of [{uid:'outra'},{grupoId:'outro'},{rota:'https://externo.test'},{rota:'/admin'},{expiraEm:'NaN'},{expiraEm:'1'},{tipo:'qualquer'}])assert.equal(destinoAviso({...d,...invalido},u),null);
 assert.equal(destinoAviso(d,{...u,ativo:false}),null);
});
test('exclusão já confirmada suspende e confirma revogação local sem Function redundante',async()=>{
 let suspensoes=0,acks=0;const f=fixture({ponte:{suspender:async()=>{suspensoes++;return{instalacaoId:'instalacao-a'};},confirmarRevogacao:async()=>{acks++;}}});
 await f.api.suspender(false,false);assert.equal(suspensoes,1);assert.equal(acks,1);assert.equal(f.chamadas.length,0);
});
