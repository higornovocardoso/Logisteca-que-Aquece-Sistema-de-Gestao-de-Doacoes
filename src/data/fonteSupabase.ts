import { createClient, type PostgrestError } from '@supabase/supabase-js';
import type { Item, Movimentacao } from '../lib/types';
import { ErroDeNegocio, type FonteDeDados } from './fonte';

/** Domínio usado para transformar o nome de usuário em e-mail no Supabase Auth. */
const DOMINIO_USUARIOS = 'logisticaqueaquece.local';

function paraEmail(usuario: string): string {
  const limpo = usuario.trim().toLowerCase();
  return limpo.includes('@') ? limpo : `${limpo}@${DOMINIO_USUARIOS}`;
}

function nomeDoUsuario(email: string | undefined): string {
  const nome = email?.split('@')[0] ?? 'usuário';
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}

function falhar(error: PostgrestError | null): void {
  if (!error) return;
  // Erros levantados pelo gatilho de validação de estoque (ver supabase/schema.sql)
  if (error.code === 'P0001') throw new ErroDeNegocio(error.message);
  throw new Error(error.message);
}

export function criarFonteSupabase(url: string, chaveAnon: string): FonteDeDados {
  const supabase = createClient(url, chaveAnon);

  return {
    modo: 'supabase',

    async carregar() {
      const [itens, movimentacoes] = await Promise.all([
        supabase.from('itens').select('*').order('tipo'),
        supabase.from('movimentacoes').select('*').order('data', { ascending: false }),
      ]);
      falhar(itens.error);
      falhar(movimentacoes.error);
      return {
        itens: (itens.data ?? []) as Item[],
        movimentacoes: (movimentacoes.data ?? []) as Movimentacao[],
      };
    },

    async registrarEntrada(entrada) {
      const { data: item, error } = await supabase
        .from('itens')
        .upsert(
          { tipo: entrada.tipo, tamanho: entrada.tamanho, publico: entrada.publico },
          { onConflict: 'tipo,tamanho,publico' },
        )
        .select('id')
        .single();
      falhar(error);

      const resultado = await supabase.from('movimentacoes').insert({
        item_id: item!.id,
        tipo: 'entrada',
        quantidade: entrada.quantidade,
        data: entrada.data,
        responsavel: entrada.responsavel,
        observacao: entrada.observacao || null,
      });
      falhar(resultado.error);
    },

    async registrarSaida(saida) {
      const { error } = await supabase.from('movimentacoes').insert({
        item_id: saida.item_id,
        tipo: 'saida',
        quantidade: saida.quantidade,
        data: saida.data,
        responsavel: saida.responsavel,
        observacao: saida.observacao || null,
      });
      falhar(error);
    },

    async excluirMovimentacao(id) {
      const { error } = await supabase.from('movimentacoes').delete().eq('id', id);
      falhar(error);
    },

    async sessaoAtual() {
      const { data } = await supabase.auth.getSession();
      const email = data.session?.user.email;
      return email ? { usuario: nomeDoUsuario(email) } : null;
    },

    async entrar(usuario, senha) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: paraEmail(usuario),
        password: senha,
      });
      if (error) throw new ErroDeNegocio('Usuário ou senha inválidos.');
      return { usuario: nomeDoUsuario(data.user.email) };
    },

    async sair() {
      await supabase.auth.signOut();
    },
  };
}
