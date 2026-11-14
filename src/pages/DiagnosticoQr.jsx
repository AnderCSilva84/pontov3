import { useState } from 'react';
import CameraCupom from '../components/CameraCupom';
import '../styles/compras.css';
export default function DiagnosticoQr() {
  const [aberto, setAberto] = useState(false), [resultado, setResultado] = useState('');
  if (!import.meta.env.DEV || import.meta.env.VITE_AP1303_DESTINO !== 'emuladores') return null;
  return <main className="compras-form"><h1>Diagnóstico local de QR Code</h1><p>Sem login, importação ou consulta externa. O conteúdo lido não é exibido nem salvo.</p>
    {aberto ? <CameraCupom aoLer={() => { setResultado('QR decodificado e aceito pela validação local.'); setAberto(false); }} fechar={() => setAberto(false)} /> : <button type="button" onClick={() => { setResultado(''); setAberto(true); }}>Abrir leitor</button>}
    {resultado && <p role="status">{resultado}</p>}
  </main>;
}
