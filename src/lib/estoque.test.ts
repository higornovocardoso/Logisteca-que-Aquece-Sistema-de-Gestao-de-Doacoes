import { describe, expect, it } from 'vitest';
import { calcularSaldos, detalharMovimentacoes, saldoDoItem, somar } from './estoque';
import type { Item, Movimentacao } from './types';

const casaco: Item = { id: 'a', tipo: 'Casaco', tamanho: 'M', genero: 'Feminino', created_at: '2025-06-01T10:00:00Z' };
const meia: Item = { id: 'b', tipo: 'Meia', tamanho: 'Único', genero: 'Unissex', created_at: '2025-06-01T10:00:00Z' };

function mov(id: string, item_id: string, tipo: Movimentacao['tipo'], quantidade: number, data: string): Movimentacao {
  return {
    id,
    item_id,
    tipo,
    quantidade,
    data,
    responsavel: 'Teste',
    fornecedor: tipo === 'entrada' ? 'SENAI' : null,
    motivo: tipo === 'descarte' ? 'Manchado' : null,
    observacao: null,
    created_at: `${data}T10:00:00Z`,
  };
}

const movimentacoes = [
  mov('1', 'a', 'entrada', 10, '2025-06-02'),
  mov('2', 'a', 'saida', 4, '2025-06-10'),
  mov('3', 'b', 'entrada', 20, '2025-06-03'),
  mov('4', 'a', 'entrada', 2, '2025-06-12'),
  mov('5', 'a', 'descarte', 1, '2025-06-13'),
];

describe('calcularSaldos', () => {
  it('subtrai saídas e descartes das entradas', () => {
    const [a, b] = calcularSaldos([casaco, meia], movimentacoes);
    expect(a).toMatchObject({ entradas: 12, saidas: 4, descartes: 1, saldo: 7 });
    expect(b).toMatchObject({ entradas: 20, saidas: 0, descartes: 0, saldo: 20 });
  });

  it('considera saldo zero para itens sem movimentação', () => {
    expect(calcularSaldos([casaco], [])[0]).toMatchObject({ entradas: 0, saldo: 0 });
  });
});

describe('saldoDoItem', () => {
  it('calcula o saldo de um único item', () => {
    expect(saldoDoItem('a', movimentacoes)).toBe(7);
    expect(saldoDoItem('inexistente', movimentacoes)).toBe(0);
  });
});

describe('detalharMovimentacoes', () => {
  it('junta o item e ordena da mais recente para a mais antiga', () => {
    const detalhadas = detalharMovimentacoes([casaco, meia], movimentacoes);
    expect(detalhadas.map((m) => m.id)).toEqual(['5', '4', '2', '3', '1']);
    expect(detalhadas[0].item).toBe(casaco);
  });

  it('descarta movimentações de itens que não existem', () => {
    expect(detalharMovimentacoes([meia], movimentacoes).map((m) => m.id)).toEqual(['3']);
  });
});

describe('somar', () => {
  it('soma as quantidades por tipo de movimentação', () => {
    expect(somar(movimentacoes, 'entrada')).toBe(32);
    expect(somar(movimentacoes, 'saida')).toBe(4);
    expect(somar(movimentacoes, 'descarte')).toBe(1);
  });
});
