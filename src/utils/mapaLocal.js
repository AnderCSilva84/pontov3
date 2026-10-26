const TAM=256,LIMITE=85.05112878;
export function coordenadasValidas(lat,lon){return lat!=null&&lon!=null&&String(lat).trim()!==''&&String(lon).trim()!==''&&Number.isFinite(Number(lat))&&Number.isFinite(Number(lon))&&Math.abs(Number(lat))<=90&&Math.abs(Number(lon))<=180;}
export function projetar(lat,lon,z){const s=TAM*2**z,r=Math.max(-LIMITE,Math.min(LIMITE,lat))*Math.PI/180;return {x:(lon+180)/360*s,y:(1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*s};}
export function desprojetar(x,y,z){const s=TAM*2**z;return {latitude:Math.atan(Math.sinh(Math.PI*(1-2*Math.max(0,Math.min(s,y))/s)))*180/Math.PI,longitude:((x/s*360)%360+360)%360-180};}
export function blocosMapa(lat,lon,z,largura=400,altura=300){
 const c=projetar(lat,lon,z),n=2**z,tiles=[];
 for(let x=Math.floor((c.x-largura/2)/256);x<=Math.floor((c.x+largura/2)/256);x++)for(let y=Math.floor((c.y-altura/2)/256);y<=Math.floor((c.y+altura/2)/256);y++)if(y>=0&&y<n)tiles.push({x:x*256-c.x+largura/2,y:y*256-c.y+altura/2,url:`https://tile.openstreetmap.org/${z}/${((x%n)+n)%n}/${y}.png`});
 return tiles;
}
export async function buscarEndereco(texto,{signal,fetchImpl=fetch}={}){
 const q=String(texto).trim();if(q.length<5||q.length>250)throw Error('Digite um endereço entre 5 e 250 caracteres, com cidade e estado.');
 const url=new URL('https://photon.komoot.io/api/');url.searchParams.set('q',q);url.searchParams.set('limit','5');
 const r=await fetchImpl(url,{signal,credentials:'omit',referrerPolicy:'strict-origin-when-cross-origin'});
 if(!r.ok)throw Error('Busca de endereço indisponível. Tente mais tarde ou escolha o ponto no mapa.');
 const json=await r.json();
 return (json.features||[]).slice(0,5).filter(f=>f.geometry?.type==='Point'&&coordenadasValidas(f.geometry.coordinates?.[1],f.geometry.coordinates?.[0])).map(f=>({latitude:Number(f.geometry.coordinates[1]),longitude:Number(f.geometry.coordinates[0]),endereco:[f.properties?.name,f.properties?.street,f.properties?.housenumber,f.properties?.district,f.properties?.city,f.properties?.state,f.properties?.country].filter(Boolean).join(', ').slice(0,500)}));
}
