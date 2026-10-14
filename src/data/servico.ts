import { format } from 'date-fns';
import { criarLimitadorDeTentativas, type SituacaoLogin } from '../lib/limiteTentativas';
import { descreverItem, type AcaoAtividade, type Item } from '../lib/types';
import { ErroDeNegocio, type FonteDeDados } from './fonte';

export interface Servico extends FonteDeDados {
  situacaoLogin(usuario: string): SituacaoLogin;
}

export class LoginBloqueado extends ErroDeNegocio {
  constructor(readonly liberaEm: number) {
    super(`Acesso bloqueado por excesso de tentativas. Tente novamente às ${format(liberaEm, 'HH:mm')}.`);
  }
}

/**
 * Envolve a fonte de dados para registrar cada ação no histórico de atividades
 * e limitar as tentativas de login. Falhas ao registrar o histórico nunca interrompem a operação.
 */
export function criarServico(
  fonte: FonteDeDados,
  armazenamento: Storage | undefined = typeof window !== 'undefined' ? window.localStorage : undefined,
): Servico {
  const limitador = criarLimitadorDeTentativas(armazenamento);
  let itensConhecidos = new Map<string, Item>();

  const registrar = async (acao: AcaoAtividade, descricao: string, usuario?: string) => {
    try {
      await fonte.registrarAtividade(acao, descricao, usuario);
    } catch {
      // o histórico é auxiliar; a operação principal já foi concluída
    }
  };
  const nomeDoItem = (id: string) => {
    const item = itensConhecidos.get(id);
    return item ? descreverItem(item) : 'item';
  };

  return {
    ...fonte,
    modo: fonte.modo,

    situacaoLogin: (usuario) => limitador.situacao(usuario),

    async carregar() {
      const dados = await fonte.carregar();
      itensConhecidos = new Map(dados.itens.map((item) => [item.id, item]));
      return dados;
    },

    async registrarEntrada(entrada) {
      await fonte.registrarEntrada(entrada);
      await registrar('entrada', `Registrou entrada de ${entrada.quantidade} peça(s): ${descreverItem(entrada)}, de ${entrada.fornecedor}`);
    },

    async registrarSaida(saida) {
      await fonte.registrarSaida(saida);
      await registrar('saida', `Registrou saída de ${saida.quantidade} peça(s): ${nomeDoItem(saida.item_id)}, retirada por ${saida.responsavel}`);
    },

    async registrarDescarte(descarte) {
      await fonte.registrarDescarte(descarte);
      await registrar('descarte', `Registrou descarte de ${descarte.quantidade} peça(s): ${nomeDoItem(descarte.item_id)} (${descarte.motivo})`);
    },

    async excluirMovimentacao(id) {
      await fonte.excluirMovimentacao(id);
      await registrar('exclusao', 'Excluiu um registro de movimentação');
    },

    async limparDados() {
      await fonte.limparDados();
      await registrar('dados_limpos', 'Apagou todos os itens e movimentações');
    },

    async importarDados(dados) {
      await fonte.importarDados(dados);
      await registrar(
        'backup_importado',
        `Importou um backup com ${dados.itens.length} item(ns) e ${dados.movimentacoes.length} movimentação(ões)`,
      );
    },

    async entrar(usuario, senha) {
      const antes = limitador.situacao(usuario);
      if (antes.bloqueado) throw new LoginBloqueado(antes.liberaEm!);
      try {
        const sessao = await fonte.entrar(usuario, senha);
        limitador.limpar(usuario);
        await registrar('login', 'Entrou no sistema', sessao.nome);
        return sessao;
      } catch (erro) {
        if (!(erro instanceof ErroDeNegocio)) throw erro;
        const depois = limitador.registrarFalha(usuario);
        if (depois.bloqueado) {
          await registrar('login_bloqueado', `Acesso bloqueado após ${5} tentativas incorretas`, usuario.trim());
          throw new LoginBloqueado(depois.liberaEm!);
        }
        throw new ErroDeNegocio(
          `${erro.message} ${depois.tentativasRestantes === 1 ? 'Resta 1 tentativa' : `Restam ${depois.tentativasRestantes} tentativas`} antes do bloqueio temporário.`,
        );
      }
    },

    async sair() {
      await registrar('logout', 'Saiu do sistema');
      await fonte.sair();
    },

    async criarUsuario(novo) {
      await fonte.criarUsuario(novo);
      await registrar('usuario_criado', `Criou o usuário ${novo.usuario} (${novo.perfil})`);
    },

    async alterarUsuario(id, alteracao) {
      await fonte.alterarUsuario(id, alteracao);
      const partes = [
        alteracao.usuario && `nome de usuário ${alteracao.usuario}`,
        alteracao.perfil && `perfil ${alteracao.perfil}`,
        alteracao.ativo === true && 'reativou',
        alteracao.ativo === false && 'desativou',
        alteracao.senha && 'redefiniu a senha',
      ].filter(Boolean);
      await registrar('usuario_alterado', `Alterou o usuário ${alteracao.nome ?? ''}${partes.length ? ` (${partes.join(', ')})` : ''}`.trim());
    },

    async removerUsuario(id) {
      await fonte.removerUsuario(id);
      await registrar('usuario_removido', 'Removeu um usuário');
    },

    async atualizarMeuPerfil(nome) {
      await fonte.atualizarMeuPerfil(nome);
      await registrar('usuario_alterado', `Atualizou o próprio nome para ${nome}`);
    },

    async trocarMinhaSenha(senhaAtual, novaSenha) {
      await fonte.trocarMinhaSenha(senhaAtual, novaSenha);
      await registrar('usuario_alterado', 'Trocou a própria senha');
    },

    async alterarMeuUsuario(novoUsuario, senhaAtual) {
      const anterior = (await fonte.sessaoAtual())?.usuario;
      await fonte.alterarMeuUsuario(novoUsuario, senhaAtual);
      await registrar('usuario_alterado', `Alterou o próprio nome de usuário de ${anterior ?? '?'} para ${novoUsuario}`);
    },

    async restaurarDadosDeExemplo() {
      await fonte.restaurarDadosDeExemplo?.();
      await registrar('backup_importado', 'Restaurou os dados de exemplo');
    },
  };
}
