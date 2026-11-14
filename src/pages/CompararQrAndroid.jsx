import { useEffect, useRef, useState } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { App as appNativo } from '@capacitor/app';
import CameraCupom from '../components/CameraCupom';
import TesteQrNativo from '../components/TesteQrNativo';
import { criarTesteQrNativo } from '../utils/scannerQrNativo';
import { preferirLeitorNativo } from '../utils/scannerQr';
import { filtrarDiagnosticoNativo } from '../utils/diagnosticoQrNativo';
import { conectarCicloMobile } from '../services/cicloMobile';
import '../styles/compras.css';

const plugin = registerPlugin('CameraQr');
function iniciar(opcoes) {
  const s = criarTesteQrNativo({ ...opcoes, plugin });
  const pausar = () => s.pausar(), retomar = () => s.retomar();
  const ocultar = () => { if (document.hidden) pausar(); else retomar(); };
  const cancelar = () => { s.parar(); opcoes.aoCancelar(); };
  const voltar = e => { e.preventDefault(); cancelar(); };
  window.addEventListener('ap1303-pausar', pausar);
  window.addEventListener('ap1303-retomar', retomar);
  window.addEventListener('ap1303-voltar', voltar);
  window.addEventListener('pagehide', cancelar);
  document.addEventListener('visibilitychange', ocultar);
  return { ...s, parar() {
    s.parar();
    window.removeEventListener('ap1303-pausar', pausar);
    window.removeEventListener('ap1303-retomar', retomar);
    window.removeEventListener('ap1303-voltar', voltar);
    window.removeEventListener('pagehide', cancelar);
    document.removeEventListener('visibilitychange', ocultar);
  } };
}
export default function CompararQrAndroid() {
  const [leitor, setLeitor] = useState(''), [mensagem, setMensagem] = useState('');
  const [diagnostico, setDiagnostico] = useState(null), [erroDiagnostico, setErroDiagnostico] = useState('');
  const diagnosticoAtivo = useRef(false), montado = useRef(true), versaoDiagnostico = useRef(0);
  useEffect(() => conectarCicloMobile({ app: appNativo, janela: window, documento: document }), []);
  useEffect(() => {
    montado.current = true;
    versaoDiagnostico.current++;
    return () => {
      montado.current = false;
      if (diagnosticoAtivo.current) plugin.diagnosticoSessaoNativa({ ativo: false }).catch(() => {});
    };
  }, []);
  if (import.meta.env.MODE !== 'mobile' || import.meta.env.VITE_AP1303_QR_NATIVO_TESTE !== 'true' || import.meta.env.VITE_AP1303_DESTINO !== 'teste' || import.meta.env.VITE_TEST_FIREBASE_EMULADORES !== 'true' || Capacitor.getPlatform() !== 'android') return null;
  const fechar = () => setLeitor('');
  const sucesso = () => { setMensagem('QR reconhecido e aceito pela validação local. Nenhum conteúdo foi salvo.'); fechar(); };
  const atualizarDiagnostico = async () => {
    const rodada = ++versaoDiagnostico.current;
    diagnosticoAtivo.current = true;
    try {
      const estado = await plugin.diagnosticoSessaoNativa({ ativo: true });
      if (montado.current && rodada === versaoDiagnostico.current) { setDiagnostico(filtrarDiagnosticoNativo(estado)); setErroDiagnostico(''); }
      else if (!montado.current) await plugin.diagnosticoSessaoNativa({ ativo: false });
    } catch { if (montado.current && rodada === versaoDiagnostico.current) setErroDiagnostico('Diagnóstico indisponível. O leitor permanece independente.'); }
  };
  const desativarDiagnostico = async () => {
    versaoDiagnostico.current++;
    diagnosticoAtivo.current = false; setDiagnostico(null); setErroDiagnostico('');
    try { await plugin.diagnosticoSessaoNativa({ ativo: false }); } catch { /* Não interfere no leitor. */ }
  };
  return <main className="compras-form"><h1>Tá no Ponto · Recuperação de sessão · Validação 5</h1><p>APK atualizado de validação: sem login, importação ou consulta à SEFA. A preparação do módulo Google pode usar internet.</p>
    <button type="button" onClick={atualizarDiagnostico}>{diagnostico ? 'Atualizar estado nativo' : 'Ativar diagnóstico de retomada'}</button>
    {diagnostico && <section aria-label="Diagnóstico local de retomada"><p>Contadores locais desde a ativação. Atualização manual; nenhum conteúdo do QR é coletado.</p><pre>{JSON.stringify(diagnostico, null, 2)}</pre><button type="button" onClick={desativarDiagnostico}>Desativar diagnóstico</button></section>}
    {erroDiagnostico && <p role="status">{erroDiagnostico}</p>}
    {!leitor && <button type="button" onClick={() => { setMensagem(''); setLeitor(preferirLeitorNativo(Capacitor.getPlatform(), import.meta.env.MODE) ? 'nativo' : 'web'); }}>Escanear QR Code</button>}
    {leitor === 'web' && <CameraCupom aoLer={sucesso} fechar={fechar} />}
    {leitor === 'nativo' && <TesteQrNativo usarAlternativo={() => setLeitor('web')} iniciar={iniciar} aoLer={sucesso} fechar={fechar} />}
    {mensagem && <p role="status">{mensagem}</p>}
  </main>;
}
