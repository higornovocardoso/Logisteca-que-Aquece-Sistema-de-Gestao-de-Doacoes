import { addWeeks, differenceInCalendarWeeks, format, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ItemComSaldo, Movimentacao } from './types';

/** Lacunas de até 8 semanas sem movimentação aparecem como zero; lacunas maiores são omitidas. */
const MAIOR_LACUNA_PREENCHIDA = 8;

export interface Semana {
  inicio: Date;
  rotulo: string;
  entradas: number;
  saidas: number;
  descartes: number;
  /** Peças em estoque ao fim da semana */
  saldo: number;
}

export function seriePorSemana(movimentacoes: Movimentacao[]): Semana[] {
  const semanas = new Map<number, { entradas: number; saidas: number; descartes: number }>();
  for (const mov of movimentacoes) {
    const chave = startOfWeek(new Date(`${mov.data}T12:00:00`), { locale: ptBR }).getTime();
    const total = semanas.get(chave) ?? { entradas: 0, saidas: 0, descartes: 0 };
    if (mov.tipo === 'entrada') total.entradas += mov.quantidade;
    else if (mov.tipo === 'saida') total.saidas += mov.quantidade;
    else total.descartes += mov.quantidade;
    semanas.set(chave, total);
  }

  const ordenadas = [...semanas.keys()].sort((a, b) => a - b);
  const serie: Array<Omit<Semana, 'rotulo' | 'saldo'>> = [];
  ordenadas.forEach((chave, i) => {
    const inicio = new Date(chave);
    if (i > 0) {
      const anterior = new Date(ordenadas[i - 1]);
      const lacuna = differenceInCalendarWeeks(inicio, anterior, { locale: ptBR });
      if (lacuna <= MAIOR_LACUNA_PREENCHIDA) {
        for (let k = 1; k < lacuna; k++) serie.push({ inicio: addWeeks(anterior, k), entradas: 0, saidas: 0, descartes: 0 });
      }
    }
    serie.push({ inicio, ...semanas.get(chave)! });
  });

  const variosAnos = serie.length > 0 && serie[0].inicio.getFullYear() !== serie.at(-1)!.inicio.getFullYear();
  let saldo = 0;
  return serie.map((s) => {
    saldo += s.entradas - s.saidas - s.descartes;
    return { ...s, saldo, rotulo: format(s.inicio, variosAnos ? 'dd/MM/yy' : 'dd/MM') };
  });
}

export interface Distribuicao {
  rotulo: string;
  distribuido: number;
  estoque: number;
  descartado: number;
  total: number;
}

/** Agrupa os itens (ex.: por tipo ou gênero) somando o destino das peças arrecadadas. */
export function distribuirPor(itens: ItemComSaldo[], chave: (item: ItemComSaldo) => string, ordem?: readonly string[]): Distribuicao[] {
  const grupos = new Map<string, Distribuicao>();
  for (const item of itens) {
    const rotulo = chave(item);
    const grupo = grupos.get(rotulo) ?? { rotulo, distribuido: 0, estoque: 0, descartado: 0, total: 0 };
    grupo.distribuido += item.saidas;
    grupo.estoque += item.saldo;
    grupo.descartado += item.descartes;
    grupo.total += item.entradas;
    grupos.set(rotulo, grupo);
  }
  const lista = [...grupos.values()].filter((g) => g.total > 0);
  return ordem ? lista.sort((a, b) => ordem.indexOf(a.rotulo) - ordem.indexOf(b.rotulo)) : lista.sort((a, b) => b.total - a.total);
}
