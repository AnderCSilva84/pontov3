// Apenas um ciclo no App; o hook da fila reaproveita o evento de retomada existente.
export function conectarCicloMobile({app,janela,documento}) {
  let ativo = true;
  const handles = [];
  const guardar = promessa => Promise.resolve(promessa).then(handle => ativo ? handles.push(handle) : handle.remove());
  guardar(app.addListener('appStateChange', ({isActive}) => {
    if (ativo) janela.dispatchEvent(new Event(isActive ? 'ap1303-retomar' : 'ap1303-pausar'));
  }));
  guardar(app.addListener('backButton', ({canGoBack}) => {
    if (!ativo) return;
    if (!janela.dispatchEvent(new Event('ap1303-voltar', {cancelable:true}))) return;
    const dialogs = documento.querySelectorAll('dialog[open]');
    const dialog = dialogs[dialogs.length - 1];
    if (dialog) {
      const cancelado = !dialog.dispatchEvent(new Event('cancel', {cancelable:true}));
      if (!cancelado) dialog.close();
      return;
    }
    // Reaproveita o fechador explícito; modais desconhecidos não são atravessados.
    const modal = documento.querySelector('[aria-modal="true"], [role="dialog"]');
    if (modal) { modal.querySelector('button[aria-label^="Fechar"], [data-mobile-fechar]')?.click(); return; }
    if (canGoBack) janela.history.back();
    else app.minimizeApp(); // não encerra nem apaga operações em andamento
  }));
  return () => { ativo = false; for (const h of handles) h.remove(); };
}
