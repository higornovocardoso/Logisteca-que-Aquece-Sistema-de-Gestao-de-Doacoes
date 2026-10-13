import { format } from 'date-fns';
import { z } from 'zod';
import type { DadosEstoque } from '../data/fonte';
import { saldoDoItem } from './estoque';
import { GENEROS, MOTIVOS_DESCARTE, TAMANHOS, TIPOS_PECA } from './types';

const VERSAO = 1;

const itemSchema = z.object({
  id: z.string().min(1),
  tipo: z.enum(TIPOS_PECA),
  tamanho: z.enum(TAMANHOS),
  genero: z.enum(GENEROS),
  created_at: z.string(),
});

const movimentacaoSchema = z.object({
  id: z.string().min(1),
  item_id: z.string().min(1),
  tipo: z.enum(['entrada', 'saida', 'descarte']),
  quantidade: z.number().int().positive(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  responsavel: z.string().min(1),
  fornecedor: z.string().nullable(),
  motivo: z.enum(MOTIVOS_DESCARTE).nullable(),
  observacao: z.string().nullable(),
  created_at: z.string(),
});

const backupSchema = z.object({
  sistema: z.literal('logistica-que-aquece'),
  versao: z.literal(VERSAO),
  exportado_em: z.string(),
  itens: z.array(itemSchema),
  movimentacoes: z.array(movimentacaoSchema),
});

export function gerarBackup(dados: DadosEstoque): string {
  return JSON.stringify(
    { sistema: 'logistica-que-aquece', versao: VERSAO, exportado_em: new Date().toISOString(), ...dados },
    null,
    2,
  );
}

export function nomeDoArquivoDeBackup(): string {
  return `backup-logistica-que-aquece-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
}

/** Lê e valida um arquivo de backup. Lança um erro com mensagem amigável se o arquivo for inválido. */
export function lerBackup(conteudo: string): DadosEstoque {
  let json: unknown;
  try {
    json = JSON.parse(conteudo);
  } catch {
    throw new Error('O arquivo não é um JSON válido.');
  }
  const resultado = backupSchema.safeParse(json);
  if (!resultado.success) throw new Error('O arquivo não é um backup válido do Logística que Aquece.');

  const { itens, movimentacoes } = resultado.data;
  const ids = new Set(itens.map((item) => item.id));
  if (movimentacoes.some((mov) => !ids.has(mov.item_id))) {
    throw new Error('O backup tem movimentações de itens que não existem.');
  }
  if (itens.some((item) => saldoDoItem(item.id, movimentacoes) < 0)) {
    throw new Error('O backup deixaria o estoque de algum item negativo.');
  }
  return { itens, movimentacoes };
}
