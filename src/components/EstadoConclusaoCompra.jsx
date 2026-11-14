import {Icon} from './ui';
export default function EstadoConclusaoCompra({concluido,aguardando=false,revisao=false}) {
  if (aguardando) return <span className="compra-conclusao aguardando" role="status"><Icon name="clock"/>Aguardando envio</span>;
  if (!concluido) return null;
  return <div className="compra-conclusao-texto"><span className="compra-conclusao"><Icon name="check"/>{revisao?'Concluído na revisão':'Concluído'}</span>{revisao && <small>Aguardando envio da compra. Ainda não salvo.</small>}</div>;
}
