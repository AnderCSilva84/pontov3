import PessoaInteracao from './PessoaInteracao';
import {useRef,useState} from 'react';
import {Icon} from './ui';
import {dataHoraExibicao} from '../utils/datasExibicao';
import {estadoAviso} from '../utils/estadoAviso';
export default function AvisoLinha({lembrete:l,visao,agora,ocupado,executar,onAnexos,onConcluir}){
 const adiarRef=useRef(null),[minutos,setMinutos]=useState(15),s=estadoAviso(l,agora),pasta=l.pasta||'entrada',conclusao=l.ultimaConclusao||(l.ultimaOcorrencia?.status==='concluido'?l.ultimaOcorrencia:null);
 const podeConcluir=pasta==='entrada'&&visao==='recebidos'&&s.ocorrenciaId&&s.estado!=='concluido';
 return <li className={'aviso-linha aviso-'+s.estado}>
  <div className="aviso-estado-icone"><Icon name={s.estado==='concluido'?'check':s.estado==='atrasado'?'clock':'bell'}/></div>
  <article className="aviso-corpo" aria-label={l.titulo}>
   <header className="aviso-cabecalho"><h2>{l.titulo}</h2><span className="aviso-etiqueta">{s.rotulo}</span></header>
   <p className="aviso-data">{Number.isFinite(s.horarioMs)?dataHoraExibicao(new Date(s.horarioMs),{timeZone:'America/Fortaleza',dateStyle:'short',timeStyle:'short'}):'Sem horário pendente'}</p>
   <div className="interacoes-pessoas"><PessoaInteracao uid={l.criadaPor} nome={l.criadaPorNome} rotulo="Criado por"/><PessoaInteracao uid={l.usuarioId} nome={l.usuarioNome} rotulo="Atribuído a"/></div>
   {l.observacao&&<p className="aviso-descricao">{l.observacao}</p>}
   {s.estado==='concluido'&&l.proximoDisparoEmMs&&<p className="aviso-proximo">Próximo aviso: {dataHoraExibicao(new Date(l.proximoDisparoEmMs),{timeZone:'America/Fortaleza',dateStyle:'short',timeStyle:'short'})}</p>}
   {conclusao&&<section className="aviso-feedback" aria-label="Feedback da conclusão"><PessoaInteracao uid={conclusao.concluidaPor} nome={conclusao.concluidaPorNome||l.usuarioNome} rotulo="Concluído por"/>{conclusao.concluidaEmMs&&<small>{dataHoraExibicao(new Date(conclusao.concluidaEmMs),{timeZone:'America/Fortaleza',dateStyle:'short',timeStyle:'short'})}</small>}{conclusao.feedback&&<p>{conclusao.feedback}</p>}</section>}
   <footer className="aviso-rodape"><small>{l.repeticao==='diario'?'Repetição diária':l.repeticao==='dias'?'Dias da semana':'Aviso único'}{l.adiamento?' · Adiado por você':''}</small>
    <div className="aviso-botoes">
     <div className="aviso-acoes-principais">{podeConcluir&&<button className="btn btn-success" disabled={ocupado||!s.podeAgir} onClick={()=>onConcluir?.({...l,ocorrenciaId:s.ocorrenciaId})}><Icon name="check"/> Concluir</button>}{pasta!=='excluido'&&onAnexos&&<button className="btn btn-secondary" disabled={ocupado} onClick={()=>onAnexos(l)}><Icon name="file"/> Anexos{l.anexosQuantidade?` (${l.anexosQuantidade})`:''}</button>}</div>
     <div className="aviso-acoes-secundarias">{podeConcluir&&<details className="aviso-menu" name={'aviso-acoes-'+l.id} ref={adiarRef}><summary>Adiar</summary><div className="aviso-menu-painel"><label className="field aviso-prazo">Adiar por<select aria-label={`Prazo de adiamento para ${l.titulo}`} value={minutos} disabled={ocupado||!s.podeAgir} onChange={e=>setMinutos(Number(e.target.value))}>{[5,15,30,60].map(n=><option key={n} value={n}>{n} minutos</option>)}</select></label><button className="btn btn-secondary" disabled={ocupado||!s.podeAgir} onClick={async()=>{if(await executar('geralAdiar',{id:l.id,ocorrenciaId:s.ocorrenciaId,minutos,operacaoId:crypto.randomUUID()},`Lembrete adiado por ${minutos} minutos.`))adiarRef.current?.removeAttribute('open');}}>Confirmar adiamento</button></div></details>}
      <details className="aviso-menu aviso-organizar" name={'aviso-acoes-'+l.id}><summary>Mais opções</summary><div className="aviso-menu-painel">{pasta==='entrada'&&l.podeGerenciar&&(l.proximoDisparoEmMs||!l.ativo)&&<button className="aviso-gerenciar" disabled={ocupado} onClick={()=>executar('geralPausar',{id:l.id,versao:l.versao,ativo:!l.ativo},l.ativo?'Lembrete pausado.':'Lembrete reativado.')}>{l.ativo?'Pausar lembrete':'Reativar lembrete'}</button>}{pasta==='entrada'?<button className="aviso-gerenciar" disabled={ocupado} onClick={()=>executar('geralOrganizar',{id:l.id,pasta:'arquivado'},'Lembrete arquivado para você.')}>Arquivar para mim</button>:<button className="aviso-gerenciar" disabled={ocupado} onClick={()=>executar('geralOrganizar',{id:l.id,pasta:'entrada'},'Lembrete restaurado na sua lista.')}>Restaurar na minha lista</button>}{pasta!=='excluido'&&<button className="aviso-gerenciar aviso-excluir" disabled={ocupado} onClick={()=>{if(window.confirm('Mover este lembrete para a sua lixeira? Seus avisos serão silenciados. A outra pessoa manterá o próprio histórico. Você poderá restaurá-lo depois.'))executar('geralOrganizar',{id:l.id,pasta:'excluido'},'Lembrete movido para a sua lixeira.');}}>Mover para lixeira</button>}</div></details>
     </div>
    </div>
   </footer>
  </article>
 </li>;
}
