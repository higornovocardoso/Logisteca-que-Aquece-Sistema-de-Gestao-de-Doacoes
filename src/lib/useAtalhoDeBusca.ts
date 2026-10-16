import { useEffect, useRef } from 'react';

/** Tecla "/" leva o cursor ao campo de busca da página (fora de outros campos e janelas). */
export function useAtalhoDeBusca<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      const alvo = e.target as HTMLElement;
      if (alvo.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return;
      e.preventDefault();
      ref.current?.focus();
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, []);
  return ref;
}
