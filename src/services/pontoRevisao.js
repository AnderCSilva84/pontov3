import {httpsCallable} from 'firebase/functions';
import {auth,functions} from './firebase';
import {obterGrupoAtual} from './dadosGrupo';
import {filaPonto,escopoPonto} from './pontoFila';
export async function revisarPendencia(dados){
  const uid=auth.currentUser?.uid,grupoId=obterGrupoAtual();
  if(!uid)throw Error('Entre novamente.');
  const endpoint=['detalheDia','ajustarDia'].includes(dados.acao)?'ajustarJornadaPonto':'revisarPendenciaPonto';
  const resultado=await httpsCallable(functions,endpoint,{timeout:25000})({...dados,grupoId}).then(r=>r.data);
  if(auth.currentUser?.uid!==uid||obterGrupoAtual()!==grupoId)throw Error('A sessão mudou. Consulte novamente na conta correta.');
  if(dados.acao==='listar'){
    const escopo=escopoPonto(uid,grupoId?{tipo:'grupo',id:grupoId}:{tipo:'legado'});
    for(const item of resultado.itens)if(item.uid===uid&&item.decisao)await filaPonto.aplicarRevisao(escopo,item.decisao.resultado);
    if(auth.currentUser?.uid===uid&&obterGrupoAtual()===grupoId)window.dispatchEvent(new Event('ap1303-ponto-revisado'));
  }
  if(auth.currentUser?.uid!==uid||obterGrupoAtual()!==grupoId)throw Error('A sessão mudou. Consulte novamente na conta correta.');
  if(dados.acao==='ajustarDia'&&resultado.dia)window.dispatchEvent(new CustomEvent('ap1303-jornada-corrigida',{detail:resultado}));
  return resultado;
}
