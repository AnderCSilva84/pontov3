export async function reduzirFotoPrato(arquivo){
 if(!arquivo||arquivo.size>15*1024*1024||!/^image\/(jpeg|png|webp|heic|heif)$/.test(arquivo.type))throw Error('Escolha uma foto JPEG, PNG ou WebP de até 15 MB.');
 const url=URL.createObjectURL(arquivo);
 try{
  const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('Não foi possível ler a foto. Tente uma imagem JPEG.'));i.src=url;});
  const canvas=document.createElement('canvas');let resultado='';
  for(const limite of [1000,640,400]){
   const escala=Math.min(1,limite/Math.max(img.width,img.height));canvas.width=Math.max(1,Math.round(img.width*escala));canvas.height=Math.max(1,Math.round(img.height*escala));const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
   for(const qualidade of [.82,.65,.45]){resultado=canvas.toDataURL('image/jpeg',qualidade);if(resultado.length<=180000)return resultado;}
  }
  throw Error('A foto ainda está grande. Escolha uma imagem menor.');
 }finally{URL.revokeObjectURL(url);}
}
