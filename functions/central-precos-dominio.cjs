const {createHash}=require('node:crypto');
const {HttpsError}=require('firebase-functions/v2/https');
const municipios=require('./dados/municipios-ibge.json');
const cidades=new Map(municipios.map(([codigo,nome,uf])=>[codigo,{codigo,nome,uf}]));
const TIPOS=['supermercado','material_construcao'],AVISO='central-v1-2026-10-28';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const erro=(m,c='invalid-argument')=>{throw new HttpsError(c,m);};
const id=v=>typeof v==='string'&&/^[\w-]{1,128}$/.test(v);
function texto(v,max=100){if(typeof v!=='string'||!v.trim()||v.length>max||/[\x00-\x1f<>@]|https?:|www\.|\d[\d .()/-]{9,}\d/i.test(v))erro('Informe somente a especificação comercial, sem contatos, documentos ou links.');return v.trim().normalize('NFC');}
function cidade(codigo,uf){const c=cidades.get(codigo);if(!c||c.uf!==uf)erro('Selecione município IBGE e UF compatíveis.');return c;}
function gtin(v){if(!/^(\d{8}|\d{12,14})$/.test(v)||/^0+$/.test(v))return false;let s=0;for(let i=v.length-2,p=0;i>=0;i--,p++)s+=Number(v[i])*(p%2?1:3);return (10-s%10)%10===Number(v.at(-1));}
function cnpj(v){if(typeof v!=='string'||!/^\d{14}$/.test(v)||/^(\d)\1+$/.test(v))erro('Informe o CNPJ comercial válido da filial.');for(let n=12;n<14;n++){let soma=0,p=n-7;for(let i=0;i<n;i++){soma+=Number(v[i])*p--;if(p<2)p=9;}const r=soma%11;if(Number(v[n])!==(r<2?0:11-r))erro('CNPJ comercial inválido.');}return v;}
function produto(d){
 if(!TIPOS.includes(d.tipo))erro('Somente Supermercado e Material de construção contribuem nesta versão.');
 if(!['un','kg','l','m'].includes(d.unidadeComercial))erro('Unidade comercial inválida.');
 const p={nome:texto(d.nome),marca:texto(d.marca,80),variante:texto(d.variante,80),embalagem:texto(d.embalagem,80),unidadeComercial:d.unidadeComercial,tipo:d.tipo,gtin:d.gtin||'',conteudo:null,unidadeMedida:null};
 if(typeof p.gtin!=='string'||(p.gtin&&!gtin(p.gtin)))erro('GTIN inválido; código interno da loja não é GTIN.');
 if(d.conteudo!=null&&d.conteudo!==''){if(!Number.isFinite(d.conteudo)||d.conteudo<.000001||d.conteudo>100000||Math.abs(d.conteudo*1000000-Math.round(d.conteudo*1000000))>.00001||!['kg','l','un'].includes(d.unidadeMedida))erro('Conteúdo e medida inválidos.');p.conteudo=d.conteudo;p.unidadeMedida=d.unidadeMedida;}
 if(p.unidadeComercial!=='un'&&p.conteudo!==null)erro('Preço a granel já é por medida; não acrescente conversão de embalagem.');
 for(const k of ['nome','marca','variante','embalagem'])p[k]=p[k].toLocaleUpperCase('pt-BR');
 return p;
}
// O identificador exige a especificação integral revisada, nunca apenas nome/GTIN.
const chaveProduto=p=>hash(Object.fromEntries(Object.entries(p).map(([k,v])=>[k,typeof v==='string'?v.toLocaleUpperCase('pt-BR'):v])));
const identidadePrivada=p=>hash([p?.nome||'',p?.marca||'',p?.apresentacao||'',p?.unidadeCompra||'',p?.gtin||'']);
const instante=v=>v?.toMillis?.()??(v instanceof Date?v.getTime():NaN);
function precoPago(p,lista){
 const quantidade=Number(p.quantidadeComprada),valor=Number(p.precoUnitarioCentavos);
 if(!Number.isFinite(quantidade)||quantidade<=0||!Number.isSafeInteger(valor)||valor<=0||valor>100000000)return null;
 // O contrato público usa centavos inteiros; não publicar como exato um
 // unitário fiscal que só cabe nesse contrato depois de arredondamento.
 if(p.precoUnitarioOriginalFiscal)return null;
 // Não ratear desconto global por aproximação. Notas com desconto global aguardam
 // comprovação por item; o banco privado de preços originais permanece intacto.
 if(Number(lista.descontoCentavos)>0)return null; // O contrato atual não comprova o líquido por linha; campo avulso não é prova.
 return valor;
}
function publicacao(p){return {produto:{nome:p.produto.nome,marca:p.produto.marca,variante:p.produto.variante,embalagem:p.produto.embalagem,unidadeComercial:p.produto.unidadeComercial,conteudo:p.produto.conteudo??null,unidadeMedida:p.produto.unidadeMedida??null},categoria:p.categoria,precoCentavos:p.precoCentavos,precoMedidaCentavos:p.precoMedidaCentavos??null,medida:p.medida??null,estabelecimento:{nome:p.estabelecimento.nome,filial:p.estabelecimento.filial},municipio:{codigo:p.municipio.codigo,nome:p.municipio.nome,uf:p.municipio.uf},dataMs:p.dataMs,atualizadoMs:p.atualizadoMs};}
module.exports={TIPOS,AVISO,hash,id,texto,cidade,cnpj,produto,chaveProduto,identidadePrivada,instante,precoPago,publicacao,erro};
