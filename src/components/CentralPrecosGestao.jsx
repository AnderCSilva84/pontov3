import {lazy,Suspense,useState} from 'react';
const Editor=lazy(()=>import('./CentralPrecosEditor'));
export default function CentralPrecosGestao(){const [aberto,setAberto]=useState(false);return <details className="card" onToggle={e=>setAberto(e.currentTarget.open)}><summary>Contribuir com preços para a comunidade</summary>{aberto&&<Suspense fallback={<p role="status">Carregando opções…</p>}><Editor/></Suspense>}</details>;} 
