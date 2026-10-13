import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { EstoqueProvider } from '../contexts/EstoqueContext';
import { Carregando } from './ui';

export function RotaProtegida() {
  const { sessao, carregando } = useAuth();
  const location = useLocation();

  if (carregando) return <Carregando />;
  if (!sessao) return <Navigate to="/login" replace state={{ de: location.pathname }} />;

  return (
    <EstoqueProvider>
      <Outlet />
    </EstoqueProvider>
  );
}
