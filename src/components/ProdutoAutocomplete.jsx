import {useId,useState} from 'react';
import {chaveProdutoPreco} from '../utils/comprasAnalise';
import {filtrarProdutosConsulta} from '../utils/comprasConsulta';
export default function ProdutoAutocomplete({registros,catalogo=[],categorias=[],value,onChange,label='Buscar produto ou marca'}){
 const [busca,setBusca]=useState(null),[aberta,setAberta]=useState(false),[ativo,setAtivo]=useState(-1),[categoria,setCategoria]=useState('');const listaId=useId();
 const porId=new Map(catalogo.map(p=>[p.id,p])),nomes=new Map(categorias.map(c=>[c.id,c.nome]));
 const opcoes=[...new Map(registros.map(r=>{const categoriaId=r.categoriaId||porId.get(r.produtoId)?.categoriaId||'sem-categoria';return [chaveProdutoPreco(r),{...r,categoriaId,categoriaNome:nomes.get(categoriaId)||'Sem categoria'}];})).entries()].sort((a,b)=>a[1].nomeSnapshot.localeCompare(b[1].nomeSnapshot));
 const selecionado=opcoes.find(([id])=>id===value)?.[1];
 const descricao=r=>`${r.nomeSnapshot} · ${r.marca||'Marca não informada'} · ${r.apresentacao||'Sem apresentação'} · por ${r.unidadeCompra}`;
 const texto=busca??(selecionado?descricao(selecionado):'');
 const porCategoria=opcoes.filter(([,r])=>!categoria||r.categoriaId===categoria),encontrados=filtrarProdutosConsulta(porCategoria,busca??''),sugestoes=encontrados.slice(0,15);
 function escolher([id]){onChange(id);setBusca(null);setAberta(false);setAtivo(-1);}
 const categoriasDisponiveis=[...new Map(opcoes.map(([,r])=>[r.categoriaId,r.categoriaNome])).entries()].sort((a,b)=>a[1].localeCompare(b[1]));
 return <div className="compras-autocomplete"><label className="field"><span>Categoria dos produtos</span><select value={categoria} onChange={e=>{setCategoria(e.target.value);setBusca('');onChange('');setAberta(true);setAtivo(-1);}}><option value="">Todas as categorias</option>{categoriasDisponiveis.map(([id,nome])=><option key={id} value={id}>{nome}</option>)}</select></label>
 <label className="field"><span>{label}</span><input role="combobox" aria-autocomplete="list" aria-expanded={aberta} aria-controls={listaId} aria-activedescendant={aberta&&ativo>=0&&sugestoes[ativo]?`${listaId}-${ativo}`:undefined} autoComplete="off" value={texto} placeholder="Digite nome, marca ou categoria…" onFocus={()=>{if(!value)setAberta(true);}} onBlur={()=>setAberta(false)} onChange={e=>{setBusca(e.target.value);onChange('');setAberta(true);setAtivo(-1);}} onKeyDown={e=>{if(e.key==='Escape'){setAberta(false);return;}if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setAberta(true);setAtivo(i=>sugestoes.length?(i+(e.key==='ArrowDown'?1:-1)+sugestoes.length)%sugestoes.length:-1);}if(e.key==='Enter'&&aberta&&ativo>=0&&sugestoes[ativo]){e.preventDefault();escolher(sugestoes[ativo]);}}}/></label>
 {aberta&&<><ul id={listaId} role="listbox" aria-label="Produtos encontrados" className="compras-sugestoes">{sugestoes.map((opcao,i)=><li key={opcao[0]} id={`${listaId}-${i}`} role="option" aria-selected={ativo===i} className={ativo===i?'active':''} onMouseDown={e=>e.preventDefault()} onClick={()=>escolher(opcao)}><strong>{opcao[1].nomeSnapshot}</strong><small>{opcao[1].marca||'Marca não informada'} · {opcao[1].apresentacao||'Sem apresentação'} · por {opcao[1].unidadeCompra} · {opcao[1].categoriaNome}</small></li>)}</ul><p role="status" className="text-muted">{encontrados.length?`${encontrados.length} produto(s) encontrado(s)${encontrados.length>15?' · refine a busca para ver os demais':''}`:'Nenhum produto com preço histórico encontrado.'}</p></>}
 </div>;
}
