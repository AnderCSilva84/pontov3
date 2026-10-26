import Tarefas from './Tarefas';
// Agenda operacional existente, sem consulta à coleção de cuidados.
export default function LembretesGerais(props) {
  return <Tarefas {...props} rotaAtual="/tarefas" />;
}
