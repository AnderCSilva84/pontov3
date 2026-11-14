// Normaliza os segmentos do JPEG do canvas para o contrato privado do servidor.
export function limparMetadadosJpeg(base64) {
  const texto=atob(base64),b=Uint8Array.from(texto,c=>c.charCodeAt(0));
  if(b[0]!==255||b[1]!==216||b.at(-2)!==255||b.at(-1)!==217)throw Error('Não foi possível preparar uma miniatura JPEG. Escolha outra foto.');
  const partes=[b.subarray(0,2)];let pos=2;
  while(pos<b.length-2){
    if(b[pos++]!==255)break;
    while(b[pos]===255)pos++;
    const marcador=b[pos++];
    if(marcador===218){partes.push(Uint8Array.of(255,marcador),b.subarray(pos));let resultado='';for(const parte of partes)for(let i=0;i<parte.length;i+=8192)resultado+=String.fromCharCode(...parte.subarray(i,i+8192));return btoa(resultado);}
    if(pos+2>b.length)break;
    const tamanho=(b[pos]<<8)|b[pos+1];if(tamanho<2||pos+tamanho>b.length)break;
    if(!((marcador>=225&&marcador<=239)||marcador===254))partes.push(Uint8Array.of(255,marcador),b.subarray(pos,pos+tamanho));
    pos+=tamanho;
  }
  throw Error('Não foi possível preparar esta foto. Escolha outra imagem.');
}
export async function prepararFotoPerfil(arquivo) {
  if(!arquivo||arquivo.size>8*1024*1024)throw Error('Escolha uma imagem de até 8 MB.');
  const b=new Uint8Array(await arquivo.slice(0,12).arrayBuffer());
  const jpeg=b[0]===255&&b[1]===216, png=[137,80,78,71,13,10,26,10].every((n,i)=>b[i]===n),webp=String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP';
  if(!jpeg&&!png&&!webp)throw Error('Escolha uma foto JPEG, PNG ou WebP.');
  const url=URL.createObjectURL(arquivo);
  try {
    const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('Não foi possível ler esta foto.'));i.src=url;});
    if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth*img.naturalHeight>40000000)throw Error('Escolha uma imagem menor.');
    const canvas=document.createElement('canvas'),escala=Math.min(1,192/Math.max(img.naturalWidth,img.naturalHeight));
    canvas.width=Math.max(1,Math.round(img.naturalWidth*escala));canvas.height=Math.max(1,Math.round(img.naturalHeight*escala));
    const ctx=canvas.getContext('2d');if(!ctx)throw Error('Não foi possível preparar a foto neste aparelho.');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
    for(const q of [.8,.6,.4]) {const dados=canvas.toDataURL('image/jpeg',q);if(!dados.startsWith('data:image/jpeg;base64,'))throw Error('Este navegador não conseguiu preparar uma foto JPEG. Tente outro navegador.');const foto=limparMetadadosJpeg(dados.split(',')[1]);if(foto.length<=32768)return foto;}
    throw Error('A miniatura ainda está grande. Escolha outra foto.');
  } finally {URL.revokeObjectURL(url);}
}
