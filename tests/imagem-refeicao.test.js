import test from 'node:test';
import assert from 'node:assert/strict';
import {linkImagemPublico,resolverImagemRefeicao} from '../src/utils/imagemRefeicao.js';

const pagina='https://panelinha.com.br/blog/fleury/post/dicas-para-comecar-o-dia-bem';
const foto='https://i.panelinha.com.br/i1/228-bk-7824-blog-ayu1111.webp';
test('link direto abre sem consultar o servidor; página é resolvida e sua imagem conferida',async()=>{
 let chamadas=0;assert.deepEqual(await resolverImagemRefeicao(foto,{carregar:async()=>{},buscarPagina:async()=>{chamadas++;}}),{imagemUrl:foto,origem:'foto'});assert.equal(chamadas,0);
 const carregadas=[];const r=await resolverImagemRefeicao(pagina,{carregar:async url=>{carregadas.push(url);if(url===pagina)throw Error('HTML não é imagem');},buscarPagina:async url=>{assert.equal(url,pagina);return {imagemUrl:foto};}});
 assert.deepEqual(r,{imagemUrl:foto,origem:'pagina'});assert.deepEqual(carregadas,[pagina,foto]);
});
test('links privados, páginas sem imagem e imagens bloqueadas têm falha explícita',async()=>{
 for(const url of ['http://example.com','https://127.0.0.1/a','https://[::1]/a','https://user:senha@example.com/a','https://rede.local/a','https://example.com:444/a'])assert.throws(()=>linkImagemPublico(url));
 await assert.rejects(resolverImagemRefeicao(pagina,{carregar:async()=>{throw Error('HTML');},buscarPagina:async()=>({imagemUrl:''})}),/não informou uma foto/);
 await assert.rejects(resolverImagemRefeicao(pagina,{carregar:async()=>{throw Error('imagem bloqueada');},buscarPagina:async()=>({imagemUrl:foto})}),/não permitiu carregá-la/);
 await assert.rejects(resolverImagemRefeicao(pagina,{carregar:async()=>{throw Error('erro');},buscarPagina:async()=>({imagemUrl:'https://127.0.0.1/a'})}),/público/);
});
test('busca cancelada não aplica imagem nem inicia a leitura da página',async()=>{
 const controle=new AbortController();let chamadas=0;
 await assert.rejects(resolverImagemRefeicao(pagina,{signal:controle.signal,carregar:async()=>{controle.abort();throw Error('cancelada');},buscarPagina:async()=>{chamadas++;}}),/cancelada/);assert.equal(chamadas,0);
});
