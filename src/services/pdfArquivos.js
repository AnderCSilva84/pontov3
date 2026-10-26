import { Capacitor, registerPlugin } from '@capacitor/core';
import { auth } from './firebase';
import { obterGrupoAtual } from './dadosGrupo';
const ponte = registerPlugin('PdfArquivos');
export const pdfAndroid = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
export async function limparPdfsConta(uid){if(pdfAndroid())await ponte.limparConta({uid});}
const contextos = new WeakMap();
const escritos = new WeakMap();
let geracao = 0;
const contexto = () => `${auth.currentUser?.uid || ''}:${obterGrupoAtual() || ''}:${geracao}`;
export function registrarPdf(arquivo) { contextos.set(arquivo, contexto()); return arquivo; }
export function validarPdf(arquivo) {
  if (!arquivo || contextos.get(arquivo) !== contexto()) throw new Error('A sessão mudou. Gere o PDF novamente.');
}
let operacao;
let arquivoEmUso, acaoEmUso;
export function nomePdfSeguro(nome) {
  return String(nome || 'Documento.pdf').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 100).replace(/\.pdf$/i, '') + '.pdf';
}
export async function entregarPdf(arquivo, acao = 'abrir') {
  if (!['abrir', 'compartilhar', 'salvar', 'escolher'].includes(acao)) throw new Error('Ação de PDF inválida.');
  if (operacao) {
    if (arquivoEmUso === arquivo && acaoEmUso === acao) return operacao;
    throw new Error('Conclua ou cancele a ação de PDF já aberta.');
  }
  arquivoEmUso = arquivo; acaoEmUso = acao;
  operacao = (async () => {
    validarPdf(arquivo);
    if (!pdfAndroid()) return false;
    let escrito = escritos.get(arquivo);
    const contextoId = contexto();
    if (!escrito) {
      const bytes = new Uint8Array(await arquivo.arrayBuffer());
      if (bytes.length > 20 * 1024 * 1024) throw new Error('PDF muito grande para abrir no aparelho.');
      let texto = ''; for (let i = 0; i < bytes.length; i += 8192) texto += String.fromCharCode(...bytes.subarray(i, i + 8192));
      validarPdf(arquivo);
      escrito = await ponte.escrever({ base64: btoa(texto), nome: nomePdfSeguro('AP1303.pdf'), contexto: contextoId });
      validarPdf(arquivo);
      escritos.set(arquivo, escrito);
    }
    validarPdf(arquivo);
    await ponte.executar({ id: escrito.id, acao, contexto: contextoId });
    validarPdf(arquivo);
    return true;
  })().finally(() => { operacao = null; arquivoEmUso = null; acaoEmUso = null; });
  return operacao;
}
if (typeof window !== 'undefined') {
  const invalidar = () => { geracao++; if (pdfAndroid()) ponte.invalidar().catch(() => {}); };
  window.addEventListener('ap1303-contexto-alterado', invalidar);
  window.addEventListener('ap1303-ponto-sair', invalidar);
}
