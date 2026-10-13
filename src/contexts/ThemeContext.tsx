import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type Tema = 'claro' | 'escuro';

interface ThemeContextValue {
  tema: Tema;
  alternarTema(): void;
}

const CHAVE_TEMA = 'logistica-que-aquece:tema';
const ThemeContext = createContext<ThemeContextValue | null>(null);

function temaInicial(): Tema {
  // Um tema definido pela página que incorpora o sistema tem prioridade
  const definido = document.documentElement.dataset.theme;
  if (definido === 'dark') return 'escuro';
  if (definido === 'light') return 'claro';
  try {
    const salvo = localStorage.getItem(CHAVE_TEMA);
    if (salvo === 'claro' || salvo === 'escuro') return salvo;
  } catch {
    // sem acesso ao armazenamento: segue a preferência do sistema
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(temaInicial);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', tema === 'escuro');
    try {
      localStorage.setItem(CHAVE_TEMA, tema);
    } catch {
      // preferência não persistida
    }
  }, [tema]);

  const alternarTema = useCallback(() => setTema((t) => (t === 'claro' ? 'escuro' : 'claro')), []);
  const value = useMemo(() => ({ tema, alternarTema }), [tema, alternarTema]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme deve ser usado dentro de <ThemeProvider>');
  return ctx;
}
