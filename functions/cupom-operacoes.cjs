const { HttpsError } = require('firebase-functions/v2/https');
const { createHash } = require('node:crypto');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');
const { lerTextoNota, chaveAlias, normalizar } = require('./cupom-dominio.cjs');
const erro = (codigo, mensagem) => { throw new HttpsError(codigo, mensagem); };
const idValido = valor => typeof valor === 'string' && /^[\w-]{1,128}$/.test(valor);
const campo = (v, max = 120, mensagem = 'Preencha nome e apresentação dos produtos.') => { if (typeof v !== 'string' || !v.trim() || v.trim().length > max) erro('invalid-argument', mensagem); return v.trim(); };
async function operarCupom(db, request, { consultar = require('./cupom-consulta.cjs').consultarNotaCupom } = {}) {
  const uid = request.auth?.uid, dados = request.data || {};
  if (!uid) erro('unauthenticated', 'Entre no app para importar.');
  let notaConsultada;
  if (dados.operacao === 'cupomPreparar' && dados.automatico === true) {
    // A consulta externa ocorre uma vez, antes da transação; permissões são
    // conferidas antes da rede e novamente antes de criar o rascunho.
    const perfil = (await db.doc(`users/${uid}`).get()).data();
    if (perfil?.ativo === false || perfil?.role !== 'admin') erro('permission-denied', 'Somente o administrador pode importar uma compra.');
    try { notaConsultada = await consultar(dados.link); }
    catch { erro('unavailable', 'A consulta automática da SEFA não retornou uma nota completa. Tente novamente ou use o texto da nota. Nenhuma compra foi criada.'); }
  }
  return db.runTransaction(async tx => {
    const perfil = (await tx.get(db.doc(`users/${uid}`))).data();
    if (perfil?.ativo === false || perfil?.role !== 'admin') erro('permission-denied', 'Somente o administrador pode importar uma compra.');
    if (dados.operacao === 'cupomPreparar') {
      let destino = null, planejados = [];
      if (dados.listaDestinoId !== undefined) {
        if (!idValido(dados.listaDestinoId)) erro('invalid-argument', 'Lista de destino inválida.');
        const lista = (await tx.get(db.doc(`comprasListas/${dados.listaDestinoId}`))).data();
        if (!lista || !['rascunho', 'em_compra'].includes(lista.status)) erro('failed-precondition', 'Escolha uma lista aberta para comparar com a nota.');
        const snap = await tx.get(db.collection(`comprasListas/${dados.listaDestinoId}/itens`).limit(201));
        if (snap.size > 200) erro('failed-precondition', 'A lista ultrapassa o limite de 200 itens.');
        planejados = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        destino = { id: dados.listaDestinoId, titulo: lista.titulo, versao: lista.versao };
      }
      let nota;
      try { nota = notaConsultada || lerTextoNota(dados.link, dados.texto); } catch (e) { erro('invalid-argument', e.message); }
      const jaImportada = await tx.get(db.doc(`comprasCupons/${nota.chave}`));
      if (jaImportada.exists) erro('already-exists', 'Este cupom já foi importado. Consulte o histórico.');
      const aliases = await tx.getAll(...nota.itens.map(i => db.doc(`comprasAliases/${chaveAlias(nota.cnpj, i)}`)));
      nota.itens = nota.itens.map((item, index) => {
        const anterior = aliases[index].data();
        return item.unidadeConferir && anterior?.unidadeComercialConfirmada === true && anterior.unidadeCompra === item.unidadeCompra
          ? { ...item, unidadeConferir: false, unidadeReconhecida: true }
          : item;
      });
      const ids = [...new Set([...aliases.map(a => a.data()?.produtoId), ...planejados.map(i => i.produtoId)].filter(idValido))];
      const produtos = ids.length ? await tx.getAll(...ids.map(id => db.doc(`catalogoCompras/${id}`))) : [];
      const sugestoes = nota.itens.map((i, index) => {
        let produto = produtos.find(p => p.id === aliases[index].data()?.produtoId && p.exists && p.data().ativo !== false && p.data().unidadeCompra === i.unidadeCompra);
        if (!produto) {
          const exatos = planejados.filter(p => normalizar(p.nomeSnapshot) === normalizar(i.nomeOriginal) && p.unidadeCompra === i.unidadeCompra);
          if (exatos.length === 1) produto = produtos.find(p => p.id === exatos[0].produtoId && p.exists && p.data().ativo !== false && p.data().unidadeCompra === i.unidadeCompra);
        }
        const correspondencias = produto ? planejados.filter(p => p.produtoId === produto.id && p.unidadeCompra === i.unidadeCompra) : [];
        return { ...i, marca: correspondencias.length === 1 ? correspondencias[0].marca || '' : '', itemPlanejadoId: correspondencias.length === 1 ? correspondencias[0].id : '', ...(produto ? { produtoId: produto.id, nome: produto.data().nome, categoriaId: produto.data().categoriaId, apresentacao: produto.data().apresentacao, reconhecido: true, origemReconhecimento: aliases[index].data()?.produtoId === produto.id ? 'importacao' : 'lista' } : { nome: i.nomeOriginal.slice(0, 120), categoriaId: '', apresentacao: '', reconhecido: false }) };
      });
      const ref = db.collection('comprasCuponsRascunhos').doc();
      tx.create(ref, { uid, nota, ...(destino ? { listaDestinoId: destino.id, listaDestinoVersao: destino.versao } : {}), expiraEm: Timestamp.fromMillis(Date.now() + 86400000), criadaEm: FieldValue.serverTimestamp() });
      return { rascunhoId: ref.id, nota: { ...nota, itens: sugestoes }, origemDados: notaConsultada ? 'consulta_sefa' : 'texto_conferido', ...(destino ? { destino: { ...destino, itens: planejados.map(i => ({ id: i.id, produtoId: i.produtoId, nome: i.nomeSnapshot, marca: i.marca || '', unidadeCompra: i.unidadeCompra, quantidadePlanejada: i.quantidadePlanejada, estado: i.estado })) } } : {}) };
    }
    if (dados.operacao !== 'cupomConfirmar' || !idValido(dados.rascunhoId)) erro('invalid-argument', 'Importação inválida.');
    const ref = db.doc(`comprasCuponsRascunhos/${dados.rascunhoId}`), rascunho = (await tx.get(ref)).data();
    if (!rascunho || rascunho.uid !== uid) erro('not-found', 'Importação não encontrada.');
    if (rascunho.listaId) return { listaId: rascunho.listaId, jaImportada: true };
    if (rascunho.expiraEm.toMillis() < Date.now()) erro('failed-precondition', 'A revisão expirou. Prepare a nota novamente.');
    const { nota } = rascunho;
    if (!Array.isArray(dados.itens) || dados.itens.length !== nota.itens.length || dados.itens.some((i, n) => !i || i.linha !== n + 1 || typeof i.descartar !== 'boolean')) erro('invalid-argument', 'Revise todas as linhas da nota.');
    const aceitos = dados.itens.filter(i => !i.descartar);
    if (!aceitos.length) erro('invalid-argument', 'Selecione ao menos um produto para importar.');
    const marker = db.doc(`comprasCupons/${nota.chave}`), listaRef = db.doc(`comprasListas/${rascunho.listaDestinoId || `cupom_${nota.chave}`}`);
    if ((await tx.get(marker)).exists) erro('already-exists', 'Este cupom já foi importado.');
    const listaSnap = await tx.get(listaRef), listaAnterior = listaSnap.data();
    let planejados = [];
    if (rascunho.listaDestinoId) {
      if (!listaAnterior || !['rascunho', 'em_compra'].includes(listaAnterior.status)) erro('failed-precondition', 'Esta lista já foi fechada ou excluída.');
      if (listaAnterior.versao !== rascunho.listaDestinoVersao) erro('aborted', 'A lista mudou durante a revisão. Volte à nota e prepare a comparação novamente.');
      const snap = await tx.get(listaRef.collection('itens').limit(201));
      if (snap.size > 200) erro('failed-precondition', 'Limite de 200 itens por lista.');
      planejados = snap.docs.map(d => ({ ...d.data(), id: d.id }));
    } else if (listaSnap.exists) erro('already-exists', 'Este cupom já foi importado.');
    const retirarIds = dados.retirarPlanejados ?? [];
    if (!Array.isArray(retirarIds) || retirarIds.length > 200 || retirarIds.some(id => !idValido(id)) || new Set(retirarIds).size !== retirarIds.length) erro('invalid-argument', 'Itens a retirar inválidos.');
    const retirar = new Set(retirarIds);
    for (const id of retirar) {
      const item = planejados.find(p => p.id === id);
      if (!item || ['comprado', 'comprado_sem_preco'].includes(item.estado) || aceitos.some(i => i.itemPlanejadoId === id)) erro('failed-precondition', 'Só é possível retirar itens desta lista que não foram comprados nem associados à nota.');
    }
    const titulo = dados.titulo === undefined ? (listaAnterior?.titulo || `Cupom · ${nota.emitente}`.slice(0, 120)) : campo(dados.titulo, 120, 'Informe um nome para a lista, com até 120 caracteres.');
    let nomeAutoria = listaAnterior?.criadaPorNome;
    if (!nomeAutoria) {
      const criador = listaAnterior?.criadaPor && listaAnterior.criadaPor !== uid ? (idValido(listaAnterior.criadaPor) ? (await tx.get(db.doc(`users/${listaAnterior.criadaPor}`))).data() : null) : perfil;
      nomeAutoria = String(criador?.nome || criador?.name || 'Nome não disponível').slice(0, 120);
    }
    if (!idValido(dados.supermercadoId)) erro('invalid-argument', 'Escolha o supermercado do cupom.');
    const mercado = (await tx.get(db.doc(`supermercados/${dados.supermercadoId}`))).data();
    if (!mercado || mercado.ativo === false) erro('invalid-argument', 'Supermercado indisponível.');
    const catalogo = new Map(), categorias = new Map(), planos = [], aliasesConfirmados = new Map();
    // Todas as leituras antecedem as escritas, incluindo produtos/categorias repetidos.
    for (const escolha of aceitos) {
      const original = nota.itens[escolha.linha - 1], alias = chaveAlias(nota.cnpj, original);
      if (original.unidadeConferir && escolha.unidadeConfirmada !== true) erro('invalid-argument', `Confirme a unidade comercial ${original.unidadeOriginal} da linha ${original.linha} antes de importar.`);
      const planejado = escolha.itemPlanejadoId ? planejados.find(p => p.id === escolha.itemPlanejadoId) : null;
      if (escolha.itemPlanejadoId && !planejado) erro('invalid-argument', 'O item associado não pertence à lista de destino.');
      if (planejado && (planejado.unidadeCompra !== original.unidadeCompra || (escolha.produtoId && escolha.produtoId !== planejado.produtoId))) erro('invalid-argument', 'Produto ou unidade incompatível com o item planejado.');
      const produtoId = planejado?.produtoId || escolha.produtoId || `fiscal_${createHash('sha256').update(JSON.stringify([alias, escolha.nome, escolha.apresentacao, escolha.categoriaId])).digest('hex')}`;
      if (!idValido(produtoId)) erro('invalid-argument', 'Produto inválido.');
      if (!catalogo.has(produtoId)) catalogo.set(produtoId, (await tx.get(db.doc(`catalogoCompras/${produtoId}`))).data() || null);
      const atual = catalogo.get(produtoId);
      if ((escolha.produtoId || planejado) && !atual) erro('invalid-argument', 'Produto do catálogo não encontrado.');
      if (atual && (atual.ativo === false || atual.unidadeCompra !== original.unidadeCompra)) erro('invalid-argument', 'A unidade do produto selecionado não corresponde à nota.');
      const produto = atual || { nome: campo(escolha.nome), apresentacao: campo(escolha.apresentacao), categoriaId: escolha.categoriaId, unidadeCompra: original.unidadeCompra, ativo: true };
      if (!idValido(produto.categoriaId)) erro('invalid-argument', 'Escolha a categoria de cada produto.');
      if (!categorias.has(produto.categoriaId)) categorias.set(produto.categoriaId, (await tx.get(db.doc(`categoriasCompras/${produto.categoriaId}`))).data());
      if (!categorias.get(produto.categoriaId) || categorias.get(produto.categoriaId).ativo === false) erro('invalid-argument', 'Categoria indisponível.');
      const anterior = aliasesConfirmados.get(alias);
      if (anterior && (anterior.produtoId !== produtoId || normalizar(anterior.produto.nome) !== normalizar(produto.nome) || anterior.produto.categoriaId !== produto.categoriaId || anterior.produto.apresentacao !== produto.apresentacao)) erro('invalid-argument', 'Linhas repetidas do mesmo produto precisam usar o mesmo nome, embalagem e categoria.');
      aliasesConfirmados.set(alias, { produtoId, produto, unidadeCompra: original.unidadeCompra, unidadeComercialConfirmada: original.unidadeConferir === true || original.unidadeReconhecida === true });
      const marca = escolha.marca === undefined ? (planejado?.marca || '') : (typeof escolha.marca === 'string' && escolha.marca.trim().length <= 80 ? escolha.marca.trim() : erro('invalid-argument', 'Informe uma marca com até 80 caracteres.'));
      planos.push({ escolha, original, alias, produtoId, produto, marca, novo: !atual, planejado });
    }
    const autores = new Map();
    for (const p of planos) { const autorId = p.planejado?.solicitadaPor; if (autorId && autorId !== uid && idValido(autorId) && !autores.has(autorId)) autores.set(autorId, (await tx.get(db.doc('users/' + autorId))).data()); }
    const associados = new Set(planos.map(p => p.planejado?.id).filter(Boolean));
    const naoEncontrados = planejados.filter(p => !associados.has(p.id) && !retirar.has(p.id));
    if (naoEncontrados.some(p => ['comprado', 'comprado_sem_preco'].includes(p.estado))) erro('failed-precondition', 'Há produtos já comprados fora desta nota. Associe-os corretamente ou importe o cupom em uma nova lista.');
    if (planejados.some(p => p.estado === 'comprado' && p.supermercadoId !== dados.supermercadoId)) erro('failed-precondition', 'A lista já tem compra de outra filial. Importe este cupom em uma nova lista para preservar os registros.');
    if (naoEncontrados.length + planos.length > 200 || new Set(planos.filter(p => p.novo).map(p => p.produtoId)).size + aliasesConfirmados.size + planos.length * 2 + naoEncontrados.length + retirar.size + 3 > 490) erro('failed-precondition', 'Esta combinação de lista e nota ultrapassa o limite da importação. Importe o cupom em uma nova lista.');
    const quando = Timestamp.fromDate(new Date(nota.emitidaEm)), agora = FieldValue.serverTimestamp();
    const supermercadoNome = `${mercado.nome} · ${mercado.filial} (${mercado.cidade})`;
    const totalImportado = planos.reduce((s, p) => s + p.original.totalCentavos, 0);
    const cabecalho = { ...(listaAnterior || {}), titulo, origem: 'cupom', status: 'finalizada', criadaPor: listaAnterior?.criadaPor || uid, criadaPorNome: nomeAutoria, criadaEm: listaAnterior?.criadaEm || agora, atualizadaEm: agora, finalizadaPor: uid, finalizadaEm: quando, importadaEm: agora, quantidadeItens: planos.length + naoEncontrados.length, quantidadeComprados: planos.length, quantidadeItensCupom: nota.itens.length, quantidadeDescartados: nota.itens.length - planos.length, totalOriginalCentavos: nota.totalOriginalCentavos, descontoCentavos: nota.descontoCentavos, totalCentavos: nota.totalPagoCentavos, totalProdutosImportadosCentavos: totalImportado, totalProdutosDescartadosCentavos: nota.totalOriginalCentavos - totalImportado, cupomChave: nota.chave, emitenteCnpj: nota.cnpj, versao: (listaAnterior?.versao || 0) + 1, schemaVersion: 1, ...(rascunho.listaDestinoId ? { quantidadePlanejados: planejados.length, quantidadePlanejadosEncontrados: associados.size } : {}) };
    const criados = new Set(), usados = new Set();
    // Calcula todos os IDs antes de gravar para não sobrescrever uma pendência.
    for (const p of planos) {
      p.itemId = p.planejado && !usados.has(p.planejado.id) ? p.planejado.id : (rascunho.listaDestinoId ? `cupom_${nota.chave}_linha_${p.original.linha}` : `linha_${p.original.linha}`);
      if (usados.has(p.itemId) || (planejados.some(i => i.id === p.itemId) && p.planejado?.id !== p.itemId)) erro('failed-precondition', 'Conflito de itens na lista de destino. Importe em uma nova lista.');
      usados.add(p.itemId);
    }
    if (listaAnterior) tx.set(listaRef, cabecalho); else tx.create(listaRef, cabecalho);
    for (const p of planos) {
      if (p.novo && !criados.has(p.produtoId)) { tx.create(db.doc(`catalogoCompras/${p.produtoId}`), { ...p.produto, categoria: categorias.get(p.produto.categoriaId).nome }); criados.add(p.produtoId); }
      const itemId = p.itemId, anterior = planejados.find(i => i.id === itemId);
      const item = { produtoId: p.produtoId, nomeSnapshot: p.produto.nome, nomeOriginalFiscal: p.original.nomeOriginal, codigoFiscal: p.original.codigo, unidadeOriginalFiscal: p.original.unidadeOriginal, apresentacao: p.produto.apresentacao, categoriaId: p.produto.categoriaId, unidadeCompra: p.original.unidadeCompra, quantidadePlanejada: anterior?.quantidadePlanejada || p.original.quantidade, quantidadeComprada: p.original.quantidade, precoUnitarioCentavos: p.original.precoUnitarioCentavos, totalCentavos: p.original.totalCentavos, marca: p.marca, supermercadoId: dados.supermercadoId, supermercadoNome, compradoEm: quando, estado: 'comprado', solicitadaPor: anterior?.solicitadaPor || uid, solicitadaPorNome: anterior?.solicitadaPorNome || String((anterior?.solicitadaPor && anterior.solicitadaPor !== uid ? autores.get(anterior.solicitadaPor)?.nome : perfil.nome) || 'Autoria anterior não registrada'), adicionadaEm: anterior ? anterior.adicionadaEm || null : agora, versao: (anterior?.versao || 0) + 1, ...(p.planejado ? { itemPlanejadoId: p.planejado.id } : {}) };
      if (anterior) tx.set(listaRef.collection('itens').doc(itemId), item); else tx.create(listaRef.collection('itens').doc(itemId), item);
      tx.create(db.doc(`comprasPrecos/${listaRef.id}_${itemId}`), { ...item, listaId: listaRef.id, itemId, finalizadaEm: agora, valido: true, origem: 'cupom', basePreco: 'original_nota' });
    }
    for (const item of naoEncontrados) tx.update(listaRef.collection('itens').doc(item.id), { estado: 'nao_comprado', versao: item.versao + 1 });
    for (const id of retirar) tx.delete(listaRef.collection('itens').doc(id));
    for (const [alias, p] of aliasesConfirmados) tx.set(db.doc(`comprasAliases/${alias}`), { produtoId: p.produtoId, unidadeCompra: p.unidadeCompra, unidadeComercialConfirmada: p.unidadeComercialConfirmada, confirmadaPor: uid, atualizadaEm: agora });
    tx.create(marker, { listaId: listaRef.id, importadaPor: uid, importadaEm: agora });
    tx.update(ref, { listaId: listaRef.id, confirmadaEm: agora });
    return { listaId: listaRef.id, totalCentavos: nota.totalPagoCentavos };
  });
}
module.exports = { operarCupom };
