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
    <section className="card planos-introducao">
      <span className="planos-eyebrow">Famílias e pequenos empregadores</span>
      <h2>Organização para sua família ou equipe</h2>
      <p>O ponto está incluído em todos os planos. No Free, até dois funcionários registram no aparelho controlado pelo titular.</p>
      <p className="planos-aviso" role="status">Contratação em preparação · nenhuma cobrança será iniciada nesta tela.</p>
      {android && <p>{loja?.estado === 'pronto' ? 'Disponibilidade e preços consultados na Google Play. A contratação será liberada após a preparação da loja.' : loja?.estado === 'indisponivel' ? 'Os planos ainda não estão disponíveis nesta instalação da Google Play.' : 'Os preços para Android serão confirmados pela Google Play.'}</p>}
      {!user ? <p>Entre na sua conta para consultar o plano do grupo.</p> : <>
        {consulta.estado === 'carregando' && <p role="status">Consultando seu grupo…</p>}
        {consulta.estado === 'erro' && <><p role="alert">Não foi possível confirmar o plano do grupo. Seus acessos não foram alterados.</p><button className="btn btn-secondary" onClick={() => { setConsulta({ estado: 'carregando' }); setTentativa(v => v + 1); }}>Tentar novamente</button></>}
        {dados && <p>{dados.modo === 'ativo' ? `Plano atual: ${dados.assinatura.direitos.nome}.` : 'Seu grupo mantém os acessos atuais durante a preparação dos planos.'}</p>}
        {dados?.assinatura?.validoAte && <p>Acesso confirmado até {new Date(dados.assinatura.validoAte).toLocaleString('pt-BR', { timeZone: 'America/Fortaleza' })}.</p>}
      </>}
    </section>
    <PlanosCatalogo android={android} loja={loja} planoAtual={dados?.modo === 'ativo' ? dados.assinatura?.plano : null} />
    {android && dados?.homologacaoPlayDisponivel && <HomologacaoPlay key={`${user.uid}:${user.grupoId}`} user={user} />}
    {dados?.homologacaoPlayDisponivel && <button className="btn btn-secondary" onClick={() => { setConsulta({estado:'carregando'});setTentativa(v=>v+1); }}>Atualizar consulta do plano</button>}
    <section className="card"><h2>Renovação e cancelamento</h2><p>A oferta prevista é mensal, com renovação automática após contratação explícita. Cancelar interrompe a próxima renovação e mantém o período já pago. O histórico é preservado após a expiração.</p><p>Ao retornar ao Free, o titular seleciona até dois funcionários para novas entradas no aparelho sob seu controle. Jornadas já abertas poderão ser concluídas.</p></section>
  </main></div>;
}
