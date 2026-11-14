export function configurarInteracaoInstalada(janela=window, documento=document) {
  const modo = janela.matchMedia('(display-mode: standalone)');
  const instalada = () => modo.matches || janela.navigator.standalone === true;
  const bloquearGesto = e => { if (instalada()) e.preventDefault(); };
  const bloquearPinca = e => { if (instalada() && e.touches.length > 1) e.preventDefault(); };
  const meta = documento.querySelector('meta[name="viewport"]'), anterior = meta?.content;
  const aplicar = () => {
    documento.documentElement.classList.toggle('ap1303-instalado', instalada());
    if (meta) meta.content = instalada() ? 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover' : anterior;
  };
  aplicar(); modo.addEventListener('change',aplicar);
  for(const nome of ['gesturestart','gesturechange']) documento.addEventListener(nome,bloquearGesto,{passive:false});
  documento.addEventListener('touchmove',bloquearPinca,{passive:false});
  return () => {
    modo.removeEventListener('change',aplicar);
    for(const nome of ['gesturestart','gesturechange']) documento.removeEventListener(nome,bloquearGesto);
    documento.removeEventListener('touchmove',bloquearPinca);
    documento.documentElement.classList.remove('ap1303-instalado');
    if (meta) meta.content = anterior;
  };
}
