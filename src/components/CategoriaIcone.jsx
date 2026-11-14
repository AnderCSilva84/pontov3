import { Icon } from './ui';
import colecao from '../../functions/compras-icones.json';

// Os identificadores salvos permanecem compatíveis; só a representação muda.
export default function CategoriaIcone({ icone }) {
  const nome = (colecao.find(item => item.icone === icone)?.nome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const tipo = /oficina|carro|moto|pneu|bateria|bicicleta/.test(nome) ? 'tool'
    : /pet|cao|gato|animal/.test(nome) ? 'paw'
    : /peix|mar/.test(nome) ? 'fish'
    : /saude|farm|socorro/.test(nome) ? 'health'
    : /casa|jardim/.test(nome) ? 'home'
    : /carne|padaria|grao|bebida|frio|confeitaria|horti|talher/.test(nome) ? 'meal'
    : 'box';
  return <Icon name={tipo} />;
}
