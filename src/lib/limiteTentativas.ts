export const MAX_TENTATIVAS = 5;
export const JANELA_MS = 15 * 60 * 1000;

const CHAVE = 'logistica-que-aquece:tentativas-login';

type Registro = Record<string, number[]>;

export interface SituacaoLogin {
  bloqueado: boolean;
  /** Momento (ms) em que o bloqueio termina */
  liberaEm: number | null;
  tentativasRestantes: number;
}

/**
 * Limita as tentativas de login por nome de usuário:
 * no máximo 5 falhas em 15 minutos; ao exceder, o acesso fica bloqueado até a janela expirar.
 */
export function criarLimitadorDeTentativas(armazenamento: Storage | undefined, agora: () => number = Date.now) {
  const ler = (): Registro => {
    try {
      return JSON.parse(armazenamento?.getItem(CHAVE) ?? '{}') as Registro;
    } catch {
      return {};
    }
  };
  const gravar = (registro: Registro) => {
    try {
      armazenamento?.setItem(CHAVE, JSON.stringify(registro));
    } catch {
      // sem persistência: o limite vale só para esta aba
    }
  };
  // O prefixo impede que nomes como "constructor" ou "__proto__" colidam com propriedades do objeto
  const chave = (usuario: string) => `u:${usuario.trim().toLowerCase()}`;
  const recentes = (registro: Registro, usuario: string) => {
    const falhas = Object.prototype.hasOwnProperty.call(registro, chave(usuario)) ? registro[chave(usuario)] : [];
    return (Array.isArray(falhas) ? falhas : []).filter((momento) => typeof momento === 'number' && agora() - momento < JANELA_MS);
  };

  return {
    situacao(usuario: string): SituacaoLogin {
      const falhas = recentes(ler(), usuario);
      const bloqueado = falhas.length >= MAX_TENTATIVAS;
      return {
        bloqueado,
        liberaEm: bloqueado ? Math.min(...falhas) + JANELA_MS : null,
        tentativasRestantes: Math.max(0, MAX_TENTATIVAS - falhas.length),
      };
    },
    registrarFalha(usuario: string): SituacaoLogin {
      const registro = ler();
      registro[chave(usuario)] = [...recentes(registro, usuario), agora()];
      gravar(registro);
      return this.situacao(usuario);
    },
    limpar(usuario: string) {
      const registro = ler();
      delete registro[chave(usuario)];
      gravar(registro);
    },
  };
}
