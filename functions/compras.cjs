const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');
const { CATEGORIAS, categoriaLegada, podeMontar, podeComprar, quantidade, totalItem, prepararFechamento, calcularRelatorios } = require('./compras-dominio.cjs');
const falha = (codigo, mensagem) => { throw new HttpsError(codigo, mensagem); };
function id(valor) { if (typeof valor !== 'string' || !/^[\w-]{1,128}$/.test(valor)) falha('invalid-argument', 'Identificador inválido.'); return valor; }
function texto(valor, max = 120) { if (typeof valor !== 'string' || !valor.trim() || valor.trim().length > max) falha('invalid-argument', 'Preencha os campos de texto corretamente.'); return valor.trim(); }
const timestamp = () => FieldValue.serverTimestamp();
const ICONES = require('./compras-icones.json');
const chaveNome = nome => nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

exports.comprasOperacao = onCall({ timeoutSeconds: 60 }, async request => {
  if (!request.auth) falha('unauthenticated', 'Entre no app para continuar.');
  const db = admin.firestore(), uid = request.auth.uid, dados = request.data || {};
  try {
    return await db.runTransaction(async tx => {
      const perfil = (await tx.get(db.doc(`users/${uid}`))).data();
      if (!perfil || perfil.ativo === false) falha('permission-denied', 'Acesso não autorizado.');
      const ehAdmin = perfil.role === 'admin';
      const exigirAdmin = () => { if (!ehAdmin) falha('permission-denied', 'Apenas o administrador pode fazer isso.'); };
      const exigirComprador = () => { if (!podeComprar(perfil)) falha('permission-denied', 'Somente o administrador pode realizar compras.'); };
      const exigirMontagem = () => { if (!podeMontar(perfil)) falha('permission-denied', 'Seu acesso permite apenas consultar.'); };

      if (['acessos', 'permissao'].includes(dados.operacao)) falha('failed-precondition', 'A compra é exclusiva do administrador. Reabra o app para atualizar a tela.');
      if (dados.operacao === 'categoria') {
        exigirAdmin();
        const nome = texto(dados.nome, 60), icone = dados.icone;
        if (!ICONES.some(i => i.icone === icone)) falha('invalid-argument', 'Escolha um ícone da coleção.');
        const existentes = await tx.get(db.collection('categoriasCompras').limit(101));
        const repetida = existentes.docs.find(d => chaveNome(d.data().nome) === chaveNome(nome));
        if (repetida) falha('already-exists', 'Já existe uma categoria com esse nome.');
        if (existentes.size >= 100) falha('failed-precondition', 'Limite de 100 categorias atingido.');
        const chave = require('node:crypto').createHash('sha256').update(chaveNome(nome)).digest('hex');
        const ordem = Math.max(-1, ...existentes.docs.map(d => Number(d.data().ordem) || 0)) + 1;
        tx.create(db.doc(`categoriasCompras/${chave}`), { nome, icone, ordem, ativo: true, criadaPor: uid, criadaEm: timestamp() });
        return { categoriaId: chave };
      }
      if (dados.operacao === 'inicializar') {
        exigirAdmin();
        const ref = db.doc('comprasListas/legado-v1');
        const migrada = (await tx.get(ref)).exists;
        const existentes = await tx.get(db.collection('categoriasCompras'));
        const prepararCategorias = () => { for (const c of CATEGORIAS) { if (!existentes.docs.some(d => d.id === c.id)) { const { id: chave, ...campos } = c; tx.create(db.doc(`categoriasCompras/${chave}`), campos); } } };
        if (migrada) { prepararCategorias(); return { listaId: ref.id, jaMigrado: true }; }
        const antigos = await tx.get(db.collection('listaCompras').limit(201));
        const catalogo = await tx.get(db.collection('catalogoCompras').limit(501));
        if (antigos.size > 200 || catalogo.size > 500) falha('failed-precondition', 'Migração precisa ser feita em lotes pelo administrador.');
        const pendentes = antigos.docs.filter(d => d.data().solicitado !== false && !d.data().comprado);
        const usuarios = await tx.get(db.collection('users'));
        const semCatalogo = pendentes.filter(d => !catalogo.docs.some(p => p.id === d.id));
        if (catalogo.size + pendentes.length + semCatalogo.length + CATEGORIAS.length + 1 > 450) falha('failed-precondition', 'Migração precisa ser feita em lotes pelo administrador.');
        prepararCategorias();
        for (const p of catalogo.docs) tx.set(p.ref, { nome: p.data().nome || p.id, categoriaId: categoriaLegada(p.data().categoria), unidadeCompra: p.data().unidadeCompra || 'un', apresentacao: p.data().apresentacao || '', ativo: p.data().ativo !== false }, { merge: true });
        tx.create(ref, { titulo: 'Lista anterior', status: 'rascunho', criadaPor: uid, criadaEm: timestamp(), atualizadaEm: timestamp(), versao: 1, quantidadeItens: pendentes.length, origem: 'listaCompras', schemaVersion: 1 });
        for (const d of pendentes) {
          const p = catalogo.docs.find(p => p.id === d.id)?.data() || d.data();
          const dono = (d.data().solicitadoPor && usuarios.docs.find(u => u.id === d.data().solicitadoPor || u.data().funcionarioId === d.data().solicitadoPor)?.id) || uid;
          // Um item legado sem catálogo recebe o mesmo ID, sem preços inventados.
          if (!catalogo.docs.some(p => p.id === d.id)) tx.set(db.doc(`catalogoCompras/${d.id}`), { nome: p.nome || d.id, categoria: p.categoria || 'Outros', categoriaId: categoriaLegada(p.categoria), apresentacao: '', unidadeCompra: 'un', ativo: true });
          tx.create(ref.collection('itens').doc(d.id), { produtoId: d.id, nomeSnapshot: p.nome || d.id, categoriaId: categoriaLegada(p.categoria), apresentacao: p.apresentacao || '', unidadeCompra: p.unidadeCompra || 'un', quantidadePlanejada: 1, estado: 'pendente', solicitadaPor: dono, versao: 1 });
        }
        return { listaId: ref.id, migrados: pendentes.length };
      }
      if (dados.operacao === 'produto') {
        exigirAdmin();
        const ref = dados.produtoId ? db.doc(`catalogoCompras/${id(dados.produtoId)}`) : db.collection('catalogoCompras').doc();
        const categoriaId = id(dados.categoriaId), unidadeCompra = dados.unidadeCompra;
        const categoria = (await tx.get(db.doc(`categoriasCompras/${categoriaId}`))).data();
        if (!categoria || categoria.ativo === false || !['un', 'kg', 'l', 'm'].includes(unidadeCompra)) falha('invalid-argument', 'Categoria ou unidade inválida.');
        const apresentacao = texto(dados.apresentacao);
        const atual = (await tx.get(ref)).data();
        if (atual && ((atual.apresentacao || '') !== apresentacao || (atual.unidadeCompra || 'un') !== unidadeCompra)) {
          const historico = await tx.get(db.collection('comprasPrecos').where('produtoId', '==', ref.id).limit(1));
          if (!historico.empty) falha('failed-precondition', 'Este produto já tem histórico. Cadastre outra embalagem como um novo produto.');
        }
        tx.set(ref, { nome: texto(dados.nome), apresentacao, categoriaId, categoria: categoria.nome, unidadeCompra, ativo: true }, { merge: true });
        return { produtoId: ref.id };
      }
      if (dados.operacao === 'supermercado') {
        exigirComprador();
        const nome = texto(dados.nome), filial = texto(dados.filial), cidade = texto(dados.cidade);
        const crypto = require('node:crypto');
        const chave = crypto.createHash('sha256').update([nome, filial, cidade].map(v => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ')).join('|')).digest('hex');
        const ref = db.doc(`supermercados/${chave}`);
        const existente = await tx.get(ref);
        if (!existente.exists) tx.create(ref, { nome, filial, cidade, ativo: true, criadoEm: timestamp() });
        return { supermercadoId: ref.id };
      }
      if (dados.operacao === 'criar') {
        exigirMontagem();
        if (dados.listaId === 'legado-v1') falha('invalid-argument', 'Identificador reservado para a importação da lista anterior.');
        const ref = db.doc(`comprasListas/${id(dados.listaId)}`);
        const existente = await tx.get(ref);
        if (existente.exists) {
          if (existente.data().criadaPor !== uid) falha('already-exists', 'Esta lista já existe.');
          return { listaId: ref.id };
        }
        tx.create(ref, { titulo: texto(dados.titulo), status: 'rascunho', criadaPor: uid, criadaEm: timestamp(), atualizadaEm: timestamp(), versao: 1, quantidadeItens: 0, schemaVersion: 1 });
        return { listaId: ref.id };
      }

      const listaRef = db.doc(`comprasListas/${id(dados.listaId)}`), listaSnap = await tx.get(listaRef), lista = listaSnap.data();
      if (!lista) falha('not-found', 'Lista não encontrada.');
      if (dados.operacao === 'finalizar') exigirComprador();
      if (dados.operacao === 'finalizar' && lista.status === 'finalizada') return { ok: true, totalCentavos: lista.totalCentavos, jaFinalizada: true };
      if (dados.operacao === 'anular') {
        exigirAdmin();
        if (lista.status === 'anulada') return { ok: true };
        if (lista.status !== 'finalizada') falha('failed-precondition', 'Apenas uma compra finalizada pode ser anulada.');
        const motivo = texto(dados.motivo, 300);
        const precos = await tx.get(db.collection('comprasPrecos').where('listaId', '==', listaRef.id));
        precos.docs.forEach(p => tx.update(p.ref, { valido: false }));
        tx.update(listaRef, { status: 'anulada', motivoAnulacao: motivo, anuladaPor: uid, anuladaEm: timestamp(), versao: lista.versao + 1 });
        return { ok: true };
      }
      if (!['rascunho', 'em_compra'].includes(lista.status)) falha('failed-precondition', 'Esta lista está fechada e não pode ser alterada.');
      const atualizarLista = campos => tx.update(listaRef, { ...campos, versao: lista.versao + 1, atualizadaEm: timestamp() });
      if (dados.operacao === 'iniciar') {
        exigirComprador();
        atualizarLista({ status: 'em_compra' });
        return { ok: true };
      }
      if (dados.operacao === 'finalizar') {
        exigirComprador();
        if (lista.status !== 'em_compra') falha('failed-precondition', 'Inicie a compra antes de finalizar.');
        if (dados.versao !== lista.versao) falha('aborted', 'A lista mudou em outro celular. Confira os itens e finalize novamente.');
        const snap = await tx.get(listaRef.collection('itens'));
        const itens = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        const { comprados, totalCentavos } = prepararFechamento(itens, dados.aceitarPendentes === true);
        for (const item of comprados) {
          const { id: itemId, produtoId, nomeSnapshot, apresentacao, unidadeCompra, categoriaId, supermercadoId, supermercadoNome, quantidadeComprada, precoUnitarioCentavos, compradoEm } = item;
          tx.create(db.doc(`comprasPrecos/${listaRef.id}_${itemId}`), { listaId: listaRef.id, itemId, produtoId, nomeSnapshot, apresentacao, unidadeCompra, categoriaId, supermercadoId, supermercadoNome, quantidadeComprada, precoUnitarioCentavos, totalCentavos: totalItem(precoUnitarioCentavos, quantidadeComprada), compradoEm, finalizadaEm: timestamp(), valido: true });
        }
        snap.docs.filter(d => d.data().estado === 'pendente').forEach(d => tx.update(d.ref, { estado: 'nao_comprado', versao: d.data().versao + 1 }));
        atualizarLista({ status: 'finalizada', finalizadaPor: uid, finalizadaEm: timestamp(), totalCentavos, quantidadeComprados: comprados.length });
        return { ok: true, totalCentavos };
      }
      if (dados.operacao === 'adicionar') {
        exigirMontagem();
        const produtoId = id(dados.produtoId), ref = listaRef.collection('itens').doc(produtoId);
        const existente = await tx.get(ref), produto = (await tx.get(db.doc(`catalogoCompras/${produtoId}`))).data();
        if (existente.exists) return { ok: true };
        if (!produto || produto.ativo === false) falha('not-found', 'Produto não encontrado.');
        if (lista.quantidadeItens >= 200) falha('failed-precondition', 'Limite de 200 itens por lista.');
        const qtd = quantidade(dados.quantidadePlanejada);
        tx.create(ref, { produtoId, nomeSnapshot: produto.nome, categoriaId: produto.categoriaId || categoriaLegada(produto.categoria), apresentacao: produto.apresentacao || '', unidadeCompra: produto.unidadeCompra || 'un', quantidadePlanejada: qtd, estado: 'pendente', solicitadaPor: uid, versao: 1 });
        atualizarLista({ quantidadeItens: lista.quantidadeItens + 1 });
        return { ok: true };
      }
      if (dados.operacao === 'item' || dados.operacao === 'remover') {
        exigirMontagem();
        const ref = listaRef.collection('itens').doc(id(dados.itemId)), item = (await tx.get(ref)).data();
        if (!item) falha('not-found', 'Item não encontrado.');
        if (dados.versao !== item.versao) falha('aborted', 'Este item mudou em outro celular. Abra novamente e confira.');
        if (dados.operacao === 'remover') {
          if (item.estado === 'comprado' || (!ehAdmin && item.solicitadaPor !== uid)) falha('permission-denied', 'Somente o administrador ou solicitante pode remover um item pendente.');
          tx.delete(ref); atualizarLista({ quantidadeItens: lista.quantidadeItens - 1 }); return { ok: true };
        }
        exigirComprador();
        if (lista.status !== 'em_compra') falha('failed-precondition', 'Inicie a compra para registrar preços.');
        if (!['pendente', 'comprado', 'nao_comprado'].includes(dados.estado)) falha('invalid-argument', 'Estado inválido.');
        let campos = { estado: dados.estado, versao: item.versao + 1 };
        if (dados.estado === 'comprado') {
          const mercado = (await tx.get(db.doc(`supermercados/${id(dados.supermercadoId)}`))).data();
          if (!mercado || mercado.ativo === false) falha('invalid-argument', 'Selecione um supermercado ativo.');
          const totalCentavos = totalItem(dados.precoUnitarioCentavos, dados.quantidadeComprada);
          campos = { ...campos, supermercadoId: dados.supermercadoId, supermercadoNome: `${mercado.nome} · ${mercado.filial} (${mercado.cidade})`, quantidadeComprada: dados.quantidadeComprada, precoUnitarioCentavos: dados.precoUnitarioCentavos, totalCentavos, compradoEm: item.estado === 'comprado' && item.compradoEm ? item.compradoEm : timestamp() };
        }
        tx.update(ref, campos); atualizarLista({}); return { ok: true };
      }
      falha('invalid-argument', 'Operação desconhecida.');
    });
  } catch (erro) {
    if (erro instanceof HttpsError) throw erro;
    if (erro.code === 10) falha('aborted', 'A lista está sendo alterada. Confira e tente novamente.');
    if (erro instanceof Error && /quantidade|preço|lista precisa|produto comprado|Confirme os itens|supermercado ou data/.test(erro.message)) falha('invalid-argument', erro.message);
    console.error('Falha em compras', { operacao: dados.operacao, codigo: erro.code || 'unknown' });
    falha('internal', 'Não foi possível salvar. Confira sua conexão e tente novamente.');
  }
});

exports.comprasRelatorio = onCall({ timeoutSeconds: 60 }, async request => {
  if (!request.auth) falha('unauthenticated', 'Entre no app para consultar.');
  const db = admin.firestore(), perfil = (await db.doc(`users/${request.auth.uid}`).get()).data();
  if (!perfil || perfil.ativo === false) falha('permission-denied', 'Acesso não autorizado.');
  const inicio = Number(request.data?.inicioMs), fim = Number(request.data?.fimMs);
  if (!Number.isFinite(inicio) || !Number.isFinite(fim) || inicio < 0 || fim < inicio || fim - inicio > 366 * 86400000) falha('invalid-argument', 'Escolha um período de até um ano.');
  const snap = await db.collection('comprasPrecos').where('compradoEm', '>=', new Date(inicio)).where('compradoEm', '<=', new Date(fim)).orderBy('compradoEm').limit(5001).get();
  if (snap.size > 5000) falha('resource-exhausted', 'Há muitos registros. Selecione um período menor.');
  const registros = snap.docs.filter(d => d.data().valido !== false).map(d => {
    const p = d.data();
    return { id: d.id, listaId: p.listaId, produtoId: p.produtoId, nomeSnapshot: p.nomeSnapshot, apresentacao: p.apresentacao, unidadeCompra: p.unidadeCompra, supermercadoId: p.supermercadoId, supermercadoNome: p.supermercadoNome, quantidadeComprada: p.quantidadeComprada, precoUnitarioCentavos: p.precoUnitarioCentavos, compradoEmMs: p.compradoEm.toMillis() };
  });
  return { registros, rankings: calcularRelatorios(registros) };
});
