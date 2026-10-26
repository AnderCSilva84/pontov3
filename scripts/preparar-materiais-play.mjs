import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';

// Materiais locais revisáveis. Não faz upload, rede ou alteração de identidade/assinatura.
const destino='output/google-play-script15';
const documento=readFileSync('docs/mobile/google-play/ficha-e-revisao.md','utf8');
function bloco(titulo,proximo){
 const inicio=documento.indexOf(titulo),fim=documento.indexOf(proximo,inicio+titulo.length);
 if(inicio<0||fim<0)throw Error('Ficha sem os blocos esperados.');
 return documento.slice(inicio,fim).split('\n').filter(l=>l.startsWith('>')).map(l=>l.replace(/^> ?/,'')).join('\n').trim();
}
const nome='AP1303',curta=bloco('Descrição curta proposta','Descrição completa proposta'),completa=bloco('Descrição completa proposta','Revisar descrição final');
if(!curta||!completa||nome.length>30||curta.length>80||completa.length>4000)throw Error('Ficha fora dos limites ou incompleta.');
const icone=readFileSync('public/icon-512.png');
if(icone.readUInt32BE(16)!==512||icone.readUInt32BE(20)!==512||icone.length>1024*1024)throw Error('Ícone fora das dimensões/tamanho esperados.');
mkdirSync(destino,{recursive:true});
copyFileSync('public/icon-512.png',destino+'/icone-512.png');
writeFileSync(destino+'/ficha-pt-BR.json',JSON.stringify({rascunho:true,nome,responsavel:'Anderson Costa e Silva',emailSuporte:'andersoncsilva84@hotmail.com',emailPrivacidade:'andersoncsilva84@hotmail.com',paginasPreparadas:{publicadasNestaEtapa:false,privacidade:'https://ponto.acstech.dev.br/privacidade/',suporte:'https://ponto.acstech.dev.br/suporte/',exclusao:'https://ponto.acstech.dev.br/excluir-conta/'},descricaoCurta:curta,descricaoCompleta:completa,caracteres:{nome:nome.length,curta:curta.length,completa:completa.length}},null,2)+'\n');
const logo=readFileSync('src/assets/ap1303.jpeg').toString('base64');
writeFileSync(destino+'/feature-graphic.html',`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>AP1303 — candidato para revisão</title><style>*{box-sizing:border-box}html,body{width:1024px;height:500px;margin:0;overflow:hidden}body{background:#2c5598;color:white;font-family:Arial,sans-serif;display:flex;align-items:center;padding:24px 52px 24px 12px;gap:30px}img{width:440px;height:440px;object-fit:contain;flex:none}main{width:490px;border-left:6px solid #ed333f;padding-left:30px}h1{font-size:44px;line-height:1.13;margin:0 0 26px;font-weight:700}p{font-size:25px;line-height:1.6;margin:0;color:#f0f4ff}</style><img alt="Marca oficial AP1303" src="data:image/jpeg;base64,${logo}"><main><h1>Sua rotina,<br>mais simples.</h1><p>Ponto · Tarefas · Compras<br>Lembretes · Gestão</p></main></html>`);
console.log(JSON.stringify({destino,rascunho:true,icone:'512x512',caracteres:{nome:nome.length,curta:curta.length,completa:completa.length},featureGraphic:'HTML 1024x500 pronto para renderização local; não enviado'}));
