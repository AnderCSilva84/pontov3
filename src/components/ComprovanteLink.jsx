import { pdfAndroid } from '../services/pdfArquivos';
import { abrirComprovanteExterno } from '../services/comprovanteExterno';
export function ComprovanteLink({ url, children, onErro }) {
  return <a className="btn btn-secondary" href={url} target="_blank" rel="noopener noreferrer" onClick={async e => {
    if (!pdfAndroid()) return;
    e.preventDefault();
    try { await abrirComprovanteExterno(url); } catch (erro) { onErro(erro.message); }
  }}>{children}</a>;
}
