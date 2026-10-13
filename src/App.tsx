import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RotaProtegida } from './components/RotaProtegida';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import './lib/graficos';
import { Dashboard } from './pages/Dashboard';
import { Entradas } from './pages/Entradas';
import { Estoque } from './pages/Estoque';
import { Login } from './pages/Login';
import { Relatorios } from './pages/Relatorios';
import { Saidas } from './pages/Saidas';

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<RotaProtegida />}>
                <Route element={<Layout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="entradas" element={<Entradas />} />
                  <Route path="saidas" element={<Saidas />} />
                  <Route path="estoque" element={<Estoque />} />
                  <Route path="relatorios" element={<Relatorios />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
