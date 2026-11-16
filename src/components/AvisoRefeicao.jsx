import { Icon } from './ui';
export default function AvisoRefeicao({ titulo, mensagem }) {
  return <div className="aviso-refeicao"><Icon name="meal"/><h3>{titulo}</h3><p>{mensagem}</p></div>;
}
