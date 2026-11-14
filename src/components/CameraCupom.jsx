import { useEffect, useRef, useState } from 'react';
import { iniciarScannerQrCamera, abrirConfiguracoesCamera, cameraAndroid } from '../services/scannerQrCamera';
import { conectarCicloScanner } from '../utils/scannerQr';
import { normalizarQrCupom } from '../utils/cupomQr';
const destinoSeguro = normalizarQrCupom;
const adaptadorLocal = { iniciar: iniciarScannerQrCamera };
export default function CameraCupom({ aoLer, fechar, aoResumo, adaptador = adaptadorLocal }) {
  const ultimaMedida = useRef(null);
  const [diagnostico, setDiagnostico] = useState(false), [medidas, setMedidas] = useState(null);
  const [etapa, setEtapa] = useState('Aguardando captura');
  const video = useRef(null), [erro, setErro] = useState(''), [ajuda, setAjuda] = useState(false);
  const [cameras, setCameras] = useState([]), [cameraId, setCameraId] = useState(''), [cameraAtual, setCameraAtual] = useState('');
  const [tentativa, setTentativa] = useState(0);
  const callbacks = useRef({ aoLer, fechar, aoResumo });
  useEffect(() => { callbacks.current = { aoLer, fechar, aoResumo }; }, [aoLer, fechar, aoResumo]);
  useEffect(() => {
    let ativo = true;
    const timer = setTimeout(() => { if (ativo) setAjuda(true); }, 15000);
    const scanner = adaptador.iniciar({ video: video.current, cameraId,
      aoDiagnostico: diagnostico ? d => { if (ativo) { ultimaMedida.current = d; setMedidas(d); } } : undefined,
      aoLer: resultado => {
        if (!ativo) return;
        clearTimeout(timer);
        if (!destinoSeguro(resultado.textoBruto)) { if (diagnostico) setEtapa('Decodificado; validação fiscal recusada'); setErro('Este QR Code não é uma NFC-e do Pará compatível. Tente novamente ou cole o link da nota.'); return; }
        if (diagnostico) { setEtapa('Decodificado; validação fiscal aceita'); callbacks.current.aoResumo?.(ultimaMedida.current); }
        callbacks.current.aoLer(resultado.textoBruto);
      },
      aoErro: e => { if (ativo) { clearTimeout(timer); if (diagnostico) setEtapa('Falha ao iniciar captura'); setErro(e.message); } },
      aoCameras: id => {
        if (!ativo) return;
        if (diagnostico) setEtapa('Captura iniciada; aguardando decodificação');
        setCameraAtual(id);
        navigator.mediaDevices.enumerateDevices().then(ds => { if (ativo) setCameras(ds.filter(d => d.kind === 'videoinput')); }).catch(() => {});
      },
    });
    const cancelar = () => { scanner.parar(); callbacks.current.fechar(); };
    const sairCiclo = conectarCicloScanner(window, document, cancelar);
    const sairAuth = adaptador.observarCancelamento?.(cancelar) || (() => {});
    return () => {
      ativo = false; clearTimeout(timer); scanner.parar(); sairAuth();
      sairCiclo();
    };
  }, [cameraId, tentativa, diagnostico, adaptador]);
  const reiniciar = () => { setErro(''); setAjuda(false); setTentativa(t => t + 1); };
  return <section className="compras-form" aria-label="Leitor de QR Code"><label><input type="checkbox" checked={diagnostico} onChange={e => { setMedidas(null); setEtapa('Aguardando captura'); setErro(''); setAjuda(false); setDiagnostico(e.target.checked); }} /> Diagnóstico local (reinicia a leitura)</label>{diagnostico && <aside aria-label="Diagnóstico local do leitor"><small>Somente nesta sessão. Nenhum dado é salvo ou enviado.</small><p>{etapa}</p>{medidas && <dl><dt>Captura</dt><dd>{medidas.captura}; avanço dos frames: {medidas.avancando === null ? 'aguardando' : medidas.avancando ? 'sim' : 'não'}</dd><dt>Resolução / FPS informados pela captura</dt><dd>{medidas.largura ?? '?'} × {medidas.altura ?? '?'} / {medidas.fps ?? '?'}</dd><dt>Vídeo efetivo</dt><dd>{medidas.videoLargura ?? '?'} × {medidas.videoAltura ?? '?'}</dd><dt>Capacidades de foco / zoom</dt><dd>{medidas.foco.join(', ') || 'não informado'} / {medidas.zoom ? String(medidas.zoom.min) + '–' + String(medidas.zoom.max) : 'não informado'}</dd><dt>ZXing: tentativas / tempo acumulado</dt><dd>{medidas.zxing.tentativas} / {Math.round(medidas.zxing.ms)} ms</dd><dt>Fallback: ciclos / tempo acumulado</dt><dd>{medidas.fallback.tentativas} / {Math.round(medidas.fallback.ms)} ms; falhas internas: {medidas.falhas}</dd></dl>}</aside>}<div className="cupom-camera-quadro"><video ref={video} autoPlay muted playsInline className="cupom-camera" aria-label="Câmera para ler o QR Code" /><span aria-hidden="true" /></div><p>Posicione o QR Code inteiro no centro, com boa luz.</p>{cameras.length > 1 && <label className="field"><span>Trocar câmera</span><select value={cameraId || cameraAtual} onChange={e => { setErro(''); setAjuda(false); setCameraId(e.target.value); }}>{cameras.map((c, i) => <option key={c.deviceId} value={c.deviceId}>{c.label || `Câmera ${i + 1}`}</option>)}</select></label>}{ajuda && !erro && <p role="status">Afaste um pouco o celular até ficar nítido ou cole o link como alternativa.</p>}{erro && <><p role="alert">{erro}</p><button type="button" className="btn btn-secondary" onClick={reiniciar}>Tentar novamente</button>{cameraAndroid() && <button type="button" className="btn btn-secondary" onClick={() => abrirConfiguracoesCamera().catch(() => setErro('Abra Configurações → Aplicativos → Tá no Ponto → Permissões → Câmera.'))}>Configurações da câmera</button>}</>}<button type="button" className="btn btn-secondary" onClick={fechar}>Cancelar leitura</button></section>;
}
