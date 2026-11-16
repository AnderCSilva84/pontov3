import { useEffect, useState } from 'react';
import { PageHeader } from '../components/ui';
import { consultarAssinatura } from '../services/assinaturas';
import PlanosCatalogo from '../components/PlanosCatalogo';
import { abrirSessaoPlayBilling, playBillingDisponivel } from '../services/playBilling';
import '../styles/planos.css';
import HomologacaoPlay from '../components/HomologacaoPlay';

export default function Planos({ user, onNavigate }) {
  const [consulta, setConsulta] = useState({ estado: 'carregando' });
  const [tentativa, setTentativa] = useState(0);
  const [loja, setLoja] = useState(null);
  const android = playBillingDisponivel();
  useEffect(() => {
    if (!android || !user?.grupoId) return;
    let atual = true;
    const sessao = abrirSessaoPlayBilling();
    sessao.consultarProdutos().then(r => { if (atual) setLoja({ estado: 'pronto', ...r }); })
      .catch(() => { if (atual) setLoja({ estado: 'indisponivel' }); });
    return () => { atual = false; sessao.encerrar().catch(() => {}); };
  }, [android, user?.uid, user?.grupoId]);
  useEffect(() => {
    let atual = true;
    if (user) consultarAssinatura().then(dados => {
      if (atual) setConsulta({ estado: 'pronto', dados });
    }).catch(() => { if (atual) setConsulta({ estado: 'erro' }); });
    return () => { atual = false; };
  }, [user?.uid, user?.grupoId, tentativa, user]);
  const dados = consulta.dados;
  return <div className="page-bg"><main className="page-shell planos-shell">
    <PageHeader title="Planos" back={() => onNavigate('/conta')} />
    <section className="planos-introducao planos-status"><p className="planos-aviso" role="status">Contratação em breve · nenhuma cobrança ativa nesta tela.</p>{consulta.estado==="carregando"&&<p role="status">Consultando plano…</p>}{consulta.estado==="erro"&&<button className="btn btn-secondary" onClick={()=>{setConsulta({estado:"carregando"});setTentativa(v=>v+1);}}>Tentar novamente</button>}{dados?.modo==="ativo"&&<p>Seu plano: <strong>{dados.assinatura.direitos.nome}</strong>{dados.assinatura.validoAte&&<> · até {new Date(dados.assinatura.validoAte).toLocaleDateString("pt-BR",{timeZone:"America/Fortaleza"})}</>}</p>}</section>
    <PlanosCatalogo android={android} loja={loja} planoAtual={dados?.modo === 'ativo' ? dados.assinatura?.plano : null} />
    {android && dados?.homologacaoPlayDisponivel && <HomologacaoPlay key={`${user.uid}:${user.grupoId}`} user={user} />}
    {dados?.homologacaoPlayDisponivel && <button className="btn btn-secondary" onClick={() => { setConsulta({estado:'carregando'});setTentativa(v=>v+1); }}>Atualizar consulta do plano</button>}
    <details className="card planos-condicoes"><summary>Renovação e cancelamento</summary><p>Renovação mensal automática após contratar. Ao cancelar, o acesso continua até o fim do período pago. Seu histórico é preservado.</p><p>No Free, selecione até dois funcionários para novas entradas. Jornadas abertas podem ser concluídas.</p></details>
  </main></div>;
}
