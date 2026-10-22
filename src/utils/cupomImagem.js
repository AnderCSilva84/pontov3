// Preserva detalhes do QR em fotos grandes, sem reduzir primeiro a nota inteira.
export function recortesQr(largura, altura) {
  const lado = Math.min(largura, altura);
  return [
    { x: 0, y: 0, largura, altura },
    ...[1, .65].map(fator => {
      const tamanho = Math.round(lado * fator);
      return { x: Math.round((largura - tamanho) / 2), y: Math.round((altura - tamanho) / 2), largura: tamanho, altura: tamanho };
    }),
  ];
}

export async function lerImagemQr(imagem) {
  const [{ default: jsQR }, { BrowserQRCodeReader }] = await Promise.all([import('jsqr'), import('@zxing/browser')]);
  const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d', { willReadFrequently: true });
  const leitor = new BrowserQRCodeReader();
  for (const r of recortesQr(imagem.width, imagem.height)) {
    const escala = Math.min(1, 2400 / Math.max(r.largura, r.altura));
    canvas.width = Math.max(1, Math.round(r.largura * escala));
    canvas.height = Math.max(1, Math.round(r.altura * escala));
    ctx.drawImage(imagem, r.x, r.y, r.largura, r.altura, 0, 0, canvas.width, canvas.height);
    try { return leitor.decodeFromCanvas(canvas).getText(); } catch { /* Tenta o segundo leitor e os recortes. */ }
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const qr = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: 'attemptBoth' });
    if (qr?.data) return qr.data;
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  return null;
}
