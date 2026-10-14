import { createClient, FunctionsHttpError, type PostgrestError } from '@supabase/supabase-js';
import type { Atividade, Item, Movimentacao, Usuario } from '../lib/types';
import { ErroDeNegocio, type FonteDeDados, type Sessao } from './fonte';

/** Domínio usado para transformar o nome de usuário em e-mail no Supabase Auth. */
const DOMINIO_USUARIOS = 'logisticaqueaquece.local';

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

  /** Operações que exigem a chave de serviço rodam na Edge Function (supabase/functions/gerenciar-usuarios). */
  const gerenciarUsuarios = async (corpo: Record<string, unknown>) => {
    const { error } = await supabase.functions.invoke('gerenciar-usuarios', { body: corpo });
    if (!error) return;
    if (error instanceof FunctionsHttpError) {
      const resposta = (await error.context.json().catch(() => null)) as { erro?: string } | null;
      throw new ErroDeNegocio(resposta?.erro ?? 'Não foi possível concluir a operação.');
    }
    throw new Error(error.message);
  };

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

    async criarUsuario(novo) {
      await gerenciarUsuarios({ acao: 'criar', ...novo });
    },

    async alterarUsuario(id, { senha, ...alteracao }) {
      if (Object.keys(alteracao).length > 0) {
        const { error } = await supabase.from('perfis').update(alteracao).eq('id', id);
        falhar(error);
      }
      if (senha) await gerenciarUsuarios({ acao: 'redefinir_senha', id, senha });
    },

    async removerUsuario(id) {
      await gerenciarUsuarios({ acao: 'remover', id });
    },

    async atualizarMeuPerfil(nome) {
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new ErroDeNegocio('Sua sessão expirou. Entre novamente.');
      // A política de acesso e o gatilho proteger_campos_do_perfil limitam a alteração ao próprio nome
      const { error } = await supabase.from('perfis').update({ nome }).eq('id', data.user.id);
      falhar(error);
    },

    async trocarMinhaSenha(senhaAtual, novaSenha) {
      const { data } = await supabase.auth.getUser();
      if (!data.user?.email) throw new ErroDeNegocio('Sua sessão expirou. Entre novamente.');
      const conferencia = await supabase.auth.signInWithPassword({ email: data.user.email, password: senhaAtual });
      if (conferencia.error) throw new ErroDeNegocio('A senha atual está incorreta.');
      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error?.code === 'same_password') throw new ErroDeNegocio('A nova senha deve ser diferente da atual.');
      if (error) throw new ErroDeNegocio(`Não foi possível trocar a senha: ${error.message}`);
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
