export const TIPOS_PECA = [
  'Casaco',
  'Jaqueta',
  'Moletom',
  'Blusa',
  'Camiseta',
  'Calça',
  'Cobertor',
  'Cachecol',
  'Touca',
  'Luva',
  'Meia',
  'Calçado',
] as const;

/** Tamanhos das roupas, do menor ao maior; "Único" fica para os acessórios, que não têm tamanho. */
export const TAMANHOS_ROUPA = ['Infantil', 'PP', 'P', 'M', 'G', 'GG'] as const;
export const TAMANHOS = [...TAMANHOS_ROUPA, 'Único'] as const;

/** Peças sem tamanho: ao escolher uma delas, o registro já preenche "Único". */
export const TIPOS_SEM_TAMANHO: readonly string[] = ['Cobertor', 'Cachecol', 'Touca', 'Luva', 'Meia'];

/** Tamanhos usados até 2025 (numeração infantil e XG), convertidos ao ler backups antigos. */
export function tamanhoAtual(tamanho: string): string {
  if (/^\d+$/.test(tamanho)) return 'Infantil';
  if (tamanho === 'XG') return 'GG';
  return tamanho;
}

export const GENEROS = ['Masculino', 'Feminino', 'Unissex'] as const;

export const MOTIVOS_DESCARTE = [
  'Rasgado ou danificado',
  'Manchado',
  'Mofo ou mau cheiro',
  'Impróprio para uso',
  'Outro',
] as const;

export const PERFIS = ['Administrador', 'Operador'] as const;

export type TipoPeca = (typeof TIPOS_PECA)[number];
export type Tamanho = (typeof TAMANHOS)[number];
export type Genero = (typeof GENEROS)[number];
export type MotivoDescarte = (typeof MOTIVOS_DESCARTE)[number];
export type Perfil = (typeof PERFIS)[number];
export type TipoMovimentacao = 'entrada' | 'saida' | 'descarte';

export interface Item {
  id: string;
  tipo: TipoPeca;
  tamanho: Tamanho;
  genero: Genero;
  created_at: string;
}

export interface Movimentacao {
  id: string;
  item_id: string;
  tipo: TipoMovimentacao;
  quantidade: number;
  /** Data da movimentação no formato yyyy-MM-dd */
  data: string;
  responsavel: string;
  /** Somente entradas: quem doou as peças */
  fornecedor: string | null;
  /** Somente descartes */
  motivo: MotivoDescarte | null;
  observacao: string | null;
  created_at: string;
}

export interface ItemComSaldo extends Item {
  entradas: number;
  saidas: number;
  descartes: number;
  saldo: number;
}

export interface MovimentacaoDetalhada extends Movimentacao {
  item: Item;
}

export interface NovaEntrada {
  tipo: TipoPeca;
  tamanho: Tamanho;
  genero: Genero;
  quantidade: number;
  data: string;
  fornecedor: string;
  responsavel: string;
  observacao?: string;
}

export interface NovaSaida {
  item_id: string;
  quantidade: number;
  data: string;
  responsavel: string;
  observacao?: string;
}

export interface NovoDescarte extends NovaSaida {
  motivo: MotivoDescarte;
}

export interface Usuario {
  id: string;
  nome: string;
  /** Nome de usuário usado no login */
  usuario: string;
  perfil: Perfil;
  ativo: boolean;
  created_at: string;
}

export interface NovoUsuario {
  nome: string;
  usuario: string;
  perfil: Perfil;
  senha: string;
}

export interface AlteracaoUsuario {
  nome?: string;
  /** Novo nome de usuário (login); só administradores alteram o de outras pessoas */
  usuario?: string;
  perfil?: Perfil;
  ativo?: boolean;
  senha?: string;
}

export type AcaoAtividade =
  | 'login'
  | 'logout'
  | 'login_bloqueado'
  | 'entrada'
  | 'saida'
  | 'descarte'
  | 'exclusao'
  | 'usuario_criado'
  | 'usuario_alterado'
  | 'usuario_removido'
  | 'backup_exportado'
  | 'backup_importado'
  | 'dados_limpos';

export interface Atividade {
  id: string;
  /** Data e hora em ISO 8601 */
  momento: string;
  usuario: string;
  acao: AcaoAtividade;
  descricao: string;
}

export const ROTULOS_MOVIMENTACAO: Record<TipoMovimentacao, string> = {
  entrada: 'Entrada',
  saida: 'Saída',
  descarte: 'Descarte',
};

export function descreverItem(item: Pick<Item, 'tipo' | 'tamanho' | 'genero'>): string {
  return `${item.tipo} ${item.genero.toLowerCase()} – tam. ${item.tamanho}`;
}
