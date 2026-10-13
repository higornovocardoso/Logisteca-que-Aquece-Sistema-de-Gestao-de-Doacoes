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

export const TAMANHOS = [
  'PP', 'P', 'M', 'G', 'GG', 'XG',
  '2', '4', '6', '8', '10', '12', '14',
  'Único',
] as const;

export const PUBLICOS = ['Masculino', 'Feminino', 'Unissex', 'Infantil'] as const;

export type TipoPeca = (typeof TIPOS_PECA)[number];
export type Tamanho = (typeof TAMANHOS)[number];
export type Publico = (typeof PUBLICOS)[number];
export type TipoMovimentacao = 'entrada' | 'saida';

export interface Item {
  id: string;
  tipo: TipoPeca;
  tamanho: Tamanho;
  publico: Publico;
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
  observacao: string | null;
  created_at: string;
}

export interface ItemComSaldo extends Item {
  entradas: number;
  saidas: number;
  saldo: number;
}

export interface MovimentacaoDetalhada extends Movimentacao {
  item: Item;
}

export interface NovaEntrada {
  tipo: TipoPeca;
  tamanho: Tamanho;
  publico: Publico;
  quantidade: number;
  data: string;
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

export function descreverItem(item: Pick<Item, 'tipo' | 'tamanho' | 'publico'>): string {
  return `${item.tipo} ${item.publico.toLowerCase()} – tam. ${item.tamanho}`;
}
