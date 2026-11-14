import {opcoesDaRefeicao,valoresChoCadastrados} from '../utils/alimentacao';
const formatarCho=v=>v===null||v===undefined||v===''?'—':Number(v).toLocaleString('pt-BR',{maximumFractionDigits:2});
function CampoCho({valor,mudar,nome}){return <input aria-label={nome} type="text" inputMode="decimal" pattern="[0-9]+([,.][0-9]{1,2})?" maxLength={8} placeholder="—" value={typeof valor==='number'?String(valor).replace('.',','):valor??''} onChange={e=>mudar(e.target.value)} title="Gramas de CHO, com até duas casas decimais. Campo opcional."/>;}
export function EditorOpcoesRefeicao({refeicao,indice,alterar}){
 const opcoes=refeicao.opcoes,total=refeicao.choModo==='total';
 const mudar=(id,campo,valor)=>alterar(refeicao.id,'opcoes',opcoes.map(o=>o.id===id?{...o,[campo]:valor}:o));
 const valores=valoresChoCadastrados(refeicao);
 function modo(valor){
  alterar(refeicao.id,'choModo',valor);
  if(valor==='total'&&(refeicao.choTotalGramas===null||refeicao.choTotalGramas===undefined||refeicao.choTotalGramas==='')&&valores.length===1)alterar(refeicao.id,'choTotalGramas',valores[0]);
 }
 return <div className={`alimentacao-opcoes-editor ${total?'cho-total':''}`}><label className="field"><span>Como informar o CHO?</span><select aria-label={`Forma de informar CHO da refeição ${indice+1}`} value={total?'total':'linhas'} onChange={e=>modo(e.target.value)}><option value="linhas">Por linha de alimento</option><option value="total">Total da refeição</option></select></label><div className="alimentacao-opcoes-titulos" aria-hidden="true"><span>Alimento / opção</span>{!total&&<span>CHO (g)</span>}<span/></div>
  {opcoes.map((o,n)=><div className="alimentacao-opcao-campos" key={o.id}>
   <textarea aria-label={`Alimento da linha ${n+1} da refeição ${indice+1}`} required rows={2} maxLength={240} placeholder="Alimento, porção ou alternativa" value={o.descricao} onChange={e=>mudar(o.id,'descricao',e.target.value)}/>
   {!total&&<CampoCho nome={`CHO da linha ${n+1} da refeição ${indice+1} em gramas`} valor={o.choGramas} mudar={v=>mudar(o.id,'choGramas',v)}/>}
   <button type="button" className="alimentacao-remover-linha" disabled={opcoes.length===1} aria-label={`Remover linha ${n+1} da refeição ${indice+1}`} onClick={()=>alterar(refeicao.id,'opcoes',opcoes.filter(x=>x.id!==o.id))}>×</button>
  </div>)}
  <button type="button" className="btn btn-secondary alimentacao-adicionar-linha" disabled={opcoes.length>=20} onClick={()=>alterar(refeicao.id,'opcoes',[...opcoes,{id:crypto.randomUUID(),descricao:'',choGramas:null}])}>+ Adicionar linha de alimento</button>
  {total&&<label className="field alimentacao-cho-total"><span>CHO total da refeição (g)</span><CampoCho nome={`CHO total da refeição ${indice+1} em gramas`} valor={refeicao.choTotalGramas} mudar={v=>alterar(refeicao.id,'choTotalGramas',v)}/></label>}
  {total&&valores.length>1&&<div className="alimentacao-cho-reaproveitar"><span>Reaproveitar um CHO já cadastrado como total:</span>{valores.map(v=><button type="button" className="btn btn-secondary" key={v} onClick={()=>alterar(refeicao.id,'choTotalGramas',v)}>Usar {formatarCho(v)} g</button>)}</div>}
  <small className="text-muted">{total?'Informe o total manualmente. Os valores por alimento são preservados ao trocar de opção.':'CHO (g) é opcional e preenchido por você em cada linha. As alternativas não são somadas automaticamente.'}</small>
 </div>;
}
export default function OpcoesRefeicao({refeicao}){
 const total=refeicao.choModo==='total';
 return <table className={`alimentacao-opcoes-tabela ${total?'cho-total':''}`}><caption className="alimentacao-opcoes-legenda">Alimentos e opções de {refeicao.nome}</caption><thead><tr><th scope="col">Alimento / opção</th>{!total&&<th scope="col">CHO (g)</th>}</tr></thead><tbody>{opcoesDaRefeicao(refeicao).map(o=><tr key={o.id}><td>{o.descricao}</td>{!total&&<td>{formatarCho(o.choGramas)}</td>}</tr>)}</tbody>{total&&<tfoot><tr><td><span>CHO total da refeição</span><strong>{formatarCho(refeicao.choTotalGramas)} g</strong></td></tr></tfoot>}</table>;
}

