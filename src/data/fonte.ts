import type { Item, Movimentacao, NovaEntrada, NovaSaida } from '../lib/types';

export interface DadosEstoque {
  itens: Item[];
  movimentacoes: Movimentacao[];
}

export interface Sessao {
  usuario: string;
}

/**
 * Contrato comum às duas fontes de dados do sistema:
 * Supabase (produção) e armazenamento local do navegador (modo demonstração).
 */
export interface FonteDeDados {
  readonly modo: 'supabase' | 'demo';
  carregar(): Promise<DadosEstoque>;
  registrarEntrada(entrada: NovaEntrada): Promise<void>;
  registrarSaida(saida: NovaSaida): Promise<void>;
  excluirMovimentacao(id: string): Promise<void>;
  sessaoAtual(): Promise<Sessao | null>;
  entrar(usuario: string, senha: string): Promise<Sessao>;
  sair(): Promise<void>;
  /** Só existe no modo demonstração: descarta as alterações e volta aos dados de exemplo. */
  restaurarDadosDeExemplo?(): Promise<void>;
}

export class ErroDeNegocio extends Error {}
