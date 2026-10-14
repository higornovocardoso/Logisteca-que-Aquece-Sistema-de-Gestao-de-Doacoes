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

  it('segue as mesmas regras do banco, para a importação nunca falhar no meio', () => {
    const dados = gerarDadosDeExemplo();
    const entrada = dados.movimentacoes.find((m) => m.tipo === 'entrada')!;
    const comMovimentacao = (mov: object) => gerarBackup({ ...dados, movimentacoes: [...dados.movimentacoes, { ...entrada, id: 'novo', ...mov }] });
    expect(() => lerBackup(comMovimentacao({ fornecedor: null }))).toThrow('backup válido');
    expect(() => lerBackup(comMovimentacao({ responsavel: 'x'.repeat(81) }))).toThrow('backup válido');
    expect(() => lerBackup(comMovimentacao({ quantidade: 10001 }))).toThrow('backup válido');
    expect(() => lerBackup(comMovimentacao({ created_at: 'ontem' }))).toThrow('backup válido');
    expect(() => lerBackup(comMovimentacao({ id: entrada.id }))).toThrow('repetidas');
    expect(() => lerBackup(gerarBackup({ ...dados, itens: [...dados.itens, { ...dados.itens[0], id: 'outro' }] }))).toThrow('repetidos');
  });

  it('aceita as datas no formato do Supabase', () => {
    const dados = gerarDadosDeExemplo();
    const comFuso = { ...dados, itens: dados.itens.map((item) => ({ ...item, created_at: '2025-06-01T12:30:00.123456+00:00' })) };
    expect(lerBackup(gerarBackup(comFuso)).itens).toHaveLength(dados.itens.length);
  });
});
