import { describe, expect, it } from 'vitest';
import { MAX_TENTATIVAS } from '../lib/limiteTentativas';
import type { AcaoAtividade } from '../lib/types';
import { ArmazenamentoEmMemoria } from '../test/armazenamento';
import { ErroDeNegocio, type FonteDeDados, type Sessao } from './fonte';
import { criarServico, LoginBloqueado } from './servico';

const MARLENE: Sessao = { id: 'u1', nome: 'Marlene', usuario: 'marlene', perfil: 'Operador' };

/** Fonte de dados mínima para testar o serviço sem banco: só a senha "certa" entra. */
function criar() {
  const atividades: Array<{ acao: AcaoAtividade; descricao: string; usuario?: string }> = [];
  const fonte = {
    async entrar(_usuario: string, senha: string) {
      if (senha !== 'certa') throw new ErroDeNegocio('Usuário ou senha incorretos.');
      return MARLENE;
    },
    async registrarEntrada() {},
    async registrarAtividade(acao: AcaoAtividade, descricao: string, usuario?: string) {
      atividades.unshift({ acao, descricao, usuario });
    },
  } as unknown as FonteDeDados;
  return { servico: criarServico(fonte, new ArmazenamentoEmMemoria()), atividades };
}

describe('serviço', () => {
  it('avisa quantas tentativas restam e bloqueia o login após o limite', async () => {
    const { servico } = criar();
    await expect(servico.entrar('marlene', 'errada')).rejects.toThrow(`Restam ${MAX_TENTATIVAS - 1} tentativas`);
    for (let i = 2; i < MAX_TENTATIVAS; i++) await servico.entrar('marlene', 'errada').catch(() => undefined);
    await expect(servico.entrar('marlene', 'errada')).rejects.toBeInstanceOf(LoginBloqueado);
    // Bloqueado mesmo com a senha certa, até a janela expirar
    await expect(servico.entrar('marlene', 'certa')).rejects.toBeInstanceOf(LoginBloqueado);
  });

  it('registra as ações no histórico de atividades', async () => {
    const { servico, atividades } = criar();
    await servico.entrar('marlene', 'certa');
    await servico.registrarEntrada({
      tipo: 'Touca',
      tamanho: 'Único',
      genero: 'Unissex',
      quantidade: 4,
      data: '2025-07-10',
      fornecedor: 'Comunidade',
      responsavel: 'Marlene',
    });
    const [ultima, penultima] = atividades;
    expect(ultima.acao).toBe('entrada');
    expect(ultima.descricao).toContain('4 peça(s)');
    expect(penultima).toMatchObject({ acao: 'login', usuario: 'Marlene' });
  });
});
