import { Capacitor, registerPlugin } from '@capacitor/core';
import { auth } from './firebase';
import { obterGrupoAtual } from './dadosGrupo';
import { criarScannerQr, permitirCamera } from '../utils/scannerQr';
import { lerImagemQr } from '../utils/cupomImagem';

const CameraQr = registerPlugin('CameraQr');
let scannerAtual;
export const contextoScanner = () => `${auth.currentUser?.uid || ''}:${obterGrupoAtual() || ''}`;
export function iniciarScannerQr(opcoes) {
  scannerAtual?.parar();
  const contexto = contextoScanner(), plataforma = Capacitor.getPlatform();
  scannerAtual = criarScannerQr({
    ...opcoes,
    origem: plataforma === 'android' ? 'android-webview' : plataforma === 'ios' ? 'ios-webview' : 'web',
    permitir: plataforma === 'android' ? ativo => permitirCamera(CameraQr, ativo) : undefined,
    contextoValido: () => contexto === contextoScanner(),
    carregarLeitor: () => import('@zxing/browser').then(m => m.BrowserQRCodeReader),
    obterStream: c => navigator.mediaDevices.getUserMedia(c),
    criarCanvas: () => document.createElement('canvas'),
    lerImagem: lerImagemQr,
  });
  return scannerAtual;
}
export async function abrirConfiguracoesCamera() {
  if (Capacitor.getPlatform() === 'android') await CameraQr.abrirConfiguracoes();
}
export const cameraAndroid = () => Capacitor.getPlatform() === 'android';
