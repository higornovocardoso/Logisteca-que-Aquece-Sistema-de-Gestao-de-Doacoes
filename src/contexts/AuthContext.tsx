import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { servico, type Sessao } from '../data';

interface AuthContextValue {
  sessao: Sessao | null;
  carregando: boolean;
  ehAdministrador: boolean;
  entrar(usuario: string, senha: string): Promise<void>;
  sair(): Promise<void>;
  atualizarSessao(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [carregando, setCarregando] = useState(true);

  const atualizarSessao = useCallback(async () => {
    setSessao(await servico.sessaoAtual().catch(() => null));
  }, []);

  useEffect(() => {
    void atualizarSessao().finally(() => setCarregando(false));
  }, [atualizarSessao]);

  const entrar = useCallback(async (usuario: string, senha: string) => {
    setSessao(await servico.entrar(usuario, senha));
  }, []);

  const sair = useCallback(async () => {
    await servico.sair();
    setSessao(null);
  }, []);

  const value = useMemo(
    () => ({ sessao, carregando, ehAdministrador: sessao?.perfil === 'Administrador', entrar, sair, atualizarSessao }),
    [sessao, carregando, entrar, sair, atualizarSessao],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
