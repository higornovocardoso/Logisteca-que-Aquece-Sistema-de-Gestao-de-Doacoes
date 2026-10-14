import { describe, expect, it } from 'vitest';
import { gerarDadosDeExemplo } from '../test/dadosDeExemplo';
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
    const filtros: FiltrosRelatorio = { ...base, inicio: '2025-07-01', fim: '2025-07-31', movimentacao: 'descarte' };
    const relatorio = montarRelatorio(filtros, itens, movimentacoes);
    const esperado = movs.filter((m) => m.tipo === 'descarte' && m.data >= '2025-07-01' && m.data <= '2025-07-31');
    expect(relatorio.linhas).toHaveLength(esperado.length);
    expect(relatorio.linhas.every((linha) => linha[1] === 'Descarte')).toBe(true);
    expect(relatorio.subtitulo).toBe('Período: 01/07/2025 a 31/07/2025');
  });

  it('resume arrecadado, distribuído e descartado por tipo de peça', () => {
    const relatorio = montarRelatorio({ ...base, tipo: 'resumo' }, itens, movimentacoes);
    const soma = (i: number) => relatorio.linhas.reduce((t, l) => t + (l[i] as number), 0);
    expect(soma(1)).toBe(somar(movs, 'entrada'));
    expect(soma(2)).toBe(somar(movs, 'saida'));
    expect(soma(3)).toBe(somar(movs, 'descarte'));
  });

  it('mostra a posição de estoque com o saldo de cada item', () => {
    const relatorio = montarRelatorio({ ...base, tipo: 'estoque' }, itens, movimentacoes);
    const saldo = relatorio.linhas.reduce((t, l) => t + (l[7] as number), 0);
    expect(saldo).toBe(somar(movs, 'entrada') - somar(movs, 'saida') - somar(movs, 'descarte'));
  });

  it('agrupa as doações por fornecedor', () => {
    const relatorio = montarRelatorio({ ...base, tipo: 'fornecedores' }, itens, movimentacoes);
    expect(relatorio.linhas[0][0]).toBe('SENAI Garopaba');
    expect(relatorio.linhas.reduce((t, l) => t + (l[2] as number), 0)).toBe(somar(movs, 'entrada'));
  });
});
