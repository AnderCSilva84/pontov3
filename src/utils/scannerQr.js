// Leitura local: não conhece Firebase, URLs fiscais ou operações de importação.
export const preferirLeitorNativo = (plataforma, modo) => plataforma === 'android' && (modo === 'mobile' || modo === 'mobile-release');

export function normalizarLeituraQr(texto, origem = 'web') {
  if (typeof texto !== 'string' || !texto.trim() || texto.length > 4096) throw new Error('QR Code vazio ou grande demais. Tente outro código.');
  return { textoBruto: texto.trim(), formato: 'QR_CODE', origem };
}

export function erroCamera(erro) {
  if (erro?.code === 'camera/bloqueada') return erro;
  const mensagens = {
    NotAllowedError: 'Câmera não permitida. Em Configurações → Aplicativos → Tá no Ponto → Permissões → Câmera, permita durante o uso. No navegador, confira também a permissão do site.',
    NotFoundError: 'Nenhuma câmera disponível. Cole o link do QR Code como alternativa.',
    NotReadableError: 'A câmera está ocupada ou indisponível. Feche outros apps que usam a câmera e tente novamente.',
    OverconstrainedError: 'Esta câmera não está disponível. Escolha outra câmera e tente novamente.',
  };
  return new Error(mensagens[erro?.name] || 'Não foi possível iniciar a câmera. Tente novamente ou cole o link do QR Code.');
}

export async function permitirCamera(plugin, ativo = () => true) {
  let p = await plugin.checkPermissions();
  if (!ativo()) return;
  if (p.camera === 'denied') throw Object.assign(new Error('A câmera está bloqueada. Abra as configurações do Tá no Ponto e permita a câmera durante o uso. Depois toque em Tentar novamente.'), { code: 'camera/bloqueada' });
  if (p.camera !== 'granted') p = await plugin.requestPermissions({ permissions: ['camera'] });
  if (p.camera !== 'granted') throw Object.assign(new Error('Câmera não permitida. Você pode permitir em Configurações → Aplicativos → Tá no Ponto → Permissões → Câmera ou colar o link.'), { code: 'camera/bloqueada' });
}

// Somente números e categorias fixas; nunca recebe o texto ou a imagem do cupom.
export function criarDiagnosticoQr({ video, track, publicar, agendar = setTimeout, desagendar = clearTimeout, agora = () => performance.now() }) {
  let ativo = true, timer, anterior, falhas = 0;
  const contadores = { zxing: { tentativas: 0, ms: 0 }, fallback: { tentativas: 0, ms: 0 } };
  const seguro = fn => { try { return fn(); } catch { return undefined; } };
  const numero = n => Number.isFinite(n) ? n : null;
  const medir = (tipo, fn) => {
    if (!ativo) return fn();
    const inicio = seguro(agora);
    const fim = () => { if (ativo) { contadores[tipo].tentativas++; const t = seguro(agora); if (Number.isFinite(t) && Number.isFinite(inicio)) contadores[tipo].ms += Math.max(0, t - inicio); } };
    try {
      const r = fn();
      if (r && typeof r.then === 'function') return r.finally(fim);
      fim(); return r;
    } catch (e) { fim(); throw e; }
  };
  const amostrar = () => {
    if (!ativo) return;
    seguro(() => {
      const t = track(), settings = t?.getSettings?.() || {}, caps = t?.getCapabilities?.() || {};
      const tempo = numero(video.currentTime), avancando = anterior === undefined ? null : tempo !== null && tempo > anterior;
      anterior = tempo;
      const modos = ['none', 'manual', 'single-shot', 'continuous'].filter(m => caps.focusMode?.includes(m));
      publicar({ captura: t?.readyState === 'live' ? (t.muted ? 'silenciada' : 'ativa') : 'indisponivel',
        largura: numero(settings.width), altura: numero(settings.height), fps: numero(settings.frameRate),
        videoLargura: numero(video.videoWidth), videoAltura: numero(video.videoHeight), avancando,
        foco: modos, zoom: caps.zoom ? { min: numero(caps.zoom.min), max: numero(caps.zoom.max) } : null,
        zxing: { ...contadores.zxing }, fallback: { ...contadores.fallback }, falhas });
    });
  };
  const emitir = () => { amostrar(); if (ativo) timer = seguro(() => agendar(emitir, 1000)); };
  emitir();
  return { medir, falha: () => { if (ativo) falhas++; }, parar: () => { if (ativo) amostrar(); ativo = false; seguro(() => desagendar(timer)); } };
}

export function criarScannerQr({ video, cameraId, origem, carregarLeitor, obterStream, lerImagem, criarCanvas, permitir = async () => {}, contextoValido = () => true, aoLer, aoErro, aoCameras = () => {}, aoDiagnostico, agendar = setTimeout, desagendar = clearTimeout }) {
  let ativo = true, stream, controles, timer;
  const diagnostico = typeof aoDiagnostico === 'function' ? criarDiagnosticoQr({ video, track: () => stream?.getVideoTracks()[0], publicar: d => { if (ativo && contextoValido()) aoDiagnostico(d); }, agendar, desagendar }) : null;
  const parar = () => {
    diagnostico?.parar();
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
        const texto = await (diagnostico ? diagnostico.medir('fallback', () => lerImagem(canvas)) : lerImagem(canvas));
        if (texto) entregar(texto);
      }
    } catch { diagnostico?.falha(); /* Um frame sem QR não é erro de câmera. */ }
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
      const LeitorMedido = diagnostico ? class extends Leitor {
        decodeFromCanvas(canvas) { return diagnostico.medir('zxing', () => super.decodeFromCanvas(canvas)); }
      } : Leitor;
      controles = await new LeitorMedido(undefined, { delayBetweenScanAttempts: 200 }).decodeFromStream(stream, video, r => { if (r) entregar(r.getText()); });
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
