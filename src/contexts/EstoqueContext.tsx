import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { servico, type DadosEstoque } from '../data';
import { calcularSaldos, detalharMovimentacoes } from '../lib/estoque';
import type { ItemComSaldo, MovimentacaoDetalhada, NovaEntrada, NovaSaida, NovoDescarte } from '../lib/types';

interface EstoqueContextValue {
  carregando: boolean;
  erro: string | null;
  dados: DadosEstoque;
  itens: ItemComSaldo[];
  movimentacoes: MovimentacaoDetalhada[];
  recarregar(): Promise<void>;
  registrarEntrada(entrada: NovaEntrada): Promise<void>;
  registrarSaida(saida: NovaSaida): Promise<void>;
  registrarDescarte(descarte: NovoDescarte): Promise<void>;
  excluirMovimentacao(id: string): Promise<void>;
  limparDados(): Promise<void>;
  importarDados(dados: DadosEstoque): Promise<void>;
  restaurarDadosDeExemplo(): Promise<void>;
}

const EstoqueContext = createContext<EstoqueContextValue | null>(null);

export function EstoqueProvider({ children }: { children: ReactNode }) {
  const [dados, setDados] = useState<DadosEstoque>({ itens: [], movimentacoes: [] });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    try {
      setDados(await servico.carregar());
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar os dados.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const value = useMemo<EstoqueContextValue>(() => {
    const comRecarga =
      <A,>(operacao: (arg: A) => Promise<void>) =>
      async (arg: A) => {
        await operacao(arg);
        await recarregar();
      };
    return {
      carregando,
      erro,
      dados,
      itens: calcularSaldos(dados.itens, dados.movimentacoes),
      movimentacoes: detalharMovimentacoes(dados.itens, dados.movimentacoes),
      recarregar,
      registrarEntrada: comRecarga((entrada: NovaEntrada) => servico.registrarEntrada(entrada)),
      registrarSaida: comRecarga((saida: NovaSaida) => servico.registrarSaida(saida)),
      registrarDescarte: comRecarga((descarte: NovoDescarte) => servico.registrarDescarte(descarte)),
      excluirMovimentacao: comRecarga((id: string) => servico.excluirMovimentacao(id)),
      limparDados: async () => {
        await servico.limparDados();
        await recarregar();
      },
      importarDados: comRecarga((novos: DadosEstoque) => servico.importarDados(novos)),
      restaurarDadosDeExemplo: async () => {
        await servico.restaurarDadosDeExemplo?.();
        await recarregar();
      },
    };
  }, [dados, carregando, erro, recarregar]);

  return <EstoqueContext.Provider value={value}>{children}</EstoqueContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useEstoque() {
  const ctx = useContext(EstoqueContext);
  if (!ctx) throw new Error('useEstoque deve ser usado dentro de <EstoqueProvider>');
  return ctx;
}
