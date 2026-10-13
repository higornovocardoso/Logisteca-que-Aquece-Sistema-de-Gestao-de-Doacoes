import { describe, expect, it } from 'vitest';
import { MAX_TENTATIVAS } from '../lib/limiteTentativas';
import { ArmazenamentoEmMemoria } from '../test/armazenamento';
import { criarFonteLocal } from './fonteLocal';
import { criarServico, LoginBloqueado } from './servico';

function criar() {
  const armazenamento = new ArmazenamentoEmMemoria();
  return criarServico(criarFonteLocal(armazenamento), armazenamento);
}

describe('serviço', () => {
  it('avisa quantas tentativas restam e bloqueia o login após o limite', async () => {
    const servico = criar();
    await expect(servico.entrar('Marlene', 'errada')).rejects.toThrow(`Restam ${MAX_TENTATIVAS - 1} tentativas`);
    for (let i = 2; i < MAX_TENTATIVAS; i++) await servico.entrar('Marlene', 'errada').catch(() => undefined);
    await expect(servico.entrar('Marlene', 'errada')).rejects.toBeInstanceOf(LoginBloqueado);
    // Bloqueado mesmo com a senha certa, até a janela expirar
    await expect(servico.entrar('Marlene', 'Marlene')).rejects.toBeInstanceOf(LoginBloqueado);
  });

  it('registra as ações no histórico de atividades com o autor', async () => {
    const servico = criar();
    await servico.entrar('Visitante', 'Visitante');
    await servico.registrarEntrada({
      tipo: 'Touca',
      tamanho: 'Único',
      genero: 'Unissex',
      quantidade: 4,
      data: '2025-07-10',
      fornecedor: 'Comunidade',
      responsavel: 'Visitante',
    });
    const [ultima, penultima] = await servico.listarAtividades();
    expect(ultima).toMatchObject({ acao: 'entrada', usuario: 'Visitante' });
    expect(ultima.descricao).toContain('4 peça(s)');
    expect(penultima).toMatchObject({ acao: 'login', usuario: 'Visitante' });
  });
});
