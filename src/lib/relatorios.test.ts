import { describe, expect, it } from 'vitest';
import { gerarDadosDeExemplo } from '../data/seed';
import { calcularSaldos, detalharMovimentacoes, somar } from './estoque';
import { montarRelatorio, type FiltrosRelatorio } from './relatorios';

const { itens: brutos, movimentacoes: movs } = gerarDadosDeExemplo();
const itens = calcularSaldos(brutos, movs);
const movimentacoes = detalharMovimentacoes(brutos, movs);
const base: FiltrosRelatorio = { tipo: 'movimentacoes', inicio: '', fim: '', movimentacao: 'todas' };

describe('montarRelatorio', () => {
  it('lista todas as movimentações em ordem cronológica', () => {
    const relatorio = montarRelatorio(base, itens, movimentacoes);
    expect(relatorio.linhas).toHaveLength(movs.length);
    expect(relatorio.subtitulo).toBe('Período: toda a campanha');
  });

  it('filtra por período e por tipo de movimentação', () => {
    const filtros: FiltrosRelatorio = { ...base, inicio: '2025-07-01', fim: '2025-07-31', movimentacao: 'saida' };
    const relatorio = montarRelatorio(filtros, itens, movimentacoes);
    const esperado = movs.filter((m) => m.tipo === 'saida' && m.data >= '2025-07-01' && m.data <= '2025-07-31');
    expect(relatorio.linhas).toHaveLength(esperado.length);
    expect(relatorio.linhas.every((linha) => linha[1] === 'Saída')).toBe(true);
    expect(relatorio.subtitulo).toBe('Período: 01/07/2025 a 31/07/2025');
  });

  it('resume arrecadação e distribuição por tipo de peça', () => {
    const relatorio = montarRelatorio({ ...base, tipo: 'resumo' }, itens, movimentacoes);
    const arrecadadas = relatorio.linhas.reduce((t, linha) => t + (linha[1] as number), 0);
    const distribuidas = relatorio.linhas.reduce((t, linha) => t + (linha[2] as number), 0);
    expect(arrecadadas).toBe(somar(movs, 'entrada'));
    expect(distribuidas).toBe(somar(movs, 'saida'));
  });

  it('mostra o estoque atual com o saldo de cada item', () => {
    const relatorio = montarRelatorio({ ...base, tipo: 'estoque' }, itens, movimentacoes);
    const saldo = relatorio.linhas.reduce((t, linha) => t + (linha[5] as number), 0);
    expect(saldo).toBe(somar(movs, 'entrada') - somar(movs, 'saida'));
  });
});
