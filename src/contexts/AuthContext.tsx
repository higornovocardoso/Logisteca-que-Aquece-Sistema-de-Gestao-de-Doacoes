import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fonte, type Sessao } from '../data';

interface AuthContextValue {
  sessao: Sessao | null;
  carregando: boolean;
  entrar(usuario: string, senha: string): Promise<void>;
  sair(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    fonte
      .sessaoAtual()
      .then(setSessao)
      .catch(() => setSessao(null))
      .finally(() => setCarregando(false));
  }, []);

  const entrar = useCallback(async (usuario: string, senha: string) => {
    setSessao(await fonte.entrar(usuario, senha));
  }, []);

  const sair = useCallback(async () => {
    await fonte.sair();
    setSessao(null);
  }, []);

  const value = useMemo(() => ({ sessao, carregando, entrar, sair }), [sessao, carregando, entrar, sair]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
