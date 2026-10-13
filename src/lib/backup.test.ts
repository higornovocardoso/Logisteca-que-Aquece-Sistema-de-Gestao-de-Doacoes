import { describe, expect, it } from 'vitest';
import { gerarDadosDeExemplo } from '../data/seed';
import { gerarBackup, lerBackup } from './backup';

describe('backup', () => {
  it('lê de volta exatamente o que exportou', () => {
    const dados = gerarDadosDeExemplo();
    expect(lerBackup(gerarBackup(dados))).toEqual(dados);
  });

  it('recusa arquivos que não são backups do sistema', () => {
    expect(() => lerBackup('não é json')).toThrow('JSON válido');
    expect(() => lerBackup(JSON.stringify({ itens: [] }))).toThrow('backup válido');
  });

  it('recusa backups que deixariam o estoque negativo', () => {
    const dados = gerarDadosDeExemplo();
    const entrada = dados.movimentacoes.find((m) => m.tipo === 'entrada')!;
    const adulterado = { ...dados, movimentacoes: [...dados.movimentacoes, { ...entrada, id: 'x', tipo: 'saida' as const, fornecedor: null, quantidade: 9999 }] };
    expect(() => lerBackup(gerarBackup(adulterado))).toThrow('negativo');
  });
});
