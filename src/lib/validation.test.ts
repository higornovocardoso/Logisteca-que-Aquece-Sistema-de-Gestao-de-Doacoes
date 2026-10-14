import { describe, expect, it } from 'vitest';
import { descarteSchema, entradaSchema, extrairErros, novoUsuarioSchema, saidaSchema, trocaDeSenhaSchema } from './validation';

const entradaValida = {
  tipo: 'Casaco',
  tamanho: 'M',
  genero: 'Feminino',
  fornecedor: 'SENAI Garopaba',
  quantidade: '3',
  data: '2025-06-10',
  responsavel: 'Higor',
  observacao: '',
};

describe('entradaSchema', () => {
  it('aceita uma entrada válida e converte a quantidade em número', () => {
    const resultado = entradaSchema.safeParse(entradaValida);
    expect(resultado.success && resultado.data.quantidade).toBe(3);
  });

  it('explica cada campo inválido', () => {
    const resultado = entradaSchema.safeParse({ ...entradaValida, tipo: '', quantidade: '', responsavel: ' ' });
    expect(resultado.success).toBe(false);
    if (resultado.success) return;
    expect(extrairErros(resultado.error)).toEqual({
      tipo: 'Selecione o tipo da peça',
      quantidade: 'Informe a quantidade',
      responsavel: 'Informe o nome do responsável',
    });
  });

  it('rejeita quantidades fracionadas ou negativas', () => {
    expect(entradaSchema.safeParse({ ...entradaValida, quantidade: '1.5' }).success).toBe(false);
    expect(entradaSchema.safeParse({ ...entradaValida, quantidade: '-2' }).success).toBe(false);
  });
});

describe('descarteSchema', () => {
  it('exige o motivo do descarte', () => {
    const resultado = descarteSchema.safeParse({ item_id: 'x', quantidade: '1', data: '2025-06-10', responsavel: 'Higor', motivo: '' });
    expect(resultado.success).toBe(false);
    if (resultado.success) return;
    expect(extrairErros(resultado.error).motivo).toBe('Selecione o motivo do descarte');
  });
});

describe('usuários', () => {
  it('valida o nome de usuário e a senha', () => {
    const erros = novoUsuarioSchema.safeParse({ nome: 'Ana', usuario: 'ana paula', perfil: 'Operador', senha: '123' });
    expect(erros.success).toBe(false);
    if (erros.success) return;
    expect(Object.keys(extrairErros(erros.error))).toEqual(['usuario', 'senha']);
  });
});

describe('saidaSchema', () => {
  it('exige o item da saída', () => {
    const resultado = saidaSchema.safeParse({ item_id: '', quantidade: '1', data: '2025-06-10', responsavel: 'Marlene' });
    expect(resultado.success).toBe(false);
    if (resultado.success) return;
    expect(extrairErros(resultado.error).item_id).toBe('Selecione o item');
  });
});

describe('trocaDeSenhaSchema', () => {
  it('exige a confirmação igual e uma senha nova diferente da atual', () => {
    expect(trocaDeSenhaSchema.safeParse({ senhaAtual: 'antiga', novaSenha: 'nova-senha', confirmacao: 'nova-senha' }).success).toBe(true);
    const diferente = trocaDeSenhaSchema.safeParse({ senhaAtual: 'antiga', novaSenha: 'nova-senha', confirmacao: 'outra' });
    expect(!diferente.success && extrairErros(diferente.error).confirmacao).toBe('As senhas não conferem');
    const repetida = trocaDeSenhaSchema.safeParse({ senhaAtual: 'mesma-senha', novaSenha: 'mesma-senha', confirmacao: 'mesma-senha' });
    expect(!repetida.success && extrairErros(repetida.error).novaSenha).toBe('A nova senha deve ser diferente da atual');
  });
});
