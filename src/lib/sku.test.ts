import { describe, expect, it } from 'vitest';
import { codigoDoItem } from './sku';

describe('codigoDoItem', () => {
  it('monta o código a partir do tipo, gênero e tamanho', () => {
    expect(codigoDoItem({ tipo: 'Casaco', genero: 'Feminino', tamanho: 'M' })).toBe('CAS-F-M');
    expect(codigoDoItem({ tipo: 'Calça', genero: 'Unissex', tamanho: 'Infantil' })).toBe('CAL-U-INF');
    expect(codigoDoItem({ tipo: 'Meia', genero: 'Unissex', tamanho: 'Único' })).toBe('MEI-U-UN');
  });
});
