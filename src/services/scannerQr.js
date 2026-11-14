import { auth } from './firebase';
import { obterGrupoAtual } from './dadosGrupo';
import { iniciarScannerQrCamera } from './scannerQrCamera';
export { abrirConfiguracoesCamera, cameraAndroid } from './scannerQrCamera';
export const contextoScanner = () => `${auth.currentUser?.uid || ''}:${obterGrupoAtual() || ''}`;
export function iniciarScannerQr(opcoes) {
  const contexto = contextoScanner();
  return iniciarScannerQrCamera({ ...opcoes, contextoValido: () => contexto === contextoScanner() });
}
