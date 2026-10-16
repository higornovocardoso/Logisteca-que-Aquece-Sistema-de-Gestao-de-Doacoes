import { describe, expect, it } from 'vitest';
import { gerarDadosDeExemplo } from '../test/dadosDeExemplo';
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
    expect(() => lerBackup(gerarBackup({ ...dados, itens: [...dados.itens, dados.itens[0]] }))).toThrow('repetidos');
  });

  it('aceita as datas no formato do Supabase', () => {
    const dados = gerarDadosDeExemplo();
    const comFuso = { ...dados, itens: dados.itens.map((item) => ({ ...item, created_at: '2025-06-01T12:30:00.123456+00:00' })) };
    expect(lerBackup(gerarBackup(comFuso)).itens).toHaveLength(dados.itens.length);
  });

  it('converte backups com os tamanhos antigos, unindo os itens que viram a mesma combinação', () => {
    const momento = '2025-06-01T12:00:00.000Z';
    const antigo = {
      sistema: 'logistica-que-aquece',
      versao: 1,
      exportado_em: momento,
      itens: [
        { id: 'a', tipo: 'Casaco', tamanho: '4', genero: 'Unissex', created_at: momento },
        { id: 'b', tipo: 'Casaco', tamanho: '8', genero: 'Unissex', created_at: momento },
        { id: 'c', tipo: 'Jaqueta', tamanho: 'XG', genero: 'Masculino', created_at: momento },
      ],
      movimentacoes: [
        { id: 'm1', item_id: 'a', tipo: 'entrada', quantidade: 3, data: '2025-06-01', responsavel: 'Ana', fornecedor: 'SENAI', motivo: null, observacao: null, created_at: momento },
        { id: 'm2', item_id: 'b', tipo: 'entrada', quantidade: 2, data: '2025-06-01', responsavel: 'Ana', fornecedor: 'SENAI', motivo: null, observacao: null, created_at: momento },
        { id: 'm3', item_id: 'b', tipo: 'saida', quantidade: 4, data: '2025-06-02', responsavel: 'Bia', fornecedor: null, motivo: null, observacao: null, created_at: momento },
      ],
    };
    const { itens, movimentacoes } = lerBackup(JSON.stringify(antigo));
    expect(itens.map((i) => `${i.id}:${i.tamanho}`)).toEqual(['a:Infantil', 'c:GG']);
    expect(movimentacoes.every((m) => m.item_id === 'a')).toBe(true);
  });
});
