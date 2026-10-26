// Leitura local: não conhece Firebase, URLs fiscais ou operações de importação.
export function normalizarLeituraQr(texto, origem = 'web') {
  if (typeof texto !== 'string' || !texto.trim() || texto.length > 4096) throw new Error('QR Code vazio ou grande demais. Tente outro código.');
  return { textoBruto: texto.trim(), formato: 'QR_CODE', origem };
}

export function erroCamera(erro) {
  if (erro?.code === 'camera/bloqueada') return erro;
  const mensagens = {
    NotAllowedError: 'Câmera não permitida. Em Configurações → Aplicativos → AP1303 → Permissões → Câmera, permita durante o uso. No navegador, confira também a permissão do site.',
    NotFoundError: 'Nenhuma câmera disponível. Cole o link do QR Code como alternativa.',
    NotReadableError: 'A câmera está ocupada ou indisponível. Feche outros apps que usam a câmera e tente novamente.',
    OverconstrainedError: 'Esta câmera não está disponível. Escolha outra câmera e tente novamente.',
  };
  return new Error(mensagens[erro?.name] || 'Não foi possível iniciar a câmera. Tente novamente ou cole o link do QR Code.');
}

export async function permitirCamera(plugin, ativo = () => true) {
  let p = await plugin.checkPermissions();
  if (!ativo()) return;
  if (p.camera === 'denied') throw Object.assign(new Error('A câmera está bloqueada. Abra as configurações do AP1303 e permita a câmera durante o uso. Depois toque em Tentar novamente.'), { code: 'camera/bloqueada' });
  if (p.camera !== 'granted') p = await plugin.requestPermissions({ permissions: ['camera'] });
  if (p.camera !== 'granted') throw Object.assign(new Error('Câmera não permitida. Você pode permitir em Configurações → Aplicativos → AP1303 → Permissões → Câmera ou colar o link.'), { code: 'camera/bloqueada' });
}

export function criarScannerQr({ video, cameraId, origem, carregarLeitor, obterStream, lerImagem, criarCanvas, permitir = async () => {}, contextoValido = () => true, aoLer, aoErro, aoCameras = () => {}, agendar = setTimeout, desagendar = clearTimeout }) {
  let ativo = true, stream, controles, timer;
  const parar = () => {
    ativo = false; desagendar(timer);
    try { controles?.stop(); } catch { /* Libera tracks mesmo se o leitor já encerrou. */ }
    stream?.getTracks().forEach(t => { try { t.stop(); } catch { /* Track já encerrada. */ } });
    if (video.srcObject === stream) video.srcObject = null;
  };
  const falhar = e => { if (!ativo) return; parar(); if (contextoValido()) aoErro(erroCamera(e)); };
  const entregar = texto => {
    if (!ativo) return;
    if (!contextoValido()) { parar(); return; }
    let resultado;
    try { resultado = normalizarLeituraQr(texto, origem); } catch (e) { parar(); aoErro(e); return; }
    parar(); aoLer(resultado);
  };
  async function quadroAlternativo() {
    if (!ativo || !contextoValido()) { parar(); return; }
    let canvas;
    try {
      if (video.videoWidth) {
        canvas = criarCanvas();
        const escala = Math.min(1, 1920 / Math.max(video.videoWidth, video.videoHeight));
        canvas.width = Math.round(video.videoWidth * escala); canvas.height = Math.round(video.videoHeight * escala);
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        const texto = await lerImagem(canvas);
        if (texto) entregar(texto);
      }
    } catch { /* Um frame sem QR não é erro de câmera. */ }
    finally { if (canvas) { canvas.width = 0; canvas.height = 0; } }
    if (ativo) timer = agendar(quadroAlternativo, 1800);
  }
  const pronto = (async () => {
    try {
      await permitir(() => ativo && contextoValido());
      if (!ativo || !contextoValido()) { parar(); return; }
      const Leitor = await carregarLeitor();
      if (!ativo) return;
      stream = await obterStream({ video: { ...(cameraId ? { deviceId: { exact: cameraId } } : { facingMode: { ideal: 'environment' } }), width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      if (!ativo || !contextoValido()) { parar(); return; }
      const track = stream.getVideoTracks()[0];
      if (track.getCapabilities?.().focusMode?.includes('continuous')) await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
      if (!ativo || !contextoValido()) { parar(); return; }
      aoCameras(track.getSettings?.().deviceId || '');
      controles = await new Leitor(undefined, { delayBetweenScanAttempts: 200 }).decodeFromStream(stream, video, r => { if (r) entregar(r.getText()); });
      if (!ativo) { parar(); return; }
      timer = agendar(quadroAlternativo, 1800);
    } catch (e) { falhar(e); }
  })();
  return { parar, pronto };
}

export function conectarCicloScanner(janela, documento, cancelar) {
  const voltar = e => { e.preventDefault(); cancelar(); };
  const ocultar = () => { if (documento.hidden) cancelar(); };
  const eventos = ['ap1303-pausar', 'ap1303-ponto-sair', 'ap1303-contexto-alterado', 'popstate', 'pagehide'];
  eventos.forEach(n => janela.addEventListener(n, cancelar));
  janela.addEventListener('ap1303-voltar', voltar);
  documento.addEventListener('visibilitychange', ocultar);
  return () => {
    eventos.forEach(n => janela.removeEventListener(n, cancelar));
    janela.removeEventListener('ap1303-voltar', voltar);
    documento.removeEventListener('visibilitychange', ocultar);
  };
}
