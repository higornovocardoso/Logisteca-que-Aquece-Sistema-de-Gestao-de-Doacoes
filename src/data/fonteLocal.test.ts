import { beforeEach, describe, expect, it } from 'vitest';
import { calcularSaldos } from '../lib/estoque';
import { ErroDeNegocio, type FonteDeDados } from './fonte';
import { criarFonteLocal } from './fonteLocal';
import { gerarDadosDeExemplo } from './seed';

class ArmazenamentoEmMemoria implements Storage {
  private dados = new Map<string, string>();
  get length() {
    return this.dados.size;
  }
  clear() {
    this.dados.clear();
  }
  getItem(chave: string) {
    return this.dados.get(chave) ?? null;
  }
  key(indice: number) {
    return [...this.dados.keys()][indice] ?? null;
  }
  removeItem(chave: string) {
    this.dados.delete(chave);
  }
  setItem(chave: string, valor: string) {
    this.dados.set(chave, valor);
  }
}

const entrada = {
  tipo: 'Cobertor',
  tamanho: 'Único',
  publico: 'Unissex',
  quantidade: 5,
  data: '2025-07-01',
  responsavel: 'Higor',
} as const;

describe('dados de exemplo', () => {
  it('nunca deixam o estoque negativo', () => {
    const { itens, movimentacoes } = gerarDadosDeExemplo();
    expect(movimentacoes.length).toBeGreaterThan(50);
    for (const item of calcularSaldos(itens, movimentacoes)) {
      expect(item.saldo).toBeGreaterThanOrEqual(0);
    }
  });

  it('só incluem itens que receberam doações', () => {
    const { itens, movimentacoes } = gerarDadosDeExemplo();
    for (const item of calcularSaldos(itens, movimentacoes)) {
      expect(item.entradas).toBeGreaterThan(0);
    }
  });

  it('são sempre os mesmos', () => {
    expect(gerarDadosDeExemplo()).toEqual(gerarDadosDeExemplo());
  });
});

describe('fonte local (modo demonstração)', () => {
  let fonte: FonteDeDados;

  beforeEach(() => {
    fonte = criarFonteLocal(new ArmazenamentoEmMemoria());
  });

  it('autentica somente o usuário de demonstração', async () => {
    await expect(fonte.entrar('Visitante', 'errada')).rejects.toBeInstanceOf(ErroDeNegocio);
    await expect(fonte.entrar('visitante', 'Visitante')).resolves.toEqual({ usuario: 'Visitante' });
    expect(await fonte.sessaoAtual()).toEqual({ usuario: 'Visitante' });
    await fonte.sair();
    expect(await fonte.sessaoAtual()).toBeNull();
  });

  it('reaproveita o item existente ao registrar uma entrada', async () => {
    const antes = await fonte.carregar();
    await fonte.registrarEntrada(entrada);
    const depois = await fonte.carregar();
    expect(depois.itens).toHaveLength(antes.itens.length);
    expect(depois.movimentacoes).toHaveLength(antes.movimentacoes.length + 1);
  });

  it('cria um item novo para uma combinação inédita', async () => {
    const antes = await fonte.carregar();
    await fonte.registrarEntrada({ ...entrada, tipo: 'Jaqueta', tamanho: '14', publico: 'Infantil' });
    const { itens } = await fonte.carregar();
    expect(itens).toHaveLength(antes.itens.length + 1);
  });

  it('impede saída maior que o saldo', async () => {
    const { itens, movimentacoes } = await fonte.carregar();
    const item = calcularSaldos(itens, movimentacoes).find((i) => i.saldo > 0)!;
    const saida = { item_id: item.id, data: '2025-08-30', responsavel: 'Marlene' };

    await expect(fonte.registrarSaida({ ...saida, quantidade: item.saldo + 1 })).rejects.toThrow(/Estoque insuficiente/);
    await fonte.registrarSaida({ ...saida, quantidade: item.saldo });

    const atual = await fonte.carregar();
    expect(calcularSaldos(atual.itens, atual.movimentacoes).find((i) => i.id === item.id)!.saldo).toBe(0);
  });

  it('impede excluir uma entrada cujas peças já foram distribuídas', async () => {
    await fonte.registrarEntrada({ ...entrada, tipo: 'Luva', tamanho: 'P', publico: 'Feminino', quantidade: 3 });
    let dados = await fonte.carregar();
    const novaEntrada = dados.movimentacoes.at(-1)!;
    await fonte.registrarSaida({ item_id: novaEntrada.item_id, quantidade: 2, data: '2025-07-02', responsavel: 'Sandra' });

    await expect(fonte.excluirMovimentacao(novaEntrada.id)).rejects.toThrow(/estoque ficaria negativo/);

    const saida = (await fonte.carregar()).movimentacoes.at(-1)!;
    await fonte.excluirMovimentacao(saida.id);
    await fonte.excluirMovimentacao(novaEntrada.id);
    dados = await fonte.carregar();
    expect(dados.movimentacoes.some((m) => m.id === novaEntrada.id)).toBe(false);
  });

  it('restaura os dados de exemplo', async () => {
    const original = await fonte.carregar();
    await fonte.registrarEntrada(entrada);
    await fonte.restaurarDadosDeExemplo!();
    expect(await fonte.carregar()).toEqual(original);
  });
});
