import { describe, expect, it } from 'vitest';
import { entradaSchema, extrairErros, saidaSchema } from './validation';

const entradaValida = {
  tipo: 'Casaco',
  tamanho: 'M',
  publico: 'Feminino',
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

describe('saidaSchema', () => {
  it('exige o item da saída', () => {
    const resultado = saidaSchema.safeParse({ item_id: '', quantidade: '1', data: '2025-06-10', responsavel: 'Marlene' });
    expect(resultado.success).toBe(false);
    if (resultado.success) return;
    expect(extrairErros(resultado.error).item_id).toBe('Selecione o item');
  });
});
