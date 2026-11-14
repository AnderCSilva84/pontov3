export function linkImagemPublico(valor){
 let u;try{u=new URL(String(valor||'').trim());}catch{throw Error('Cole um link HTTPS válido da foto ou da página.');}
 if(u.protocol!=='https:'||u.username||u.password||u.port&&u.port!=='443'||!u.hostname.includes('.')||/^[\d.]+$/.test(u.hostname)||u.hostname.includes(':')||/\.(localhost|local|internal|test|invalid)$/.test(u.hostname)||u.href.length>2000)throw Error('Use um link HTTPS público, sem senha e sem endereço de rede local.');
 return u.href;
}
export function carregarImagemRefeicao(url,{signal,timeoutMs=7000}={}){
 return new Promise((resolve,reject)=>{
  const imagem=new Image();let terminou=false,timer;
  const limpar=()=>{clearTimeout(timer);imagem.onload=null;imagem.onerror=null;signal?.removeEventListener('abort',cancelar);};
  const finalizar=erro=>{if(terminou)return;terminou=true;limpar();if(erro){imagem.src='';reject(erro);}else resolve();};
  const cancelar=()=>finalizar(Error('Busca cancelada.'));
  imagem.referrerPolicy='no-referrer';
  imagem.onload=()=>finalizar(imagem.naturalWidth>0?null:Error('O link não abriu uma imagem.'));
  imagem.onerror=()=>finalizar(Error('O link não abriu uma imagem pública.'));
  if(signal?.aborted){cancelar();return;}
  signal?.addEventListener('abort',cancelar,{once:true});
  timer=setTimeout(()=>finalizar(Error('A imagem demorou para responder.')),timeoutMs);
  imagem.src=url;
 });
}
export async function resolverImagemRefeicao(link,{buscarPagina,carregar=carregarImagemRefeicao,signal}={}){
 const url=linkImagemPublico(link);if(signal?.aborted)throw Error('Busca cancelada.');
 try{await carregar(url,{signal});return {imagemUrl:url,origem:'foto'};}catch(e){if(signal?.aborted)throw e;}
 const r=await buscarPagina(url);
 if(signal?.aborted)throw Error('Busca cancelada.');
 if(!r?.imagemUrl)throw Error('Essa página não informou uma foto. Tente outro link ou copie o endereço da imagem.');
 const imagemUrl=linkImagemPublico(r.imagemUrl);
 if(imagemUrl===url)throw Error('O site não permitiu abrir essa imagem. Tente uma foto de outro endereço.');
 try{await carregar(imagemUrl,{signal});}catch(e){if(signal?.aborted)throw e;throw Error('Encontrei a foto, mas o site não permitiu carregá-la. Tente outra imagem.');}
 return {imagemUrl,origem:'pagina'};
}
