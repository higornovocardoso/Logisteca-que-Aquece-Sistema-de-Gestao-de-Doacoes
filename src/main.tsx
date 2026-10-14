import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

const raiz = createRoot(document.getElementById('root')!);
const configurado = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

if (configurado) {
  // O sistema só é carregado com o Supabase configurado: sem ele, não há onde guardar os dados
  void import('./App').then(({ App }) =>
    raiz.render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  );
} else {
  void import('./components/SemConfiguracao').then(({ SemConfiguracao }) => raiz.render(<SemConfiguracao />));
}
