import type { Item, ItemComSaldo, Movimentacao, MovimentacaoDetalhada } from './types';

/** Calcula entradas, saídas e saldo de cada item a partir das movimentações. */
export function calcularSaldos(itens: Item[], movimentacoes: Movimentacao[]): ItemComSaldo[] {
  const totais = new Map<string, { entradas: number; saidas: number }>();

  for (const mov of movimentacoes) {
    const total = totais.get(mov.item_id) ?? { entradas: 0, saidas: 0 };
    if (mov.tipo === 'entrada') total.entradas += mov.quantidade;
    else total.saidas += mov.quantidade;
    totais.set(mov.item_id, total);
  }

  return itens.map((item) => {
    const { entradas, saidas } = totais.get(item.id) ?? { entradas: 0, saidas: 0 };
    return { ...item, entradas, saidas, saldo: entradas - saidas };
  });
}

export function saldoDoItem(itemId: string, movimentacoes: Movimentacao[]): number {
  return movimentacoes.reduce((saldo, mov) => {
    if (mov.item_id !== itemId) return saldo;
    return mov.tipo === 'entrada' ? saldo + mov.quantidade : saldo - mov.quantidade;
  }, 0);
}

/** Junta cada movimentação ao seu item, da mais recente para a mais antiga. */
export function detalharMovimentacoes(
  itens: Item[],
  movimentacoes: Movimentacao[],
): MovimentacaoDetalhada[] {
  const porId = new Map(itens.map((item) => [item.id, item]));
  return movimentacoes
    .flatMap((mov) => {
      const item = porId.get(mov.item_id);
      return item ? [{ ...mov, item }] : [];
    })
    .sort((a, b) => b.data.localeCompare(a.data) || b.created_at.localeCompare(a.created_at));
}

export function somar(movimentacoes: Movimentacao[], tipo: Movimentacao['tipo']): number {
  return movimentacoes.reduce((total, mov) => (mov.tipo === tipo ? total + mov.quantidade : total), 0);
}
