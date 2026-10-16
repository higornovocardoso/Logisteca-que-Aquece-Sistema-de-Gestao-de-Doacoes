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

/** Contrato da fonte de dados do sistema (Supabase), separado da interface para facilitar os testes. */
export interface FonteDeDados {
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
  /** Cada usuário troca o próprio nome de usuário (o login), confirmando a senha atual. */
  alterarMeuUsuario(novoUsuario: string, senhaAtual: string): Promise<void>;

  listarAtividades(): Promise<Atividade[]>;
  /** Registra uma ação no histórico em nome de quem está conectado (o banco define o autor). */
  registrarAtividade(acao: AcaoAtividade, descricao: string): Promise<void>;
  /** Avisa quando a sessão termina fora do sistema (expirou ou saiu em outra aba). Devolve a função que cancela o aviso. */
  aoEncerrarSessao(acao: () => void): () => void;
}

/** Erro esperado, com mensagem própria para mostrar ao usuário. */
export class ErroDeNegocio extends Error {}
