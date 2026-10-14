import { format } from 'date-fns';
import { z } from 'zod';
import type { DadosEstoque } from '../data/fonte';
import { saldoDoItem } from './estoque';
import { GENEROS, MOTIVOS_DESCARTE, TAMANHOS, TIPOS_PECA } from './types';

const VERSAO = 1;
/** Um backup real da campanha tem poucas centenas de KB; acima disso o arquivo é rejeitado antes de ser lido. */
export const TAMANHO_MAXIMO_DO_BACKUP = 5 * 1024 * 1024;

// As regras espelham as do banco (supabase/schema.sql): um backup aceito aqui nunca falha na importação.
const id = z.string().min(1).max(100);
const momento = z.string().datetime({ offset: true });
const texto = (min: number, max: number) => z.string().trim().min(min).max(max);

const itemSchema = z.object({
  id,
  tipo: z.enum(TIPOS_PECA),
  tamanho: z.enum(TAMANHOS),
  genero: z.enum(GENEROS),
  created_at: momento,
});

const movimentacaoSchema = z
  .object({
    id,
    item_id: id,
    tipo: z.enum(['entrada', 'saida', 'descarte']),
    quantidade: z.number().int().min(1).max(10000),
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    responsavel: texto(2, 80),
    fornecedor: texto(1, 80).nullable(),
    motivo: z.enum(MOTIVOS_DESCARTE).nullable(),
    observacao: z.string().max(300).nullable(),
    created_at: momento,
  })
  .refine((mov) => mov.tipo !== 'entrada' || mov.fornecedor !== null, 'Entrada sem fornecedor')
  .refine((mov) => mov.tipo !== 'descarte' || mov.motivo !== null, 'Descarte sem motivo');

const backupSchema = z.object({
  sistema: z.literal('logistica-que-aquece'),
  versao: z.literal(VERSAO),
  exportado_em: momento,
  itens: z.array(itemSchema).max(5000),
  movimentacoes: z.array(movimentacaoSchema).max(100000),
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
  const combinacoes = new Set(itens.map((item) => `${item.tipo}|${item.tamanho}|${item.genero}`));
  if (ids.size !== itens.length || combinacoes.size !== itens.length) {
    throw new Error('O backup tem itens repetidos.');
  }
  if (new Set(movimentacoes.map((mov) => mov.id)).size !== movimentacoes.length) {
    throw new Error('O backup tem movimentações repetidas.');
  }
  if (movimentacoes.some((mov) => !ids.has(mov.item_id))) {
    throw new Error('O backup tem movimentações de itens que não existem.');
  }
  if (itens.some((item) => saldoDoItem(item.id, movimentacoes) < 0)) {
    throw new Error('O backup deixaria o estoque de algum item negativo.');
  }
  return { itens, movimentacoes };
}
