const https = require('node:https');
const dns = require('node:dns/promises');
const net = require('node:net');
const {HttpsError} = require('firebase-functions/v2/https');

function urlPublica(valor, base) {
  const u = new URL(valor, base);
  if(u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443') || net.isIP(u.hostname.replace(/^\[|\]$/g,'')) || !u.hostname.includes('.') || /\.(localhost|local|internal|test|invalid)$/.test(u.hostname) || u.href.length > 2000) throw Error('URL não permitida.');
  return u;
}
function ipv4Publico(ip) {
  if(net.isIP(ip)!==4)return false;
  const [a,b,c]=ip.split('.').map(Number);
  return !(a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&(b===168||b===0||b===88&&c===99)||a===100&&b>=64&&b<=127||a===198&&(b===18||b===19||b===51&&c===100)||a===203&&b===0&&c===113);
}
async function resolverPublico(host, resolver=dns.lookup) {
  const respostas=await resolver(host,{all:true,family:4});
  if(!respostas.length||respostas.some(r=>!ipv4Publico(r.address)))throw Error('Destino não permitido.');
  return respostas[0].address;
}
const entidades=s=>s.replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi,m=>{const t=m.slice(1,-1).toLowerCase();if(t[0]==='#'){const n=t[1]==='x'?parseInt(t.slice(2),16):Number(t.slice(1));return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';}return {amp:'&',quot:'"',apos:"'",lt:'<',gt:'>'}[t];});
function extrairImagem(html, base) {
  const limpo=html.replace(/<!--[\s\S]*?-->/g,'');
  const metas=limpo.replace(/<script\b[\s\S]*?<\/script\s*>/gi,'').match(/<meta\b[^>]*>/gi)||[];
  const valores={};
  for(const tag of metas){const attrs={};for(const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g))attrs[m[1].toLowerCase()]=entidades(m[2]??m[3]??m[4]);const chave=(attrs.property||attrs.name||'').toLowerCase();if(!valores[chave])valores[chave]=attrs.content;}
  const candidatos=[valores['og:image'],valores['twitter:image'],valores['twitter:image:src']];
  let visitados=0;
  function visitar(x,depth=0){if(!x||typeof x!=='object'||depth>12||++visitados>1000)return;if([].concat(x['@type']||[]).some(t=>t==='Recipe'||t==='https://schema.org/Recipe')){const img=[].concat(x.image||[])[0];candidatos.push(typeof img==='string'?img:img?.url||img?.contentUrl);}for(const v of Object.values(x))if(typeof v==='object')Array.isArray(v)?v.slice(0,100).forEach(i=>visitar(i,depth+1)):visitar(v,depth+1);}
  for(const m of limpo.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi))try{visitar(JSON.parse(m[1]));}catch{/* HTML/JSON nunca executados. */}
  for(const c of candidatos)if(typeof c==='string')try{return urlPublica(c,base).href;}catch{/* Somente metadados seguros. */}
  return '';
}
function requisitar(u, address, signal) {
  return new Promise((resolve,reject)=>{
    const req=https.get(u,{signal,agent:false,maxHeaderSize:16384,headers:{Accept:'text/html, application/xhtml+xml','Accept-Encoding':'identity'},lookup:(_host,opts,cb)=>opts.all?cb(null,[{address,family:4}]):cb(null,address,4)},res=>{
      if([301,302,303,307,308].includes(res.statusCode)){res.destroy();resolve({redirect:res.headers.location});return;}
      if(res.statusCode!==200||!/^text\/html\b|^application\/xhtml\+xml\b/i.test(res.headers['content-type']||'')||res.headers['content-encoding']&&res.headers['content-encoding']!=='identity'||Number(res.headers['content-length'])>262144){res.destroy();reject(Error('Página indisponível ou não suportada.'));return;}
      let size=0;const partes=[];res.on('data',b=>{size+=b.length;if(size>262144){res.destroy(Error('Página excedeu o limite.'));return;}partes.push(b);});res.on('end',()=>resolve({html:Buffer.concat(partes).toString('utf8')}));res.on('error',reject);
    });req.on('error',reject);
  });
}
async function buscarImagem(link,{resolver=dns.lookup,baixar=requisitar}={}) {
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8000);
  const limitado=p=>Promise.race([p,new Promise((_,reject)=>{if(controller.signal.aborted)reject(Error('Tempo esgotado.'));else controller.signal.addEventListener('abort',()=>reject(Error('Tempo esgotado.')),{once:true});})]);
  try{let u=urlPublica(link);for(let i=0;i<=2;i++){const address=await limitado(resolverPublico(u.hostname,resolver));const r=await limitado(baixar(u,address,controller.signal));if(r.redirect){if(i===2)throw Error('Muitos redirecionamentos.');u=urlPublica(r.redirect,u);continue;}const imagemUrl=extrairImagem(r.html,u);if(imagemUrl)await limitado(resolverPublico(new URL(imagemUrl).hostname,resolver));return {imagemUrl};}return {imagemUrl:''};}finally{clearTimeout(timer);controller.abort();}
}
async function operarImagem(db,request){
  const perfil=(await db.doc('users/'+request.auth.uid).get()).data();
  if(perfil?.ativo===false||perfil?.role!=='admin')throw new HttpsError('permission-denied','Somente administradores buscam imagens.');
  try{return await buscarImagem(request.data?.link);}catch{throw new HttpsError('invalid-argument','Não foi possível obter uma imagem segura dessa página. A imagem atual foi preservada.');}
}
module.exports={urlPublica,ipv4Publico,resolverPublico,extrairImagem,buscarImagem,operarImagem};
