import { Capacitor } from '@capacitor/core';
import { registerPlugin } from '@capacitor/core';
const ponte = registerPlugin('PdfArquivos');
export function urlExternaSegura(valor) {
  try { const u = new URL(valor); return ['http:', 'https:'].includes(u.protocol) && !u.username && !u.password ? u.href : null; } catch { return null; }
}
export async function abrirComprovanteExterno(valor) {
  const url = urlExternaSegura(valor); if (!url) throw new Error('Link de comprovante inválido.');
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') { await ponte.externo({ url }); return true; }
  return false;
}
