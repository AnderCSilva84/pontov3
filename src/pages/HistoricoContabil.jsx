import ListaHistorico from '../components/ListaHistorico';
import IdentidadeFuncionario from '../components/IdentidadeFuncionario';
import { PdfAcoes } from '../components/PdfAcoes';
import { registrarPdf, validarPdf } from '../services/pdfArquivos';
import { useEffect, useState } from 'react';
import { getDocs, query, where } from 'firebase/firestore';
import { collection } from '../services/dadosGrupo';
import { db } from '../services/firebase';
import { PageHeader } from '../components/ui';
import BottomNav from '../components/BottomNav';
import { ComprovanteLink } from '../components/ComprovanteLink';
import { urlComprovante } from '../utils/comprovantes';

export default function HistoricoContabil({ user, onNavigate }) {
  const [mes, setMes] = useState(() => new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 7));
  const [consulta, setConsulta] = useState(null), [tentativa, setTentativa] = useState(0);
  const [pdf, setPdf] = useState(null), [erroArquivo, setErroArquivo] = useState(''), [gerando, setGerando] = useState(false);
  useEffect(() => () => { if (pdf?.url) URL.revokeObjectURL(pdf.url); }, [pdf]);
  const chave = `${user.uid}:${user.grupoId || ''}:${mes}`;
  useEffect(() => {
    let atual = true;
    const fontes = [['financeiro', 'competenciaMes'], ['folhasPagamento', 'competencia'], ['documentosTrabalhistas', 'mesReferencia']];
    Promise.all(fontes.map(async ([nome, campo]) => {
      const snap = await getDocs(mes === 'todas' ? collection(db, nome) : query(collection(db, nome), where(campo, '==', mes)));
      return [nome, snap.docs.map(d => ({ ...d.data(), id: d.id })).sort((a,b)=>String(b.dataPagamento||b.competencia||b.mesReferencia||"").localeCompare(String(a.dataPagamento||a.competencia||a.mesReferencia||""))||a.id.localeCompare(b.id))];
    })).then(r => { if (atual) setConsulta({ chave, dados: Object.fromEntries(r) }); })
      .catch(() => { if (atual) setConsulta({ chave, erro: true }); });
    return () => { atual = false; };
  }, [chave, mes, tentativa]);
  const dados = consulta?.chave === chave ? consulta.dados : null;
  const moeda = n => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  async function exportar() {
    if (!dados || gerando) return;
    const sessao = registrarPdf({}); setGerando(true); setErroArquivo('');
    try {
      const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
      validarPdf(sessao);
      const documento = new jsPDF(); documento.text('Histórico contábil · ' + mes, 14, 18);
      const linhas = [
        ...dados.financeiro.map(r => ['Pagamento', r.funcionarioNome || r.funcionarioId || '', r.competenciaMes || r.dataPagamento || '', r.tipoLabel || r.tipo || '', moeda(r.valorLiquido ?? r.valor)]),
        ...dados.folhasPagamento.map(r => ['Folha', r.funcionarioNome || r.funcionarioId || '', r.competencia || '', r.status || '', moeda(r.liquido)]),
        ...dados.documentosTrabalhistas.map(r => ['Documento', r.funcionarioNome || r.funcionarioId || '', r.mesReferencia || '', r.titulo || '', urlComprovante(r.url) || '']),
      ];
      autoTable(documento, { startY: 25, head: [['Registro', 'Funcionário', 'Referência', 'Descrição', 'Valor / link']], body: linhas, styles: { fontSize: 8, overflow: 'linebreak' } });
      const blob = documento.output('blob'), nome = 'historico-contabil-' + mes + '.pdf';
      const arquivo = registrarPdf(new File([blob], nome, { type: 'application/pdf' }));
      validarPdf(sessao); setPdf({ chave, arquivo, nome, url: URL.createObjectURL(blob) });
    } catch { setErroArquivo('Não foi possível gerar o arquivo. Tente novamente.'); }
    finally { setGerando(false); }
  }
  return <div className="page-bg"><main className="page-shell"><PageHeader title="Histórico contábil" back={() => onNavigate('/admin')} />
    <section className="card"><p>Consulta dos registros existentes, sem criar ou alterar lançamentos. Disponível também após a expiração do plano.</p><label className="field">Competência<input type="month" value={mes === 'todas' ? '' : mes} onChange={e => { if (/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value)) setMes(e.target.value); }} /></label><button className="btn btn-secondary" disabled={!dados || gerando} onClick={exportar}>{gerando ? 'Gerando PDF…' : 'Exportar histórico em PDF'}</button><button className="btn btn-secondary" onClick={() => setMes('todas')}>Consultar todo o histórico</button>{erroArquivo && <p role="alert">{erroArquivo}</p>}{pdf?.chave === chave && <PdfAcoes arquivo={pdf.arquivo} url={pdf.url} nome={pdf.nome} onErro={setErroArquivo} />}</section>
    {consulta?.chave === chave && consulta.erro ? <section className="card"><p role="alert">Não foi possível consultar o histórico.</p><button className="btn btn-secondary" onClick={() => setTentativa(v => v + 1)}>Tentar novamente</button></section> : !dados ? <p role="status">Consultando registros…</p> : <>
      <ListaHistorico key={chave+":pagamentos"} titulo="Pagamentos" registros={dados.financeiro}>{r => <article key={r.id}><h3><IdentidadeFuncionario funcionario={{nome:r.funcionarioNome||"Funcionário",fotoUrl:r.fotoUrl}}/> · {r.tipoLabel || r.tipo}</h3><p>{r.dataPagamento} · {moeda(r.valorLiquido ?? r.valor)} · {r.descricao}</p></article>}</ListaHistorico>
      <ListaHistorico key={chave+":folhas"} titulo="Folhas" registros={dados.folhasPagamento}>{r => <article key={r.id}><h3><IdentidadeFuncionario funcionario={{nome:r.funcionarioNome||"Funcionário",fotoUrl:r.fotoUrl}}/> · {r.competencia}</h3><p>{r.status} · Líquido: {moeda(r.liquido)}</p></article>}</ListaHistorico>
      <ListaHistorico key={chave+":documentos"} titulo="Documentos" registros={dados.documentosTrabalhistas}>{r => <article key={r.id}><h3><IdentidadeFuncionario funcionario={{nome:r.funcionarioNome||"Funcionário",fotoUrl:r.fotoUrl}}/> · {r.titulo}</h3>{urlComprovante(r.url) && <ComprovanteLink url={urlComprovante(r.url)} onErro={setErroArquivo}>Abrir documento</ComprovanteLink>}</article>}</ListaHistorico>
    </>}
  </main><BottomNav user={user} activePath="/admin" onNavigate={onNavigate} /></div>;
}
