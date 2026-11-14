// Apenas dados fictícios para os emuladores. Nunca executa contra produção.
const projectId = require('../functions/teste-local.cjs').exigirEmuladoresLocais();
const admin = require('../functions/node_modules/firebase-admin');
admin.initializeApp({ projectId });
const { comprasOperacao } = require('../functions/compras.cjs');
async function main() {
  const db = admin.firestore();
  const usuario = await admin.auth().createUser({ email: 'admin@example.test', password: 'demo-compras-123', displayName: 'Admin de teste' });
  await db.doc(`users/${usuario.uid}`).set({ nome: 'Admin de teste', role: 'admin', ativo: true });
  const op = (operacao, dados = {}) => comprasOperacao.run({ auth: { uid: usuario.uid }, data: { ...dados, operacao } });
  await op('inicializar');
  const produtos = [ ['banana', 'Banana prata', 'A granel', 'hortifruti', 'kg'], ['arroz', 'Arroz marca A', 'Pacote de 1 kg', 'mercearia', 'un'], ['pao', 'Pão francês', 'A granel', 'padaria', 'kg'] ];
  for (const [produtoId, nome, apresentacao, categoriaId, unidadeCompra] of produtos) await op('produto', { produtoId, nome, apresentacao, categoriaId, unidadeCompra });
  const lojas = [];
  for (const nome of ['Mercado X', 'Mercado Y']) lojas.push((await op('supermercado', { nome, filial: 'Centro', cidade: 'Belém' })).supermercadoId);
  for (let compra = 0; compra < 4; compra++) {
    const listaId = `demo-historico-${compra}`;
    await op('criar', { listaId, titulo: `Compra de demonstração ${compra + 1}` });
    await op('iniciar', { listaId });
    for (let i = 0; i < produtos.length; i++) {
      const produtoId = produtos[i][0];
      await op('adicionar', { listaId, produtoId, quantidadePlanejada: 2 });
      await op('item', { listaId, itemId: produtoId, versao: 1, estado: 'comprado', supermercadoId: lojas[compra % 2], quantidadeComprada: 2, precoUnitarioCentavos: 400 + i * 100 + compra * 50 });
      await db.doc(`comprasListas/${listaId}/itens/${produtoId}`).update({ compradoEm: admin.firestore.Timestamp.fromMillis(Date.now() - (20 - compra * 5) * 86400000) });
    }
    const lista = (await db.doc(`comprasListas/${listaId}`).get()).data();
    await op('finalizar', { listaId, versao: lista.versao });
  }
  await op('criar', { listaId: 'demo-semana', titulo: 'Compras da semana' });
  for (const p of produtos) await op('adicionar', { listaId: 'demo-semana', produtoId: p[0], quantidadePlanejada: 2 });
  console.log('Dados fictícios preparados exclusivamente nos emuladores locais.');
  await admin.app().delete();
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
