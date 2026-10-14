import { criarFonteSupabase } from './fonteSupabase';
import { criarServico } from './servico';

// main.tsx só carrega o sistema quando as duas variáveis estão definidas
export const servico = criarServico(criarFonteSupabase(import.meta.env.VITE_SUPABASE_URL!, import.meta.env.VITE_SUPABASE_ANON_KEY!));

export { ErroDeNegocio } from './fonte';
export type { DadosEstoque, Sessao } from './fonte';
export { LoginBloqueado } from './servico';
