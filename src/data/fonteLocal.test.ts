import { beforeEach, describe, expect, it } from 'vitest';
import { calcularSaldos } from '../lib/estoque';
import type { NovaEntrada } from '../lib/types';
import { ArmazenamentoEmMemoria } from '../test/armazenamento';
import { ErroDeNegocio, type FonteDeDados } from './fonte';
import { criarFonteLocal } from './fonteLocal';
import { gerarDadosDeExemplo } from './seed';

const entrada: NovaEntrada = {
  tipo: 'Cobertor',
  tamanho: 'Único',
  genero: 'Unissex',
  quantidade: 5,
  data: '2025-07-01',
  fornecedor: 'SENAI Garopaba',
  responsavel: 'Higor',
};

describe('dados de exemplo', () => {
  const { itens, movimentacoes } = gerarDadosDeExemplo();

  it('nunca deixam o estoque negativo e só incluem itens que receberam doações', () => {
    for (const item of calcularSaldos(itens, movimentacoes)) {
      expect(item.saldo).toBeGreaterThanOrEqual(0);
      expect(item.entradas).toBeGreaterThan(0);
    }
  });

  it('têm fornecedor em toda entrada e motivo em todo descarte', () => {
    expect(movimentacoes.filter((m) => m.tipo === 'entrada').every((m) => m.fornecedor)).toBe(true);
    expect(movimentacoes.filter((m) => m.tipo === 'descarte').every((m) => m.motivo)).toBe(true);
    expect(movimentacoes.some((m) => m.tipo === 'descarte')).toBe(true);
  });

  it('são sempre os mesmos', () => {
    expect(gerarDadosDeExemplo()).toEqual(gerarDadosDeExemplo());
  });
});

describe('fonte local (modo demonstração)', () => {
  let fonte: FonteDeDados;

  beforeEach(() => {
    fonte = criarFonteLocal(new ArmazenamentoEmMemoria());
  });

  describe('acesso', () => {
    it('autentica com a senha correta, sem diferenciar maiúsculas no usuário', async () => {
      await expect(fonte.entrar('Visitante', 'errada')).rejects.toBeInstanceOf(ErroDeNegocio);
      await expect(fonte.entrar('visitante', 'Visitante')).resolves.toMatchObject({ nome: 'Visitante', perfil: 'Administrador' });
      expect(await fonte.sessaoAtual()).toMatchObject({ usuario: 'Visitante' });
      await fonte.sair();
      expect(await fonte.sessaoAtual()).toBeNull();
    });

    it('exige login para ler os dados', async () => {
      await expect(fonte.carregar()).rejects.toThrow('sessão');
    });

    it('não guarda senhas em texto puro', async () => {
      const armazenamento = new ArmazenamentoEmMemoria();
      const local = criarFonteLocal(armazenamento);
      await local.entrar('Visitante', 'Visitante');
      await local.criarUsuario({ nome: 'Bruna', usuario: 'bruna', perfil: 'Operador', senha: 'senha-bem-secreta' });
      const tudo = [...Array(armazenamento.length).keys()].map((i) => armazenamento.getItem(armazenamento.key(i)!)).join();
      expect(tudo).not.toContain('senha-bem-secreta');
      await local.sair();
      await expect(local.entrar('bruna', 'senha-bem-secreta')).resolves.toBeTruthy();
    });
  });

  describe('estoque', () => {
    beforeEach(async () => {
      await fonte.entrar('Visitante', 'Visitante');
    });

    it('reaproveita o item existente e cria item novo para combinação inédita', async () => {
      const antes = await fonte.carregar();
      await fonte.registrarEntrada({ ...entrada, tipo: 'Casaco', tamanho: 'G', genero: 'Masculino' });
      expect((await fonte.carregar()).itens).toHaveLength(antes.itens.length);
      await fonte.registrarEntrada({ ...entrada, tipo: 'Jaqueta', tamanho: 'Infantil', genero: 'Feminino' });
      expect((await fonte.carregar()).itens).toHaveLength(antes.itens.length + 1);
    });

    it('impede saídas e descartes acima do saldo', async () => {
      const { itens, movimentacoes } = await fonte.carregar();
      const item = calcularSaldos(itens, movimentacoes).find((i) => i.saldo > 1)!;
      const base = { item_id: item.id, data: '2025-08-30', responsavel: 'Marlene' };

      await expect(fonte.registrarSaida({ ...base, quantidade: item.saldo + 1 })).rejects.toThrow(/Estoque insuficiente/);
      await fonte.registrarDescarte({ ...base, quantidade: 1, motivo: 'Manchado' });
      await fonte.registrarSaida({ ...base, quantidade: item.saldo - 1 });
      await expect(fonte.registrarDescarte({ ...base, quantidade: 1, motivo: 'Manchado' })).rejects.toThrow(/Estoque insuficiente/);

      const atual = await fonte.carregar();
      expect(calcularSaldos(atual.itens, atual.movimentacoes).find((i) => i.id === item.id)!.saldo).toBe(0);
    });

    it('impede excluir uma entrada cujas peças já saíram', async () => {
      await fonte.registrarEntrada({ ...entrada, tipo: 'Luva', tamanho: 'P', genero: 'Feminino', quantidade: 3 });
      const nova = (await fonte.carregar()).movimentacoes.at(-1)!;
      await fonte.registrarSaida({ item_id: nova.item_id, quantidade: 2, data: '2025-07-02', responsavel: 'Sandra' });
      await expect(fonte.excluirMovimentacao(nova.id)).rejects.toThrow(/saldo ficaria negativo/);
    });

    it('limpa e importa dados', async () => {
      const original = await fonte.carregar();
      await fonte.limparDados();
      expect(await fonte.carregar()).toEqual({ itens: [], movimentacoes: [] });
      await fonte.importarDados(original);
      expect(await fonte.carregar()).toEqual(original);
    });
  });

  describe('permissões e usuários', () => {
    it('operadores registram, mas não excluem nem administram', async () => {
      await fonte.entrar('Marlene', 'Marlene');
      await fonte.registrarEntrada(entrada);
      const mov = (await fonte.carregar()).movimentacoes.at(-1)!;
      await expect(fonte.excluirMovimentacao(mov.id)).rejects.toThrow('administradores');
      await expect(fonte.limparDados()).rejects.toThrow('administradores');
      await expect(fonte.listarUsuarios()).rejects.toThrow('administradores');
      await expect(fonte.listarAtividades()).rejects.toThrow('administradores');
    });

    it('administradores criam usuários que conseguem entrar', async () => {
      await fonte.entrar('Visitante', 'Visitante');
      await fonte.criarUsuario({ nome: 'Ana Paula', usuario: 'ana.paula', perfil: 'Operador', senha: 'segredo1' });
      await expect(fonte.criarUsuario({ nome: 'Outra', usuario: 'ANA.PAULA', perfil: 'Operador', senha: 'segredo1' })).rejects.toThrow('em uso');
      await fonte.sair();
      await expect(fonte.entrar('ana.paula', 'segredo1')).resolves.toMatchObject({ nome: 'Ana Paula', perfil: 'Operador' });
    });

    it('usuários desativados não entram e a sessão deles é encerrada', async () => {
      await fonte.entrar('Visitante', 'Visitante');
      const marlene = (await fonte.listarUsuarios()).find((u) => u.usuario === 'Marlene')!;
      await fonte.alterarUsuario(marlene.id, { ativo: false });
      await fonte.sair();
      await expect(fonte.entrar('Marlene', 'Marlene')).rejects.toThrow('desativado');
    });

    it('mantém pelo menos um administrador ativo e protege o próprio usuário', async () => {
      const eu = await fonte.entrar('Visitante', 'Visitante');
      const higor = (await fonte.listarUsuarios()).find((u) => u.usuario === 'Higor')!;
      await fonte.alterarUsuario(higor.id, { perfil: 'Operador' });
      await expect(fonte.alterarUsuario(eu.id, { perfil: 'Operador' })).rejects.toThrow('pelo menos um administrador');
      await expect(fonte.alterarUsuario(eu.id, { ativo: false })).rejects.toThrow('próprio');
      await expect(fonte.removerUsuario(eu.id)).rejects.toThrow('próprio');
    });

    it('administradores trocam o nome de usuário de outras pessoas', async () => {
      await fonte.entrar('Visitante', 'Visitante');
      const marlene = (await fonte.listarUsuarios()).find((u) => u.usuario === 'Marlene')!;
      await expect(fonte.alterarUsuario(marlene.id, { usuario: 'visitante' })).rejects.toThrow('em uso');
      await fonte.alterarUsuario(marlene.id, { usuario: 'marlene.souza' });
      await fonte.sair();
      await expect(fonte.entrar('Marlene', 'Marlene')).rejects.toThrow();
      await expect(fonte.entrar('marlene.souza', 'Marlene')).resolves.toMatchObject({ nome: 'Marlene' });
      await expect(fonte.alterarUsuario(marlene.id, { usuario: 'outra' })).rejects.toThrow('administradores');
    });

    it('redefine a senha de um usuário', async () => {
      await fonte.entrar('Visitante', 'Visitante');
      const marlene = (await fonte.listarUsuarios()).find((u) => u.usuario === 'Marlene')!;
      await fonte.alterarUsuario(marlene.id, { senha: 'nova-senha' });
      await fonte.sair();
      await expect(fonte.entrar('Marlene', 'Marlene')).rejects.toThrow();
      await expect(fonte.entrar('Marlene', 'nova-senha')).resolves.toBeTruthy();
    });
  });

  describe('meu perfil', () => {
    it('qualquer usuário altera o próprio nome', async () => {
      await fonte.entrar('Marlene', 'Marlene');
      await fonte.atualizarMeuPerfil('Marlene Souza');
      await expect(fonte.sessaoAtual()).resolves.toMatchObject({ nome: 'Marlene Souza', perfil: 'Operador' });
    });

    it('troca a própria senha somente com a senha atual correta', async () => {
      await fonte.entrar('Marlene', 'Marlene');
      await expect(fonte.trocarMinhaSenha('errada', 'nova-senha')).rejects.toThrow('senha atual');
      await fonte.trocarMinhaSenha('Marlene', 'nova-senha');
      await fonte.sair();
      await expect(fonte.entrar('Marlene', 'Marlene')).rejects.toThrow();
      await expect(fonte.entrar('Marlene', 'nova-senha')).resolves.toBeTruthy();
    });

    it('troca o próprio nome de usuário com a senha atual e passa a entrar com o novo', async () => {
      await fonte.entrar('Marlene', 'Marlene');
      await expect(fonte.alterarMeuUsuario('marlene.souza', 'errada')).rejects.toThrow('senha atual');
      await expect(fonte.alterarMeuUsuario('VISITANTE', 'Marlene')).rejects.toThrow('em uso');
      await fonte.alterarMeuUsuario('marlene.souza', 'Marlene');
      await expect(fonte.sessaoAtual()).resolves.toMatchObject({ usuario: 'marlene.souza' });
      await fonte.sair();
      await expect(fonte.entrar('Marlene', 'Marlene')).rejects.toThrow();
      await expect(fonte.entrar('marlene.souza', 'Marlene')).resolves.toMatchObject({ nome: 'Marlene' });
    });

    it('exige login', async () => {
      await expect(fonte.atualizarMeuPerfil('Alguém')).rejects.toThrow('sessão');
      await expect(fonte.trocarMinhaSenha('a', 'b')).rejects.toThrow('sessão');
      await expect(fonte.alterarMeuUsuario('alguem', 'b')).rejects.toThrow('sessão');
    });
  });
});
