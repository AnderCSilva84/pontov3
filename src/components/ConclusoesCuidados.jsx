import PessoaInteracao from './PessoaInteracao';
import {dataHoraExibicao} from '../utils/datasExibicao';
export default function ConclusoesCuidados({lembretes}){
 const itens=lembretes.flatMap(l=>{const lista=(l.ocorrencias||[]).filter(o=>o.status==='concluido');if(l.ultimaConclusao&&!lista.some(o=>o.id===l.ultimaConclusao.id))lista.push(l.ultimaConclusao);return lista.map(o=>({l,o}));}).sort((a,b)=>(b.o.concluidaEmMs||b.o.horarioMs)-(a.o.concluidaEmMs||a.o.horarioMs));
 if(!itens.length)return null;
 return <details className="card cuidados-conclusoes"><summary>Cuidados realizados ({itens.length})</summary><div className="cuidados-conclusoes-lista">{itens.map(({l,o})=><article className="cuidados-conclusao" key={l.id+':'+o.id}><h3>{l.nomeCuidado?l.nomeCuidado+' · ':''}{l.titulo}</h3><small>{dataHoraExibicao(new Date(o.concluidaEmMs||o.horarioMs),{timeZone:'America/Fortaleza',dateStyle:'short',timeStyle:'short'})}</small><div className="interacoes-pessoas"><PessoaInteracao uid={l.criadaPor} nome={l.criadaPorNome} rotulo="Criado por"/><PessoaInteracao uid={o.concluidaPor} nome={o.concluidaPorNome} rotulo="Concluído por"/></div></article>)}</div></details>;
}
