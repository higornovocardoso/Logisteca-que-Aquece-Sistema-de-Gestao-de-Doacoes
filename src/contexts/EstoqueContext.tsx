import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fonte, type DadosEstoque } from '../data';
import { calcularSaldos, detalharMovimentacoes } from '../lib/estoque';
import type { ItemComSaldo, MovimentacaoDetalhada, NovaEntrada, NovaSaida } from '../lib/types';

interface EstoqueContextValue {
  carregando: boolean;
  erro: string | null;
  itens: ItemComSaldo[];
  movimentacoes: MovimentacaoDetalhada[];
  recarregar(): Promise<void>;
  registrarEntrada(entrada: NovaEntrada): Promise<void>;
  registrarSaida(saida: NovaSaida): Promise<void>;
  excluirMovimentacao(id: string): Promise<void>;
  restaurarDadosDeExemplo?: () => Promise<void>;
}

const EstoqueContext = createContext<EstoqueContextValue | null>(null);

export function EstoqueProvider({ children }: { children: ReactNode }) {
  const [dados, setDados] = useState<DadosEstoque>({ itens: [], movimentacoes: [] });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    try {
      setDados(await fonte.carregar());
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

  const comRecarga = useCallback(
    <A,>(operacao: (arg: A) => Promise<void>) =>
      async (arg: A) => {
        await operacao(arg);
        await recarregar();
      },
    [recarregar],
  );

  const value = useMemo<EstoqueContextValue>(() => {
    const restaurar = fonte.restaurarDadosDeExemplo?.bind(fonte);
    return {
      carregando,
      erro,
      itens: calcularSaldos(dados.itens, dados.movimentacoes),
      movimentacoes: detalharMovimentacoes(dados.itens, dados.movimentacoes),
      recarregar,
      registrarEntrada: comRecarga((entrada: NovaEntrada) => fonte.registrarEntrada(entrada)),
      registrarSaida: comRecarga((saida: NovaSaida) => fonte.registrarSaida(saida)),
      excluirMovimentacao: comRecarga((id: string) => fonte.excluirMovimentacao(id)),
      restaurarDadosDeExemplo: restaurar
        ? async () => {
            await restaurar();
            await recarregar();
          }
        : undefined,
    };
  }, [dados, carregando, erro, recarregar, comRecarga]);

  return <EstoqueContext.Provider value={value}>{children}</EstoqueContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useEstoque() {
  const ctx = useContext(EstoqueContext);
  if (!ctx) throw new Error('useEstoque deve ser usado dentro de <EstoqueProvider>');
  return ctx;
}
