// O teclado pode reduzir só o visualViewport, sem alterar a altura do layout.
export function acompanharDialogViewport(dialog, janela = window) {
 const viewport = janela.visualViewport;
 let quadro;
 const atualizar = () => {
  dialog.style.setProperty('--dialog-altura-visivel', `${viewport?.height || janela.innerHeight}px`);
  dialog.style.setProperty('--dialog-topo-visivel', `${viewport?.offsetTop || 0}px`);
  const campo = dialog.ownerDocument.activeElement;
  const editando = dialog.contains(campo) && campo?.matches('input:not([type=checkbox]):not([type=radio]),textarea,select');
  dialog.classList.toggle('compras-dialog-editando', !!editando);
  janela.cancelAnimationFrame(quadro);
  if (editando) quadro = janela.requestAnimationFrame(() => campo.scrollIntoView({block:'nearest',inline:'nearest'}));
 };
 viewport?.addEventListener('resize', atualizar);
 viewport?.addEventListener('scroll', atualizar);
 janela.addEventListener('resize', atualizar);
 dialog.addEventListener('focusin', atualizar);
 dialog.addEventListener('focusout', atualizar);
 atualizar();
 return () => {
  janela.cancelAnimationFrame(quadro);
  viewport?.removeEventListener('resize', atualizar);
  viewport?.removeEventListener('scroll', atualizar);
  janela.removeEventListener('resize', atualizar);
  dialog.removeEventListener('focusin', atualizar);
  dialog.removeEventListener('focusout', atualizar);
 };
}
