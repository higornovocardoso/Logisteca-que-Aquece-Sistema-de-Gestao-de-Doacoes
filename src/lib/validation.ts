import { z } from 'zod';
import { PUBLICOS, TAMANHOS, TIPOS_PECA } from './types';

const dataISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data válida');

const quantidade = z.preprocess(
  (valor) => (valor === '' || valor === null ? undefined : valor),
  z.coerce
    .number({ invalid_type_error: 'Informe a quantidade' })
    .int('A quantidade deve ser um número inteiro')
    .positive('A quantidade deve ser maior que zero')
    .max(10000, 'Quantidade muito alta'),
);

const responsavel = z
  .string()
  .trim()
  .min(2, 'Informe o nome do responsável')
  .max(80, 'Nome muito longo');

const observacao = z.string().trim().max(300, 'Máximo de 300 caracteres').optional();

export const entradaSchema = z.object({
  tipo: z.enum(TIPOS_PECA, { errorMap: () => ({ message: 'Selecione o tipo da peça' }) }),
  tamanho: z.enum(TAMANHOS, { errorMap: () => ({ message: 'Selecione o tamanho' }) }),
  publico: z.enum(PUBLICOS, { errorMap: () => ({ message: 'Selecione o público' }) }),
  quantidade,
  data: dataISO,
  responsavel,
  observacao,
});

export const saidaSchema = z.object({
  item_id: z.string().min(1, 'Selecione o item'),
  quantidade,
  data: dataISO,
  responsavel,
  observacao,
});

export type ErrosFormulario = Partial<Record<string, string>>;

export function extrairErros(error: z.ZodError): ErrosFormulario {
  const erros: ErrosFormulario = {};
  for (const issue of error.issues) {
    const campo = String(issue.path[0]);
    erros[campo] ??= issue.message;
  }
  return erros;
}
