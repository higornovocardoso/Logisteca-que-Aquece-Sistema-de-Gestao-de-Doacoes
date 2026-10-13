import { saldoDoItem } from '../lib/estoque';
import { descreverItem, type Item, type Movimentacao } from '../lib/types';
import { ErroDeNegocio, type DadosEstoque, type FonteDeDados, type Sessao } from './fonte';
import { gerarDadosDeExemplo } from './seed';

const CHAVE_DADOS = 'logistica-que-aquece:dados:v1';
const CHAVE_SESSAO = 'logistica-que-aquece:sessao';

export const USUARIO_DEMO = 'Visitante';
export const SENHA_DEMO = 'Visitante';

/** Armazenamento que pode falhar (aba anônima, cota cheia); nesse caso os dados ficam só na memória. */
function criarArmazenamento(armazenamento: Storage | undefined) {
  const memoria = new Map<string, string>();
  return {
    ler(chave: string): string | null {
      try {
        return armazenamento?.getItem(chave) ?? memoria.get(chave) ?? null;
      } catch {
        return memoria.get(chave) ?? null;
      }
    },
    gravar(chave: string, valor: string) {
      memoria.set(chave, valor);
      try {
        armazenamento?.setItem(chave, valor);
      } catch {
        // mantém apenas em memória
      }
    },
    remover(chave: string) {
      memoria.delete(chave);
      try {
        armazenamento?.removeItem(chave);
      } catch {
        // nada a fazer
      }
    },
  };
}

function novoId(prefixo: string): string {
  const aleatorio =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefixo}-${aleatorio}`;
}

export function criarFonteLocal(
  armazenamento: Storage | undefined = typeof window !== 'undefined' ? window.localStorage : undefined,
): FonteDeDados {
  const store = criarArmazenamento(armazenamento);

  const ler = (): DadosEstoque => {
    const bruto = store.ler(CHAVE_DADOS);
    if (bruto) {
      try {
        return JSON.parse(bruto) as DadosEstoque;
      } catch {
        // dados corrompidos: recomeça com os dados de exemplo
      }
    }
    const inicial = gerarDadosDeExemplo();
    store.gravar(CHAVE_DADOS, JSON.stringify(inicial));
    return inicial;
  };

  const gravar = (dados: DadosEstoque) => store.gravar(CHAVE_DADOS, JSON.stringify(dados));
  const agora = () => new Date().toISOString();

  return {
    modo: 'demo',

    async carregar() {
      return ler();
    },

    async registrarEntrada(entrada) {
      const dados = ler();
      let item = dados.itens.find(
        (i) => i.tipo === entrada.tipo && i.tamanho === entrada.tamanho && i.publico === entrada.publico,
      );
      if (!item) {
        item = {
          id: novoId('item'),
          tipo: entrada.tipo,
          tamanho: entrada.tamanho,
          publico: entrada.publico,
          created_at: agora(),
        } satisfies Item;
        dados.itens.push(item);
      }
      dados.movimentacoes.push({
        id: novoId('mov'),
        item_id: item.id,
        tipo: 'entrada',
        quantidade: entrada.quantidade,
        data: entrada.data,
        responsavel: entrada.responsavel,
        observacao: entrada.observacao || null,
        created_at: agora(),
      });
      gravar(dados);
    },

    async registrarSaida(saida) {
      const dados = ler();
      const item = dados.itens.find((i) => i.id === saida.item_id);
      if (!item) throw new ErroDeNegocio('Item não encontrado.');
      const saldo = saldoDoItem(item.id, dados.movimentacoes);
      if (saida.quantidade > saldo) {
        throw new ErroDeNegocio(`Estoque insuficiente: há apenas ${saldo} unidade(s) de ${descreverItem(item)}.`);
      }
      dados.movimentacoes.push({
        id: novoId('mov'),
        item_id: item.id,
        tipo: 'saida',
        quantidade: saida.quantidade,
        data: saida.data,
        responsavel: saida.responsavel,
        observacao: saida.observacao || null,
        created_at: agora(),
      });
      gravar(dados);
    },

    async excluirMovimentacao(id) {
      const dados = ler();
      const mov = dados.movimentacoes.find((m) => m.id === id);
      if (!mov) return;
      if (mov.tipo === 'entrada') {
        const saldo = saldoDoItem(mov.item_id, dados.movimentacoes);
        if (saldo - mov.quantidade < 0) {
          throw new ErroDeNegocio(
            'Não é possível excluir esta entrada: parte dessas peças já foi distribuída e o estoque ficaria negativo.',
          );
        }
      }
      dados.movimentacoes = dados.movimentacoes.filter((m: Movimentacao) => m.id !== id);
      gravar(dados);
    },

    async sessaoAtual() {
      const bruto = store.ler(CHAVE_SESSAO);
      return bruto ? (JSON.parse(bruto) as Sessao) : null;
    },

    async entrar(usuario, senha) {
      if (usuario.trim().toLowerCase() !== USUARIO_DEMO.toLowerCase() || senha !== SENHA_DEMO) {
        throw new ErroDeNegocio('Usuário ou senha inválidos.');
      }
      const sessao: Sessao = { usuario: USUARIO_DEMO };
      store.gravar(CHAVE_SESSAO, JSON.stringify(sessao));
      return sessao;
    },

    async sair() {
      store.remover(CHAVE_SESSAO);
    },

    async restaurarDadosDeExemplo() {
      store.remover(CHAVE_DADOS);
    },
  };
}

