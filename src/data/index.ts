import { criarFonteLocal } from './fonteLocal';
import { criarFonteSupabase } from './fonteSupabase';
import { criarServico } from './servico';

const url = import.meta.env.VITE_SUPABASE_URL;
const chaveAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Com as variáveis do Supabase configuradas, o sistema usa o banco de dados.
 * Sem elas, entra no modo demonstração, com dados de exemplo salvos no navegador.
 */
export const servico = criarServico(url && chaveAnon ? criarFonteSupabase(url, chaveAnon) : criarFonteLocal());

export { ErroDeNegocio } from './fonte';
export type { DadosEstoque, Sessao } from './fonte';
export { LoginBloqueado } from './servico';
export { CONTAS_DEMO } from './fonteLocal';
