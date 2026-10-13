import { describe, expect, it } from 'vitest';
import { ArmazenamentoEmMemoria } from '../test/armazenamento';
import { criarLimitadorDeTentativas, JANELA_MS, MAX_TENTATIVAS } from './limiteTentativas';

describe('limitador de tentativas de login', () => {
  it(`bloqueia após ${MAX_TENTATIVAS} falhas e libera depois de 15 minutos`, () => {
    let agora = 1_000_000;
    const limitador = criarLimitadorDeTentativas(new ArmazenamentoEmMemoria(), () => agora);

    for (let i = 1; i < MAX_TENTATIVAS; i++) {
      expect(limitador.registrarFalha('Marlene')).toMatchObject({ bloqueado: false, tentativasRestantes: MAX_TENTATIVAS - i });
      agora += 1000;
    }
    const bloqueio = limitador.registrarFalha('marlene'); // não diferencia maiúsculas
    expect(bloqueio.bloqueado).toBe(true);
    expect(bloqueio.liberaEm).toBe(1_000_000 + JANELA_MS);

    agora = 1_000_000 + JANELA_MS + 1;
    expect(limitador.situacao('Marlene').bloqueado).toBe(false);
  });

  it('conta as tentativas separadamente por usuário e zera após o login', () => {
    const limitador = criarLimitadorDeTentativas(new ArmazenamentoEmMemoria());
    limitador.registrarFalha('ana');
    limitador.registrarFalha('ana');
    expect(limitador.situacao('bruna').tentativasRestantes).toBe(MAX_TENTATIVAS);
    limitador.limpar('ana');
    expect(limitador.situacao('ana').tentativasRestantes).toBe(MAX_TENTATIVAS);
  });
});
