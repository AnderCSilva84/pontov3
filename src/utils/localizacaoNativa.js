export function erroLocalizacao(codigo) {
  const mensagens={
    aproximada:['O Android está fornecendo localização aproximada. Para validar o local do ponto, ative “Usar localização precisa” em Configurações → Aplicativos → Tá no Ponto → Permissões → Localização.','permissao'],
    permissao:['Localização não permitida. Em Configurações → Aplicativos → Tá no Ponto → Permissões → Localização, escolha “Permitir durante o uso” e ative a localização precisa.','permissao'],
    bloqueada:['A permissão de localização está bloqueada. Abra Configurações → Aplicativos → Tá no Ponto → Permissões → Localização e permita durante o uso, com localização precisa. O app não repetirá o pedido automaticamente.','permissao'],
    desligada:['A localização do aparelho está desligada ou indisponível nas configurações. Ative Localização no Android e tente registrar novamente.','servico'],
    timeout:['A busca de localização excedeu o tempo de espera. Vá para um lugar com melhor sinal, como próximo de uma janela, e toque em registrar novamente. Nenhuma tentativa foi salva.','sinal'],
    configuracao:['A versão instalada não declarou as permissões de localização. Atualize o APK de desenvolvimento.','atualizar'],
    indisponivel:['Não foi possível obter a localização. Confira o serviço de Localização e os serviços de localização do Google no aparelho e tente novamente.','sinal'],
  };
  const [mensagem,ajusteLocalizacao]=mensagens[codigo]||mensagens.indisponivel;
  return Object.assign(new Error(mensagem),{code:`localizacao/${codigo}`,ajusteLocalizacao});
}
export function normalizarPosicao(posicao) {
  const c=posicao?.coords;
  if(!c||!Number.isFinite(c.latitude)||!Number.isFinite(c.longitude)||Math.abs(c.latitude)>90||Math.abs(c.longitude)>180)throw erroLocalizacao('indisponivel');
  return {latitude:c.latitude,longitude:c.longitude,accuracy:Number.isFinite(c.accuracy)?c.accuracy:null,instanteMs:Number.isFinite(posicao.timestamp)?posicao.timestamp:null};
}
export function criarLocalizacaoNativa(plugin) {
  let buscando;
  async function executar(prazo) {
    try {
      let permissoes=await plugin.checkPermissions();
      if(permissoes.location!=='granted'&&permissoes.coarseLocation==='granted')throw erroLocalizacao('aproximada');
      if(permissoes.location==='denied')throw erroLocalizacao('bloqueada');
      if(permissoes.location!=='granted')permissoes=await plugin.requestPermissions({permissions:['location']});
      if(permissoes.location!=='granted')throw erroLocalizacao(permissoes.coarseLocation==='granted'?'aproximada':permissoes.location==='denied'?'bloqueada':'permissao');
      let timer;
      try {
        return normalizarPosicao(await Promise.race([
          plugin.getCurrentPosition({enableHighAccuracy:true,maximumAge:0,timeout:prazo,enableLocationFallback:true}),
          new Promise((_,reject)=>{timer=setTimeout(()=>reject(erroLocalizacao('timeout')),prazo+500);}),
        ]));
      } finally{clearTimeout(timer);}
    } catch(e) {
      if(e.ajusteLocalizacao)throw e;
      if(e.code==='OS-PLUG-GLOC-0003'){
        let p;try{p=await plugin.checkPermissions();}catch{/* Mantém a recusa sem novo pedido. */}
        throw erroLocalizacao(p?.location==='denied'?'bloqueada':'permissao');
      }
      if(['OS-PLUG-GLOC-0007','OS-PLUG-GLOC-0009','OS-PLUG-GLOC-0016','OS-PLUG-GLOC-0017'].includes(e.code))throw erroLocalizacao('desligada');
      if(e.code==='OS-PLUG-GLOC-0010')throw erroLocalizacao('timeout');
      if(e.code==='OS-PLUG-GLOC-0018')throw erroLocalizacao('configuracao');
      if(e.code==='OS-PLUG-GLOC-0008')throw erroLocalizacao('bloqueada');
      throw erroLocalizacao('indisponivel');
    }
  }
  return {obter:(prazo=10000)=>{
    if(!buscando)buscando=executar(prazo).finally(()=>{buscando=null;});
    return buscando;
  }};
}
