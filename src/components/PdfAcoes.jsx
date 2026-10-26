import { useState } from 'react';
import { entregarPdf, pdfAndroid } from '../services/pdfArquivos';
export function PdfAcoes({ arquivo, url, nome, onErro, preview = false }) {
  const [ocupado, setOcupado] = useState(false);
  async function agir(acao) {
    setOcupado(true);
    try { await entregarPdf(arquivo, acao); } catch (erro) { onErro(erro.message); } finally { setOcupado(false); }
  }
  if (!pdfAndroid()) return <>{preview && <div className="pdf-previa-documento"><iframe src={`${url}#toolbar=0`} title="Recibo" /></div>}<div className="pdf-arquivo-acoes"><a className="btn btn-secondary" href={url} download={nome}>Baixar PDF</a>{!preview && <a className="btn btn-secondary" href={url} target="_blank" rel="noopener noreferrer">Abrir / Imprimir</a>}</div></>;
  return <>{preview && <p>O PDF será aberto em um leitor externo do Android. Você também pode salvar ou compartilhar o arquivo.</p>}<div className="pdf-arquivo-acoes" aria-busy={ocupado}><button type="button" className="btn btn-secondary" disabled={ocupado} onClick={() => agir('abrir')}>Abrir PDF</button><button type="button" className="btn btn-secondary" disabled={ocupado} onClick={() => agir('salvar')}>Salvar PDF</button></div></>;
}
