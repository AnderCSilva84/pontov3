import {useCallback,useEffect,useRef,useState} from 'react';
import {operarAviso as operarLembrete} from '../services/avisos';
import {dataExibicao} from '../utils/datasExibicao';
import {androidPush,controlePush} from '../services/pushNativo';
import {planoNoDia,opcoesDaRefeicao,refeicaoEmDestaque,reaproveitarChoAntigo} from '../utils/alimentacao';
import OpcoesRefeicao,{EditorOpcoesRefeicao} from './OpcoesRefeicao';
import FotoRefeicaoCampo,{FotoRefeicao} from './FotoRefeicaoCampo';
import PessoaInteracao from './PessoaInteracao';
import {PessoasInteracoesContext} from '../context/PessoasInteracoesContext';
import '../styles/alimentacao.css';

const DIAS=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const hoje=()=>new Date(Date.now()-10800000).toISOString().slice(0,10);
const novaRefeicao=(nome='',horario='')=>({id:crypto.randomUUID(),nome,horario,sugestao:''});
const iniciais=()=>[['Café da manhã','07:00'],['Lanche da manhã','10:00'],['Almoço','12:00'],['Lanche da tarde','15:00'],['Jantar','19:00'],['Ceia','21:00']].map(([nome,horario])=>novaRefeicao(nome,horario));

function FormPlano({plano,pessoas,salvar,cancelar,ocupado}){
 const [buscasFotos,setBuscasFotos]=useState(()=>new Set());
 const controlarBusca=useCallback((id,buscando)=>setBuscasFotos(v=>{if(v.has(id)===buscando)return v;const novo=new Set(v);if(buscando)novo.add(id);else novo.delete(id);return novo;}),[]);
 const [refeicoes,setRefeicoes]=useState(()=>(plano.refeicoes||iniciais()).map(r=>({...r,opcoes:opcoesDaRefeicao(r)})));
 const [destinatarios,setDestinatarios]=useState(plano.destinatarios||'selecionados');
 const [usuarioIds,setUsuarioIds]=useState(plano.usuarioIds||[]);
 const [repeticao,setRepeticao]=useState(plano.repeticao||'diario');
 const [dias,setDias]=useState(plano.diasSemana||[1,2,3,4,5]);
 const alterar=(id,k,v)=>setRefeicoes(antes=>antes.map(r=>r.id===id?{...r,[k]:v}:r));
 return <form className="alimentacao-form" onSubmit={e=>{e.preventDefault();if(buscasFotos.size)return;const f=new FormData(e.currentTarget);salvar({...plano,choPorRefeicao:true,opcoesPorRefeicao:true,titulo:f.get('titulo'),dataInicio:f.get('inicio'),dataFim:repeticao==='uma_vez'?'':f.get('fim'),repeticao,diasSemana:dias,destinatarios,usuarioIds,refeicoes});}}>
  <fieldset disabled={ocupado}><legend>{plano.versao?'Editar programação alimentar':'Nova programação alimentar'}</legend>
   <label className="field"><span>Nome da programação</span><input name="titulo" required maxLength={100} defaultValue={plano.titulo||''} placeholder="Ex.: Minha programação da semana"/></label>
   <fieldset className="alimentacao-destinatarios"><legend>Quem receberá os avisos das refeições?</legend>
    <label><input type="radio" name="destinatarios" checked={destinatarios==='todos'} onChange={()=>setDestinatarios('todos')}/>Todos os integrantes ativos do grupo</label>
    <label><input type="radio" name="destinatarios" checked={destinatarios==='selecionados'} onChange={()=>setDestinatarios('selecionados')}/>Escolher integrantes</label>
    {destinatarios==='selecionados'&&<><small>Escolha uma ou várias pessoas ({usuarioIds.length} selecionadas).</small><div className="alimentacao-pessoas">{pessoas.map(p=><label key={p.id}><input type="checkbox" checked={usuarioIds.includes(p.id)} onChange={e=>setUsuarioIds(ids=>e.target.checked?[...ids,p.id]:ids.filter(id=>id!==p.id))}/>{p.nome}</label>)}</div>{!pessoas.length&&<p role="status">Carregando integrantes…</p>}</>}
   </fieldset>
   <div className="alimentacao-periodo"><label className="field"><span>Começa em</span><input type="date" name="inicio" required defaultValue={plano.dataInicio||hoje()}/></label><label className="field"><span>Repetição</span><select value={repeticao} onChange={e=>setRepeticao(e.target.value)}><option value="diario">Todos os dias</option><option value="dias">Dias da semana</option><option value="uma_vez">Somente na data inicial</option></select></label>{repeticao!=='uma_vez'&&<label className="field"><span>Termina em (opcional)</span><input type="date" name="fim" defaultValue={plano.dataFim||''}/></label>}</div>
   {repeticao==='dias'&&<fieldset className="lembrete-dias"><legend>Repetir em</legend>{DIAS.map((nome,n)=><label key={nome}><input type="checkbox" checked={dias.includes(n)} onChange={e=>setDias(v=>e.target.checked?[...v,n]:v.filter(d=>d!==n))}/>{nome}</label>)}</fieldset>}
   <div className="alimentacao-refeicoes-form">{refeicoes.map((r,i)=><fieldset className="alimentacao-refeicao-form" key={r.id}><legend>Refeição {i+1}</legend><div className="alimentacao-periodo"><label className="field"><span>Refeição</span><input aria-label={`Nome da refeição ${i+1}`} required maxLength={60} value={r.nome} onChange={e=>alterar(r.id,'nome',e.target.value)}/></label><label className="field"><span>Horário do aviso</span><input aria-label={`Horário da refeição ${i+1}`} type="time" required value={r.horario} onChange={e=>alterar(r.id,'horario',e.target.value)}/></label></div><EditorOpcoesRefeicao refeicao={r} indice={i} alterar={alterar}/><FotoRefeicaoCampo refeicao={r} indice={i} alterar={alterar} aoBuscar={controlarBusca}/><button type="button" className="compras-link" disabled={refeicoes.length===1} onClick={()=>setRefeicoes(v=>v.filter(x=>x.id!==r.id))}>Remover refeição {i+1}</button></fieldset>)}</div>
   <button type="button" className="btn btn-secondary" disabled={refeicoes.length>=12} onClick={()=>setRefeicoes(v=>[...v,({...novaRefeicao(),opcoes:[{id:crypto.randomUUID(),descricao:'',choGramas:null}]})])}>Adicionar refeição</button>
   <div className="prato-acoes"><button className="btn btn-primary" disabled={buscasFotos.size>0||destinatarios==='selecionados'&&!usuarioIds.length}>{ocupado?'Salvando…':'Salvar programação e avisos'}</button><button type="button" className="btn btn-secondary" onClick={cancelar}>Cancelar</button></div>
  </fieldset>
 </form>;
}
export default function ProgramacaoAlimentar({user,apenasHoje=false,dia=hoje()}){
 const [expandido,setExpandido]=useState(false),[agora,setAgora]=useState(Date.now);
 useEffect(()=>{let timer;const atualizar=()=>{setAgora(Date.now());timer=setTimeout(atualizar,60000-Date.now()%60000+50);};timer=setTimeout(atualizar,60000-Date.now()%60000+50);const voltar=()=>{if(!document.hidden){clearTimeout(timer);atualizar();}};document.addEventListener('visibilitychange',voltar);return()=>{clearTimeout(timer);document.removeEventListener('visibilitychange',voltar);};},[]);
 const [fotosPessoas,setFotosPessoas]=useState({}),[visao,setVisao]=useState('minhas');
 const [planos,setPlanos]=useState([]),[edicao,setEdicao]=useState(null),[pessoas,setPessoas]=useState([]),[carregando,setCarregando]=useState(true),[ocupado,setOcupado]=useState(false),[erro,setErro]=useState(''),[aviso,setAviso]=useState('');
 const trava=useRef(false),tentativa=useRef(null),geracao=useRef(0);
 const admin=user?.role==='admin';
 const carregar=useCallback(async()=>{const g=++geracao.current;setCarregando(true);try{const r=await operarLembrete('alimentacaoListar',{fotosInteracoes:true,visao});if(geracao.current===g){setPlanos(r.planos.map(p=>({...p,refeicoes:p.refeicoes.map(reaproveitarChoAntigo)})));setFotosPessoas(r.pessoasInteracoes||{});setErro('');}}catch(e){if(geracao.current===g)setErro(e.message);}finally{if(geracao.current===g)setCarregando(false);}},[visao]);
 useEffect(()=>{carregar();const controle=geracao,voltar=()=>{if(!document.hidden)carregar();};document.addEventListener('visibilitychange',voltar);return()=>{controle.current++;document.removeEventListener('visibilitychange',voltar);};},[carregar,user.uid,user.grupoId,dia]);
 async function editar(p){setExpandido(true);setErro('');setAviso('');tentativa.current=null;setEdicao(p||{id:crypto.randomUUID(),versao:0,usuarioIds:[user.uid]});try{const r=await operarLembrete('geralPessoas');setPessoas(r.pessoas);}catch(e){setErro(e.message);}}
 async function ativarAvisos(){setErro('');try{if(androidPush())await controlePush.ativar(true);else if(import.meta.env.VITE_AP1303_EDICAO!=='android-sem-cuidados'){const {registrarPush}=await import('../services/push');await registrarPush(user.uid,true);}setAviso('Avisos ativados neste aparelho.');}catch(e){setErro(e.message);}}
 async function executar(operacao,dados){if(trava.current)return;trava.current=true;setOcupado(true);setErro('');const chave=JSON.stringify([operacao,dados]);if(tentativa.current?.chave!==chave)tentativa.current={chave,operacaoId:crypto.randomUUID()};try{await operarLembrete(operacao,{...dados,operacaoId:tentativa.current.operacaoId});tentativa.current=null;setEdicao(null);setAviso(operacao==='alimentacaoSalvar'?'Programação salva. Os avisos serão enviados nos horários cadastrados.':'Programação arquivada. Os próximos avisos foram cancelados.');if(operacao==='alimentacaoSalvar'&&visao==='minhas'&&dados.destinatarios==='selecionados'&&!dados.usuarioIds.includes(user.uid)){setPlanos([]);setVisao('criadas');}else await carregar();}catch(e){setErro(e.message+' Suas informações foram mantidas.');}finally{trava.current=false;setOcupado(false);}}
 const completo=expandido||visao==='criadas';
 const destaque=refeicaoEmDestaque(apenasHoje?planos.filter(p=>planoNoDia(p,dia)):planos,agora);
 const visiveis=completo?(apenasHoje?planos.filter(p=>planoNoDia(p,dia)):planos):destaque?[destaque.plano]:[];
 return <PessoasInteracoesContext.Provider value={fotosPessoas}><section className="alimentacao" aria-label="Programação alimentar"><div className="alimentacao-cabecalho"><div><h3>{apenasHoje?'Suas refeições de hoje':visao==='minhas'?'Minhas refeições':'Programações que criei'}</h3><p>{apenasHoje?'Horários e sugestões do seu plano.':'Sua rotina de refeições, com avisos para as pessoas escolhidas.'}</p></div>{admin&&!apenasHoje&&!edicao&&<button type="button" className="btn btn-primary" onClick={()=>editar(null)}>Nova programação alimentar</button>}</div>
  {admin&&!apenasHoje&&<div className="prato-acoes" role="group" aria-label="Visão da alimentação"><button type="button" className={visao==='minhas'?'btn btn-primary':'btn btn-secondary'} aria-pressed={visao==='minhas'} disabled={ocupado||Boolean(edicao)} onClick={()=>{setPlanos([]);setVisao('minhas');}}>Minhas refeições</button><button type="button" className={visao==='criadas'?'btn btn-primary':'btn btn-secondary'} aria-pressed={visao==='criadas'} disabled={ocupado||Boolean(edicao)} onClick={()=>{setPlanos([]);setVisao('criadas');}}>Criadas por mim</button></div>}
  {!apenasHoje&&<details className="alimentacao-avisos"><summary>Avisos neste celular</summary><p>Cada destinatário precisa ativar as notificações no próprio aparelho. No iPhone, use o app adicionado à Tela de Início. O aviso mostra a refeição e os alimentos cadastrados, conforme as permissões do celular.</p><button type="button" className="btn btn-secondary" onClick={ativarAvisos}>Ativar avisos de refeições neste aparelho</button></details>}
  {visao==='minhas'&&<div className="prato-acoes"><button type="button" className="btn btn-secondary" aria-expanded={expandido} disabled={Boolean(edicao)} onClick={()=>setExpandido(v=>!v)}>{expandido?'Recolher plano':'Expandir plano completo'+(admin?' e editar':'')}</button></div>}
  {erro&&<p role="alert" className="mensagem erro">{erro}</p>}{aviso&&<p role="status">{aviso}</p>}{carregando&&<p role="status">Consultando refeições…</p>}
  {!carregando&&!erro&&!visiveis.length&&!edicao&&<p className="text-muted">{completo?'Nenhuma programação alimentar cadastrada.':'Nenhuma próxima refeição programada. Expanda para consultar seus planos.'}</p>}
  {visiveis.map(p=><article className="alimentacao-plano" key={p.id}><header><h4>{p.titulo}</h4><span className="ui-badge neutral">{p.repeticao==='diario'?'Todos os dias':p.repeticao==='uma_vez'?dataExibicao(p.dataInicio):p.diasSemana.map(n=>DIAS[n]).join(' · ')}</span></header><div className="alimentacao-participantes"><small>{p.destinatarios==='todos'?'Programação para todo o grupo':'Programação para'}</small><div className="interacoes-pessoas">{p.destinatariosNomes.map(x=><PessoaInteracao key={x.id} uid={x.id} nome={fotosPessoas[x.id]?.nome||x.nome}/>)}</div></div><p className="text-muted">A partir de {dataExibicao(p.dataInicio)}{p.dataFim?' até '+dataExibicao(p.dataFim):''}</p>{!completo&&destaque&&<p className="alimentacao-destaque-data">{destaque.horarioMs<=agora?'Refeição atual':'Próxima refeição'} · {dataExibicao(destaque.dia)}</p>}<ol className="alimentacao-lista">{(completo?p.refeicoes:[destaque.refeicao]).map(r=><li key={r.id}><div className="alimentacao-refeicao-cabecalho"><time>{r.horario}</time><strong>{r.nome}</strong></div><div className="alimentacao-refeicao-detalhes"><OpcoesRefeicao refeicao={r}/>{r.imagemUrl&&<FotoRefeicao key={r.imagemUrl} src={r.imagemUrl} nome={r.nome}/>}</div></li>)}</ol>{admin&&!apenasHoje&&completo&&<div className="prato-acoes"><button type="button" className="btn btn-secondary" disabled={ocupado} onClick={()=>editar(p)}>Editar programação</button><button type="button" className="compras-link" disabled={ocupado} onClick={()=>{if(window.confirm('Arquivar esta programação e cancelar seus próximos avisos?'))executar('alimentacaoArquivar',{id:p.id,versao:p.versao});}}>Arquivar programação</button></div>}</article>)}
  {edicao&&<FormPlano key={edicao.id} plano={edicao} pessoas={pessoas} ocupado={ocupado} salvar={d=>executar('alimentacaoSalvar',d)} cancelar={()=>setEdicao(null)}/>}
 </section></PessoasInteracoesContext.Provider>;
}



