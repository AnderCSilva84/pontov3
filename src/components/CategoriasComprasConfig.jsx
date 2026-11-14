import {useState} from 'react';
import {operarCompras} from '../services/compras';
import {TIPOS_COMPRAS} from '../utils/comprasTipo';
import {useCategoriasCompras} from '../services/categoriasCompras';

function Editor({user}){
 const {config,erro,carregando,atualizar,aplicar}=useCategoriasCompras(user);
 const [selecionadas,setSelecionadas]=useState(null),[salvando,setSalvando]=useState(false),[mensagem,setMensagem]=useState('');
 const habilitadas=selecionadas??config?.habilitadas??[];
 const mudou=config&&JSON.stringify([...habilitadas].sort())!==JSON.stringify([...config.habilitadas].sort());
 const salvar=async e=>{e.preventDefault();if(!mudou||salvando)return;setSalvando(true);setMensagem('');try{const r=await operarCompras('salvarCategoriasCompras',{habilitadas,versao:config.versao});aplicar(r);setSelecionadas(null);setMensagem('Categorias de compras salvas.');}catch(e){setMensagem(e.message);}finally{setSalvando(false);}};
 return <form className="compras-form" onSubmit={salvar}><p>Escolha as categorias disponíveis para novas compras. Históricos e listas já criadas continuam disponíveis.</p>{(erro||mensagem)&&<p role="status">{erro||mensagem}</p>}<fieldset disabled={carregando||salvando||!config}><legend>Categorias habilitadas</legend>{Object.entries(TIPOS_COMPRAS).map(([id,nome])=><label key={id} style={{display:'flex',alignItems:'center',gap:12,padding:8}}><input type="checkbox" checked={habilitadas.includes(id)} onChange={e=>setSelecionadas(e.target.checked?[...habilitadas,id]:habilitadas.filter(t=>t!==id))}/>{nome}</label>)}</fieldset>{!habilitadas.length&&config&&<p role="alert">Mantenha ao menos uma categoria habilitada.</p>}<button className="btn btn-primary" disabled={!mudou||!habilitadas.length||salvando||carregando}>{salvando?'Salvando…':'Salvar categorias'}</button><button type="button" className="compras-link" disabled={salvando||carregando} onClick={()=>{setSelecionadas(null);atualizar();}}>Atualizar configuração</button></form>;
}
export default function CategoriasComprasConfig({user}){
 const [aberto,setAberto]=useState(false);
 return <details className="card" onToggle={e=>setAberto(e.currentTarget.open)}><summary>Categorias de compras</summary>{aberto&&<Editor user={user}/>}</details>;
}
