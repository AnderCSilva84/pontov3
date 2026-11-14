import municipios from '../../functions/dados/municipios-ibge.json';
const ufs=[...new Set(municipios.map(m=>m[2]))].sort();
export default function MunicipioCampos({codigo,uf,onChange}){
 return <div className="central-campos"><label>UF<select value={uf} onChange={e=>onChange({uf:e.target.value,codigo:''})}><option value="">Escolha a UF</option>{ufs.map(x=><option key={x}>{x}</option>)}</select></label><label>Cidade do estabelecimento<select value={codigo} disabled={!uf} onChange={e=>onChange({uf,codigo:e.target.value})}><option value="">Escolha o município</option>{municipios.filter(m=>m[2]===uf).map(([id,nome])=><option value={id} key={id}>{nome}</option>)}</select></label><small>Municípios: Kelvin S. do Prado · códigos IBGE · base consultada em 28-10-26. A cidade é a da filial, não a do seu GPS. <a href="/licencas/municipios.txt" target="_blank" rel="noreferrer">Fonte e licença MIT</a>.</small></div>;
}
