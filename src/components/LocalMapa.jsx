import {useEffect,useRef,useState} from 'react';
import {blocosMapa,buscarEndereco,coordenadasValidas,desprojetar,projetar} from '../utils/mapaLocal';
import '../styles/mapa-local.css';
export default function LocalMapa({latitude,longitude,raioMetros,endereco,onEndereco,onSelecionar}){
 const valido=coordenadasValidas(latitude,longitude),lat=Number(latitude),lon=Number(longitude);
 const [aberto,setAberto]=useState(false),[centro,setCentro]=useState({latitude:valido?lat:0,longitude:valido?lon:0}),[zoom,setZoom]=useState(valido?16:2),[resultados,setResultados]=useState([]),[ocupado,setOcupado]=useState(false),[erro,setErro]=useState('');
 const [falhaMapa,setFalhaMapa]=useState(false);
 const inicio=useRef(null),cache=useRef(new Map()),trava=useRef(false),controle=useRef(null),ultima=useRef(0),mapa=useRef(null);
 useEffect(()=>()=>controle.current?.abort(),[]);
 useEffect(()=>{if(valido)setCentro({latitude:lat,longitude:lon});},[valido,lat,lon]);
 function escolher(p){onSelecionar(p);setCentro(p);setZoom(16);setAberto(true);setResultados([]);}
 async function pesquisar(){
  if(trava.current)return;const chave=endereco.trim().toLocaleLowerCase('pt-BR');
  if(cache.current.has(chave)){const r=cache.current.get(chave);setResultados(r);setErro(r.length?'':'Endereço não encontrado. Inclua cidade e estado ou marque o ponto no mapa.');return;}
  if(Date.now()-ultima.current<2000){setErro('Aguarde alguns segundos antes de buscar novamente.');return;}
  trava.current=true;ultima.current=Date.now();setOcupado(true);setErro('');setResultados([]);controle.current=new AbortController();const timer=setTimeout(()=>controle.current?.abort(),8000);
  try{const r=await buscarEndereco(endereco,{signal:controle.current.signal});if(cache.current.size>=30)cache.current.delete(cache.current.keys().next().value);cache.current.set(chave,r);setResultados(r);if(!r.length)setErro('Endereço não encontrado. Inclua cidade e estado ou marque o ponto no mapa.');}
  catch(e){setErro(e.name==='AbortError'?'A busca não respondeu a tempo. Você pode escolher no mapa ou informar as coordenadas.':e.message);}
  finally{clearTimeout(timer);trava.current=false;setOcupado(false);}
 }
 function mover(dx,dy){const c=projetar(centro.latitude,centro.longitude,zoom);setCentro(desprojetar(c.x+dx,c.y+dy,zoom));}
 function soltar(e){const a=inicio.current;if(!a)return;inicio.current=null;const rect=e.currentTarget.getBoundingClientRect(),dx=(e.clientX-a.x)*400/rect.width,dy=(e.clientY-a.y)*300/rect.height;
  if(Math.hypot(dx,dy)>8){mover(-dx,-dy);return;}
  const c=projetar(centro.latitude,centro.longitude,zoom);onSelecionar(desprojetar(c.x+(e.clientX-rect.left)*400/rect.width-200,c.y+(e.clientY-rect.top)*300/rect.height-150,zoom));
 }
 const pin=valido?projetar(lat,lon,zoom):null,c=projetar(centro.latitude,centro.longitude,zoom),raio=Number(raioMetros)/(40075016.686*Math.max(.01,Math.cos(lat*Math.PI/180))/(256*2**zoom));
 return <section className="local-mapa"><label className="field"><span>Endereço do local</span><input value={endereco} maxLength={250} disabled={ocupado} placeholder="Rua, número, bairro, cidade e estado" onChange={e=>{onEndereco(e.target.value);setResultados([]);setErro('');}}/></label>
  <small>A busca envia o endereço ao serviço de mapas. Confira o resultado antes de salvar.</small><div className="local-mapa-acoes"><button type="button" className="btn btn-secondary" disabled={ocupado||endereco.trim().length<5} onClick={pesquisar}>{ocupado?'Buscando endereço…':'Buscar endereço'}</button><button type="button" className="btn btn-secondary" onClick={()=>setAberto(v=>!v)}>{aberto?'Ocultar mapa':'Abrir mapa'}</button></div>
  {erro&&<p role="alert">{erro}</p>}{resultados.length>0&&<ul className="local-mapa-resultados">{resultados.map((p,i)=><li key={i}><button type="button" onClick={()=>{onEndereco(p.endereco);escolher(p);}}>{p.endereco||'Resultado no mapa'}</button></li>)}</ul>}
  {aberto&&<><p>Arraste para navegar e toque para marcar. Ou use as setas do teclado e Enter para selecionar o centro.</p><div className="local-mapa-acoes"><button type="button" className="btn btn-secondary" aria-label="Aproximar mapa" disabled={zoom>=18} onClick={()=>setZoom(z=>z+1)}>+</button><button type="button" className="btn btn-secondary" aria-label="Afastar mapa" disabled={zoom<=2} onClick={()=>setZoom(z=>z-1)}>−</button><button type="button" className="btn btn-secondary" onClick={()=>onSelecionar(centro)}>Usar centro do mapa</button></div>
   <svg ref={mapa} className="local-mapa-visao" viewBox="0 0 400 300" role="application" aria-label="Mapa para selecionar o local autorizado" tabIndex={0} onPointerDown={e=>{inicio.current={x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerUp={soltar} onPointerCancel={()=>{inicio.current=null;}} onKeyDown={e=>{const delta={ArrowLeft:[-60,0],ArrowRight:[60,0],ArrowUp:[0,-60],ArrowDown:[0,60]}[e.key];if(delta){e.preventDefault();mover(...delta);}if(e.key==='Enter'){e.preventDefault();onSelecionar(centro);}}}>
    {blocosMapa(centro.latitude,centro.longitude,zoom).map(t=><image key={t.url+':'+t.x} href={t.url} x={t.x} y={t.y} width="256" height="256" onError={()=>setFalhaMapa(true)}/>)}
    <path d="M190 150h20M200 140v20" stroke="#111" strokeWidth="1"/>
    {pin&&<g transform={`translate(${pin.x-c.x+200} ${pin.y-c.y+150})`}>{Number.isFinite(raio)&&raio>0&&<circle r={raio} fill="#2855a025" stroke="#2855a0"/>}<circle r="7" fill="#c32932" stroke="white" strokeWidth="3"/></g>}
   </svg>{falhaMapa&&<p role="alert">Não foi possível carregar parte do mapa. Confira a conexão; você também pode usar a localização atual ou informar as coordenadas.</p>}<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a><small>O círculo representa o raio configurado. O mapa não altera a validação de localização do ponto.</small></>}
 </section>;
}
