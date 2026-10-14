import { MotionConfig } from 'framer-motion';
import { BrowserRouter, MemoryRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RotaDeAdministrador, RotaProtegida } from './components/RotaProtegida';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { Login } from './pages/Login';
import { Administracao, Estoque, Movimentacoes, Painel, Relatorios } from './paginas';

/** Em ambientes sem controle da URL (ex.: incorporado em outra página), a navegação fica em memória. */
const Roteador = import.meta.env.VITE_ROTEADOR === 'memoria' ? MemoryRouter : BrowserRouter;

export function App() {
  return (
    // Animações seguem a preferência do sistema por movimento reduzido
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <Roteador>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route element={<RotaProtegida />}>
                  <Route element={<Layout />}>
                    <Route index element={<Painel />} />
                    <Route path="entradas" element={<Movimentacoes key="entrada" tipo="entrada" />} />
                    <Route path="saidas" element={<Movimentacoes key="saida" tipo="saida" />} />
                    <Route path="descartes" element={<Movimentacoes key="descarte" tipo="descarte" />} />
                    <Route path="estoque" element={<Estoque />} />
                    <Route path="relatorios" element={<Relatorios />} />
                    <Route element={<RotaDeAdministrador />}>
                      <Route path="administracao" element={<Administracao />} />
                    </Route>
                  </Route>
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Roteador>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </MotionConfig>
  );
}
