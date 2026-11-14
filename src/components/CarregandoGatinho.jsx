import '../styles/carregando.css';
import {useEffect,useState} from 'react';
import {Icon} from './ui';
export default function CarregandoGatinho(){
 const [online,setOnline]=useState(navigator.onLine);
 useEffect(()=>{const atualizar=()=>setOnline(navigator.onLine);window.addEventListener('online',atualizar);window.addEventListener('offline',atualizar);return()=>{window.removeEventListener('online',atualizar);window.removeEventListener('offline',atualizar);};},[]);
 return <div className={`carregando-gatinho${online?'':' carregando-offline'}`}><img className="carregando-marca" src="/marca-ta-no-ponto.png" alt="Tá no Ponto"/><span className="carregando-simbolo" aria-hidden="true"><Icon name="clock"/></span><p role="status" aria-live="polite">{online?'Carregando o Tá no Ponto…':'Sem conexão. Aguardando os dados disponíveis neste aparelho.'}</p><button type="button" className="btn btn-secondary" onClick={()=>window.location.reload()}>Tentar abrir novamente</button><small>Suas pendências locais serão preservadas.</small></div>;
}
