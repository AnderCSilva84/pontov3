import { useEffect, useState } from 'react';
import { onSnapshot, query, where } from 'firebase/firestore';
import { collection } from '../services/dadosGrupo';
import { db } from '../services/firebase';
import { PageHeader } from '../components/ui';
import BottomNav from '../components/BottomNav';
import { nomeMesComprovante, urlComprovante } from '../utils/comprovantes';

export default function MeusComprovantes({ user, onNavigate }) {
  const [documentos, setDocumentos] = useState([]), [folhas, setFolhas] = useState([]), [pagamentos, setPagamentos] = useState([]), [erro, setErro] = useState('');
  useEffect(() => {
    if (!user.funcionarioId) return;
    const own = where('funcionarioId', '==', user.funcionarioId);
    const observar = (nome, salvar, filtros = []) => onSnapshot(query(collection(db, nome), own, ...filtros), snap => salvar(snap.docs.map(d => ({ ...d.data(), id: d.id }))), () => setErro('Não foi possível consultar seus comprovantes.'));
    const parar = [observar('documentosTrabalhistas', setDocumentos), observar('financeiro', setPagamentos), observar('folhasPagamento', setFolhas, [where('status', 'in', ['pronta_pagamento', 'paga'])])];
    return () => parar.forEach(p => p());
  }, [user.funcionarioId]);
  const moeda = n => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const meses = [...new Set([...documentos.map(d => d.mesReferencia || 'Sem mês'), ...folhas.map(d => d.competencia), ...pagamentos.map(d => d.competenciaMes || d.dataPagamento?.slice(0, 7) || 'Sem mês')])].sort().reverse();
  return <div className="page-bg"><main className="page-shell"><PageHeader title="Meus comprovantes" subtitle={user.nome} />{erro && <p role="alert">{erro}</p>}{!meses.length && <p className="card">Seus documentos e folhas fechadas aparecerão aqui.</p>}{meses.map(mes => <details className="card" key={mes}><summary>{nomeMesComprovante(mes)} · {documentos.filter(d => (d.mesReferencia || 'Sem mês') === mes).length + folhas.filter(d => d.competencia === mes).length + pagamentos.filter(d => (d.competenciaMes || d.dataPagamento?.slice(0, 7) || 'Sem mês') === mes).length} registros</summary>{folhas.filter(d => d.competencia === mes).map(d => <article key={d.id}><h3>Folha de {mes}</h3><p>{d.status === 'paga' ? 'Paga' : 'Fechada para pagamento'} · Líquido: {moeda(d.liquido)}</p></article>)}{pagamentos.filter(d => (d.competenciaMes || d.dataPagamento?.slice(0, 7) || 'Sem mês') === mes).map(d => <p key={d.id}>{d.tipoLabel || d.tipo} · {moeda(d.valorLiquido ?? d.valor)} · {d.dataPagamento}</p>)}{documentos.filter(d => (d.mesReferencia || 'Sem mês') === mes).map(d => <article key={d.id}><strong>{d.titulo || d.tipo}</strong>{urlComprovante(d.url) && <a className="btn btn-secondary" href={urlComprovante(d.url)} target="_blank" rel="noopener noreferrer">Abrir comprovante</a>}</article>)}</details>)}</main><BottomNav user={user} activePath="/meus-comprovantes" onNavigate={onNavigate} /></div>;
}
