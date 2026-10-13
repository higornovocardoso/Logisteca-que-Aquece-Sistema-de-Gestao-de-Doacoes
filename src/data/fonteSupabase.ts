import { createClient, type PostgrestError } from '@supabase/supabase-js';
import type { Atividade, Item, Movimentacao, Usuario } from '../lib/types';
import { ErroDeNegocio, type FonteDeDados, type Sessao } from './fonte';

/** Domínio usado para transformar o nome de usuário em e-mail no Supabase Auth. */
const DOMINIO_USUARIOS = 'logisticaqueaquece.local';
const COMO_CRIAR_USUARIOS =
  'Com o Supabase, crie usuários no painel em Authentication › Users, usando o e-mail nome@logisticaqueaquece.local. O perfil é criado automaticamente.';

function paraEmail(usuario: string): string {
  const limpo = usuario.trim().toLowerCase();
  return limpo.includes('@') ? limpo : `${limpo}@${DOMINIO_USUARIOS}`;
}

function falhar(error: PostgrestError | null): void {
  if (!error) return;
  // P0001: erros de regra levantados pelos gatilhos do banco (ver supabase/schema.sql)
  if (error.code === 'P0001') throw new ErroDeNegocio(error.message);
  if (error.code === '42501') throw new ErroDeNegocio('Você não tem permissão para fazer isso.');
  throw new Error(error.message);
}

export function criarFonteSupabase(url: string, chaveAnon: string): FonteDeDados {
  const supabase = createClient(url, chaveAnon);

  const sessaoAtual = async (): Promise<Sessao | null> => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    const { data: perfil } = await supabase.from('perfis').select('*').eq('id', data.user.id).single();
    if (!perfil?.ativo) return null;
    return { id: perfil.id, nome: perfil.nome, usuario: perfil.usuario, perfil: perfil.perfil };
  };

  const inserirRetirada = async (tipo: 'saida' | 'descarte', dados: Record<string, unknown>) => {
    const { error } = await supabase.from('movimentacoes').insert({ ...dados, tipo, observacao: dados.observacao || null });
    falhar(error);
  };

  return {
    modo: 'supabase',

    async carregar() {
      const [itens, movimentacoes] = await Promise.all([
        supabase.from('itens').select('*').order('tipo'),
        supabase.from('movimentacoes').select('*').order('data', { ascending: false }),
      ]);
      falhar(itens.error);
      falhar(movimentacoes.error);
      return { itens: (itens.data ?? []) as Item[], movimentacoes: (movimentacoes.data ?? []) as Movimentacao[] };
    },

    async registrarEntrada(entrada) {
      const { data: item, error } = await supabase
        .from('itens')
        .upsert({ tipo: entrada.tipo, tamanho: entrada.tamanho, genero: entrada.genero }, { onConflict: 'tipo,tamanho,genero' })
        .select('id')
        .single();
      falhar(error);
      const resultado = await supabase.from('movimentacoes').insert({
        item_id: item!.id,
        tipo: 'entrada',
        quantidade: entrada.quantidade,
        data: entrada.data,
        fornecedor: entrada.fornecedor,
        responsavel: entrada.responsavel,
        observacao: entrada.observacao || null,
      });
      falhar(resultado.error);
    },

    registrarSaida: (saida) => inserirRetirada('saida', { ...saida }),
    registrarDescarte: (descarte) => inserirRetirada('descarte', { ...descarte }),

    async excluirMovimentacao(id) {
      const { error } = await supabase.from('movimentacoes').delete().eq('id', id);
      falhar(error);
    },

    async limparDados() {
      falhar((await supabase.from('movimentacoes').delete().not('id', 'is', null)).error);
      falhar((await supabase.from('itens').delete().not('id', 'is', null)).error);
    },

    async importarDados(dados) {
      await this.limparDados();
      // Os ids do backup podem não ser UUIDs (ex.: backups do modo demonstração): gera novos e remapeia.
      const novosIds = new Map(dados.itens.map((item) => [item.id, crypto.randomUUID()]));
      falhar(
        (
          await supabase.from('itens').insert(
            dados.itens.map(({ id, tipo, tamanho, genero, created_at }) => ({ id: novosIds.get(id), tipo, tamanho, genero, created_at })),
          )
        ).error,
      );
      // Entradas primeiro, para o gatilho de estoque aceitar as saídas e descartes
      const ordenadas = [...dados.movimentacoes].sort((a, b) => (a.tipo === 'entrada' ? 0 : 1) - (b.tipo === 'entrada' ? 0 : 1));
      falhar(
        (
          await supabase.from('movimentacoes').insert(
            ordenadas.map(({ id: _id, item_id, ...mov }) => ({ ...mov, item_id: novosIds.get(item_id) })),
          )
        ).error,
      );
    },

    sessaoAtual,

    async entrar(usuario, senha) {
      const { error } = await supabase.auth.signInWithPassword({ email: paraEmail(usuario), password: senha });
      if (error) throw new ErroDeNegocio('Usuário ou senha incorretos.');
      const sessao = await sessaoAtual();
      if (!sessao) {
        await supabase.auth.signOut();
        throw new ErroDeNegocio('Este usuário está desativado. Fale com um administrador.');
      }
      return sessao;
    },

    async sair() {
      await supabase.auth.signOut();
    },

    async listarUsuarios() {
      const { data, error } = await supabase.from('perfis').select('*').order('nome');
      falhar(error);
      return (data ?? []) as Usuario[];
    },

    async criarUsuario() {
      throw new ErroDeNegocio(COMO_CRIAR_USUARIOS);
    },

    async alterarUsuario(id, { senha, ...alteracao }) {
      if (senha) throw new ErroDeNegocio('Com o Supabase, redefina senhas pelo painel em Authentication › Users.');
      const { error } = await supabase.from('perfis').update(alteracao).eq('id', id);
      falhar(error);
    },

    async removerUsuario() {
      throw new ErroDeNegocio('Com o Supabase, remova usuários pelo painel em Authentication › Users, ou desative o usuário aqui.');
    },

    async listarAtividades() {
      const { data, error } = await supabase.from('atividades').select('*').order('momento', { ascending: false }).limit(2000);
      falhar(error);
      return (data ?? []) as Atividade[];
    },

    async registrarAtividade(acao, descricao, usuario) {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return; // tentativas sem login não são gravadas no banco
      const { error } = await supabase.from('atividades').insert({ acao, descricao, usuario: usuario ?? undefined });
      falhar(error);
    },
  };
}
