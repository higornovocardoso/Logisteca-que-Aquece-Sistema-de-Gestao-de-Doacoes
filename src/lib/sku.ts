import type { Item } from './types';

const ABREVIACOES: Record<Item['tipo'], string> = {
  Casaco: 'CAS',
  Jaqueta: 'JAQ',
  Moletom: 'MOL',
  Blusa: 'BLU',
  Camiseta: 'CAM',
  Calça: 'CAL',
  Cobertor: 'COB',
  Cachecol: 'CCH',
  Touca: 'TOU',
  Luva: 'LUV',
  Meia: 'MEI',
  Calçado: 'CLD',
};

/** Código do item no formato TIPO-GÊNERO-TAMANHO, ex.: CAS-F-M (casaco feminino M). */
export function codigoDoItem(item: Pick<Item, 'tipo' | 'genero' | 'tamanho'>): string {
  const tamanho = item.tamanho === 'Único' ? 'UN' : /^\d+$/.test(item.tamanho) ? item.tamanho.padStart(2, '0') : item.tamanho;
  return `${ABREVIACOES[item.tipo]}-${item.genero.charAt(0)}-${tamanho}`;
}
