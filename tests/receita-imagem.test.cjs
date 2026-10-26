const test=require('node:test'),assert=require('node:assert/strict');
const {urlPublica,ipv4Publico,extrairImagem,buscarImagem,operarImagem}=require('../functions/receita-imagem.cjs');
const resolver=async()=>[{address:'93.184.216.34',family:4}];
test('receita: somente HTTPS público sem credenciais, portas ou IPs literais',()=>{
 for(const u of ['file:///etc/passwd','http://example.com','https://localhost/x','https://x.local/x','https://127.1/x','https://2130706433/x','https://[::1]/','https://user:pass@example.com','https://example.com:8443'])assert.throws(()=>urlPublica(u));
 for(const ip of ['127.0.0.1','10.1.1.1','169.254.169.254','172.16.0.1','192.168.1.1','100.64.1.1','198.18.0.1','::ffff:127.0.0.1','224.0.0.1'])assert.equal(ipv4Publico(ip),false,ip);
 assert.equal(ipv4Publico('93.184.216.34'),true);
});
test('receita: OG, entidades e URL relativa; Twitter e Recipe estruturado',()=>{
 assert.equal(extrairImagem('<meta content="/foto.jpg?a=1&amp;b=2" property="og:image">','https://example.com/prato'),'https://example.com/foto.jpg?a=1&b=2');
 assert.equal(extrairImagem("<meta name='twitter:image' content='../foto.png'>",'https://example.com/a/b'),'https://example.com/foto.png');
 assert.equal(extrairImagem('<script type="application/ld+json">{"@graph":[{"@type":"Recipe","image":{"url":"/r.webp"}}]}</script>','https://example.com'),'https://example.com/r.webp');
 assert.equal(extrairImagem('<img src="/anuncio.png"><script>document.write(1)</script>','https://example.com'),'');
 assert.equal(extrairImagem('<!--<meta property="og:image" content="/anuncio">-->','https://example.com'),'');
 assert.equal(extrairImagem('<meta property="og:image" content="javascript:alert(1)">','https://example.com'),'');
});
test('receita: busca limitada retorna metadados e valida DNS da imagem sem baixar bytes',async()=>{
 let n=0;const r=await buscarImagem('https://example.com/receita',{resolver,baixar:async(u,address,signal)=>{n++;assert.equal(address,'93.184.216.34');assert.equal(signal.aborted,false);return {html:'<meta property="og:image" content="/foto.jpg">'};}});
 assert.equal(r.imagemUrl,'https://example.com/foto.jpg');assert.equal(n,1);
 assert.deepEqual(await buscarImagem('https://example.com',{resolver,baixar:async()=>({html:'sem imagem'})}),{imagemUrl:''});
});
test('receita: redirecionamentos privados, DNS misto e imagem interna bloqueados',async()=>{
 let n=0;
 await assert.rejects(buscarImagem('https://example.com',{resolver,baixar:async()=>{n++;return {redirect:'https://127.0.0.1/'};}}));assert.equal(n,1);
 await assert.rejects(buscarImagem('https://example.com',{resolver:async()=>[{address:'93.184.216.34'},{address:'10.0.0.1'}],baixar:async()=>{throw Error('não deveria consultar');}}));
 await assert.rejects(buscarImagem('https://example.com',{resolver:async host=>host==='img.example.com'?[{address:'192.168.0.1'}]:resolver(),baixar:async()=>({html:'<meta property="og:image" content="https://img.example.com/a.jpg">'})}));
});
test('receita: redirecionamento relativo público e limite de saltos; falha de rede explícita',async()=>{
 let n=0;const r=await buscarImagem('https://example.com/a',{resolver,baixar:async u=>++n===1?{redirect:'/b'}:{html:'<meta property="og:image" content="/foto">'}});assert.equal(r.imagemUrl,'https://example.com/foto');assert.equal(n,2);
 n=0;await assert.rejects(buscarImagem('https://example.com',{resolver,baixar:async()=>{n++;return {redirect:'/loop'};}}),/redirecionamentos/);assert.equal(n,3);
 await assert.rejects(buscarImagem('https://example.com',{resolver,baixar:async()=>{throw Error('rede');}}),/rede/);
});
test('receita: acesso negado antes de rede, sem escrita de negócio',async()=>{
 for(const perfil of [{role:'funcionario',ativo:true},{role:'admin',ativo:false},undefined])await assert.rejects(operarImagem({doc:()=>({get:async()=>({data:()=>perfil})})},{auth:{uid:'ficticio'},data:{link:'https://example.com'}}),{code:'permission-denied'});
});
