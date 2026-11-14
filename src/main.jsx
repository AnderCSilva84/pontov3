import { StrictMode, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import "./styles/index.css";
import './styles/redesign.css'
import './styles/forms.css'
import {configurarInteracaoInstalada} from './utils/interacaoInstalada';

configurarInteracaoInstalada();

const montar = modulo => {
  createRoot(document.getElementById('root')).render(<StrictMode>{createElement(modulo.default)}</StrictMode>);
};
if (import.meta.env.MODE === 'mobile' && import.meta.env.VITE_AP1303_QR_NATIVO_TESTE === 'true' && import.meta.env.VITE_AP1303_DESTINO === 'teste' && import.meta.env.VITE_TEST_FIREBASE_EMULADORES === 'true') {
  import('./pages/CompararQrAndroid.jsx').then(montar);
} else if (import.meta.env.DEV && import.meta.env.VITE_AP1303_DESTINO === 'emuladores' && window.location.pathname === '/diagnostico-qr') {
  import('./pages/DiagnosticoQr.jsx').then(montar);
} else {
  import('./App.jsx').then(montar);
}
