import type {
  AcaoAtividade,
  AlteracaoUsuario,
  Atividade,
  Item,
  Movimentacao,
  NovaEntrada,
  NovaSaida,
  NovoDescarte,
  NovoUsuario,
  Perfil,
  Usuario,
} from '../lib/types';

export interface DadosEstoque {
  itens: Item[];
  movimentacoes: Movimentacao[];
}

export interface Sessao {
  id: string;
  nome: string;
  usuario: string;
  perfil: Perfil;
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
  registrarDescarte(descarte: NovoDescarte): Promise<void>;
  excluirMovimentacao(id: string): Promise<void>;
  /** Apaga todos os itens e movimentações (somente administradores). */
  limparDados(): Promise<void>;
  /** Substitui itens e movimentações pelos de um backup (somente administradores). */
  importarDados(dados: DadosEstoque): Promise<void>;

  sessaoAtual(): Promise<Sessao | null>;
  entrar(usuario: string, senha: string): Promise<Sessao>;
  sair(): Promise<void>;

  listarUsuarios(): Promise<Usuario[]>;
  criarUsuario(usuario: NovoUsuario): Promise<void>;
  alterarUsuario(id: string, alteracao: AlteracaoUsuario): Promise<void>;
  removerUsuario(id: string): Promise<void>;

  /** Cada usuário altera o próprio nome, qualquer que seja o perfil. */
  atualizarMeuPerfil(nome: string): Promise<void>;
  /** Cada usuário troca a própria senha, confirmando a senha atual. */
  trocarMinhaSenha(senhaAtual: string, novaSenha: string): Promise<void>;

  listarAtividades(): Promise<Atividade[]>;
  /** Registra uma ação no histórico; sem `usuario`, usa quem está conectado. */
  registrarAtividade(acao: AcaoAtividade, descricao: string, usuario?: string): Promise<void>;

  /** Só existe no modo demonstração: descarta as alterações e volta aos dados de exemplo. */
  restaurarDadosDeExemplo?(): Promise<void>;
}

/** Erro esperado, com mensagem própria para mostrar ao usuário. */
export class ErroDeNegocio extends Error {}
