import { useEffect } from 'react';
export default function useDialogFocus(ref, open, close) {
  useEffect(() => {
    if (!open || !ref.current) return;
    const anterior = document.activeElement, dialog = ref.current;
    const selecionaveis = () => [...dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href]')];
    selecionaveis()[0]?.focus();
    const tecla = e => { if (e.key === 'Escape') { e.preventDefault(); close(); } else if (e.key === 'Tab') { const campos = selecionaveis(), primeiro = campos[0], ultimo = campos.at(-1); if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo?.focus(); } else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro?.focus(); } } };
    dialog.addEventListener('keydown', tecla);
    return () => { dialog.removeEventListener('keydown', tecla); anterior?.focus(); };
  }, [ref,open,close]);
}
