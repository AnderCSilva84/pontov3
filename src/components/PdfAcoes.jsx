import { useState } from 'react';
import { entregarPdf, pdfAndroid } from '../services/pdfArquivos';
export function PdfAcoes({ arquivo, url, nome, onErro, preview = false }) {
  const [ocupado, setOcupado] = useState(false);
  async function agir(acao) {
    setOcupado(true);
    try { await entregarPdf(arquivo, acao); } catch (erro) { onErro(erro.message); } finally { setOcupado(false); }
  }
  if (!pdfAndroid()) return <>{preview && <div className="pdf-previa-documento"><iframe src={`${url}#toolbar=0&navpanes=0&view=FitH`} title={nome||"Visualização do documento"} /></div>}<div className="pdf-arquivo-acoes"><a className="btn btn-secondary" href={url} download={nome}>Baixar PDF</a>{!preview && <a className="btn btn-secondary" href={url} target="_blank" rel="noopener noreferrer">Abrir / Imprimir</a>}</div></>;
  return <>{preview && <p>Prévia disponível no leitor do Android. Abra o PDF ou salve uma cópia no aparelho.</p>}<div className="pdf-arquivo-acoes" aria-busy={ocupado}><button type="button" className="btn btn-secondary" disabled={ocupado} onClick={() => agir('abrir')}>Abrir PDF</button><button type="button" className="btn btn-secondary" disabled={ocupado} onClick={() => agir('salvar')}>Salvar PDF</button></div></>;
}
