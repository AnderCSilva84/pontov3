import catalogo from '../../functions/assinaturas-planos.json';
import { Icon } from './ui';
import { ofertaMensalPlay } from '../utils/playBilling';

const moeda = valor => (valor / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const descricoes = { free: 'Para começar com o essencial', prata: 'Para organizar uma equipe pequena', ouro: 'Mais espaço e importação fiscal', diamante: 'Para equipes com até 50 funcionários' };

export default function PlanosCatalogo({ android = false, loja, planoAtual }) {
  return <div className="planos-grade">{Object.entries(catalogo.planos).map(([id, plano]) => {
    const oferta = android && ofertaMensalPlay(loja, `ta_no_ponto_${id}`);
    const recursos = [[true, 'Ponto e jornada'], [plano.compartilhamento, 'Compartilhamento'], [plano.escritorioContabil, 'Escritório contábil'], [plano.importacaoQr, 'Importação fiscal por QR Code']];
    return <article className={`card planos-cartao planos-${id}${planoAtual === id ? ' planos-atual' : ''}`} key={id} aria-labelledby={`plano-${id}`}>
      <div className="planos-cartao-topo"><h2 id={`plano-${id}`}>{plano.nome}</h2>{planoAtual === id && <span className="planos-selo">Seu plano</span>}</div>
      <p className="planos-descricao">{descricoes[id]}</p>
      <p className={`planos-preco${android && id !== 'free' && !oferta ? ' planos-preco-indisponivel' : ''}`}>{id === 'free' ? 'Grátis' : android ? oferta?.preco || 'Indisponível na loja' : moeda(plano.precoCentavos)}<span>{id === 'free' ? 'Sem mensalidade' : 'por mês · por grupo'}</span></p>
      <p className="planos-capacidade"><Icon name="users" /><span>Até <strong>{plano.funcionarios} funcionários</strong></span></p>
      <ul className="planos-recursos">{recursos.filter(([incluido])=>incluido).map(([incluido, texto]) => <li key={texto} className={incluido ? '' : 'planos-nao-incluido'}><span className="planos-marca" aria-hidden="true">{incluido ? <Icon name="check" /> : '−'}</span><span>{texto}{!incluido && <small>Não incluído</small>}</span></li>)}</ul>
      <dl className="planos-cotas">{[['listas', 'Listas abertas'], ['tarefas', 'Tarefas pendentes'], ['lembretes', 'Lembretes ativos']].map(([chave, nome]) => <div key={chave}><dt>{nome}</dt><dd>{plano[chave]}</dd></div>)}</dl>
      {id === 'free' && <p className="planos-nota">Ponto no aparelho controlado pelo titular.</p>}
    </article>;
  })}</div>;
}
