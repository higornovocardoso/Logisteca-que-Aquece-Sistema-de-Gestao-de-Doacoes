import { z } from 'zod';
import { GENEROS, MOTIVOS_DESCARTE, PERFIS, TAMANHOS, TIPOS_PECA } from './types';

const dataISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data válida');

const quantidade = z.preprocess(
  (valor) => (valor === '' || valor === null ? undefined : valor),
  z.coerce
    .number({ invalid_type_error: 'Informe a quantidade' })
    .int('A quantidade deve ser um número inteiro')
    .positive('A quantidade deve ser maior que zero')
    .max(10000, 'Quantidade muito alta'),
);

const nomePessoa = (mensagem: string) => z.string().trim().min(2, mensagem).max(80, 'Nome muito longo');

const observacao = z.string().trim().max(300, 'Máximo de 300 caracteres').optional();

const escolha = <T extends readonly [string, ...string[]]>(opcoes: T, mensagem: string) =>
  z.enum(opcoes, { errorMap: () => ({ message: mensagem }) });

export const entradaSchema = z.object({
  tipo: escolha(TIPOS_PECA, 'Selecione o tipo da peça'),
  tamanho: escolha(TAMANHOS, 'Selecione o tamanho'),
  genero: escolha(GENEROS, 'Selecione o gênero'),
  quantidade,
  data: dataISO,
  fornecedor: nomePessoa('Informe o fornecedor (quem doou)'),
  responsavel: nomePessoa('Informe o nome do responsável'),
  observacao,
});

export const saidaSchema = z.object({
  item_id: z.string().min(1, 'Selecione o item'),
  quantidade,
  data: dataISO,
  responsavel: nomePessoa('Informe o nome do responsável'),
  observacao,
});

export const descarteSchema = saidaSchema.extend({
  motivo: escolha(MOTIVOS_DESCARTE, 'Selecione o motivo do descarte'),
});

const nomeDeUsuario = z
  .string()
  .trim()
  .min(3, 'Mínimo de 3 caracteres')
  .max(30, 'Máximo de 30 caracteres')
  .regex(/^[A-Za-z0-9._-]+$/, 'Use apenas letras, números, ponto, hífen ou sublinhado');

export const senhaSchema = z.string().min(6, 'A senha deve ter pelo menos 6 caracteres').max(72, 'Senha muito longa');

export const novoUsuarioSchema = z.object({
  nome: nomePessoa('Informe o nome'),
  usuario: nomeDeUsuario,
  perfil: escolha(PERFIS, 'Selecione o perfil'),
  senha: senhaSchema,
});

export const edicaoUsuarioSchema = z.object({
  nome: nomePessoa('Informe o nome'),
  perfil: escolha(PERFIS, 'Selecione o perfil'),
  senha: z.union([z.literal(''), senhaSchema]).optional(),
});

export const meuPerfilSchema = z.object({
  nome: nomePessoa('Informe o nome'),
});

export const trocaDeSenhaSchema = z
  .object({
    senhaAtual: z.string().min(1, 'Informe a senha atual'),
    novaSenha: senhaSchema,
    confirmacao: z.string(),
  })
  .refine((dados) => dados.confirmacao === dados.novaSenha, { message: 'As senhas não conferem', path: ['confirmacao'] })
  .refine((dados) => dados.novaSenha !== dados.senhaAtual, { message: 'A nova senha deve ser diferente da atual', path: ['novaSenha'] });

export type ErrosFormulario = Partial<Record<string, string>>;

export function extrairErros(error: z.ZodError): ErrosFormulario {
  const erros: ErrosFormulario = {};
  for (const issue of error.issues) {
    const campo = String(issue.path[0]);
    erros[campo] ??= issue.message;
  }
  return erros;
}
