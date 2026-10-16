import { format } from 'date-fns';
import { formatarData, formatarNumero } from './format';
import { codigoDoItem } from './sku';
import { ROTULOS_MOVIMENTACAO, TIPOS_PECA, type ItemComSaldo, type MovimentacaoDetalhada, type TipoMovimentacao } from './types';

export type TipoRelatorio = 'movimentacoes' | 'resumo' | 'estoque' | 'fornecedores';
export type FiltroMovimentacao = 'todas' | TipoMovimentacao;

export interface FiltrosRelatorio {
  tipo: TipoRelatorio;
  inicio: string;
  fim: string;
  movimentacao: FiltroMovimentacao;
}

export interface Relatorio {
  titulo: string;
  subtitulo: string;
  colunas: string[];
  /** Índices das colunas numéricas, alinhadas à direita */
  numericas: number[];
  linhas: (string | number)[][];
  resumo: string[];
  nomeArquivo: string;
}

function descreverPeriodo(inicio: string, fim: string): string {
  if (inicio && fim) return `Período: ${formatarData(inicio)} a ${formatarData(fim)}`;
  if (inicio) return `A partir de ${formatarData(inicio)}`;
  if (fim) return `Até ${formatarData(fim)}`;
  return 'Período: toda a campanha';
}

function porcento(parte: number, total: number): string {
  return total ? `${Math.round((parte / total) * 100)}%` : '0%';
}

export function montarRelatorio(filtros: FiltrosRelatorio, itens: ItemComSaldo[], movimentacoes: MovimentacaoDetalhada[]): Relatorio {
  const periodo = descreverPeriodo(filtros.inicio, filtros.fim);
  const sufixo = format(new Date(), 'yyyy-MM-dd');
  const doPeriodo = movimentacoes.filter((m) => (!filtros.inicio || m.data >= filtros.inicio) && (!filtros.fim || m.data <= filtros.fim));

  if (filtros.tipo === 'estoque') {
    const lista = itens
      .filter((i) => i.entradas > 0)
      .sort((a, b) => TIPOS_PECA.indexOf(a.tipo) - TIPOS_PECA.indexOf(b.tipo) || codigoDoItem(a).localeCompare(codigoDoItem(b), 'pt-BR', { numeric: true }));
    const saldo = lista.reduce((t, i) => t + i.saldo, 0);
    return {
      titulo: 'Posição de estoque',
      subtitulo: `Posição em ${format(new Date(), 'dd/MM/yyyy')}`,
      colunas: ['Código', 'Peça', 'Gênero', 'Tamanho', 'Entradas', 'Saídas', 'Descartes', 'Saldo'],
      numericas: [4, 5, 6, 7],
      linhas: lista.map((i) => [codigoDoItem(i), i.tipo, i.genero, i.tamanho, i.entradas, i.saidas, i.descartes, i.saldo]),
      resumo: [
        `Itens: ${formatarNumero(lista.length)}`,
        `Peças em estoque: ${formatarNumero(saldo)}`,
        `Itens esgotados: ${formatarNumero(lista.filter((i) => i.saldo === 0).length)}`,
      ],
      nomeArquivo: `posicao-de-estoque-${sufixo}`,
    };
  }

  if (filtros.tipo === 'resumo') {
    const totais = new Map<string, { entrada: number; saida: number; descarte: number }>();
    for (const m of doPeriodo) {
      const t = totais.get(m.item.tipo) ?? { entrada: 0, saida: 0, descarte: 0 };
      t[m.tipo] += m.quantidade;
      totais.set(m.item.tipo, t);
    }
    const linhas = TIPOS_PECA.filter((t) => totais.has(t)).map((t) => {
      const { entrada, saida, descarte } = totais.get(t)!;
      return [t, entrada, saida, descarte, porcento(saida, entrada)];
    });
    const soma = (i: number) => linhas.reduce((t, l) => t + (l[i] as number), 0);
    return {
      titulo: 'Resumo por tipo de peça',
      subtitulo: periodo,
      colunas: ['Tipo de peça', 'Arrecadadas', 'Distribuídas', 'Descartadas', 'Distribuído'],
      numericas: [1, 2, 3, 4],
      linhas,
      resumo: [
        `Arrecadadas: ${formatarNumero(soma(1))}`,
        `Distribuídas: ${formatarNumero(soma(2))} (${porcento(soma(2), soma(1))})`,
        `Descartadas: ${formatarNumero(soma(3))} (${porcento(soma(3), soma(1))})`,
      ],
      nomeArquivo: `resumo-por-tipo-${sufixo}`,
    };
  }

  if (filtros.tipo === 'fornecedores') {
    const totais = new Map<string, { doacoes: number; pecas: number }>();
    for (const m of doPeriodo) {
      if (m.tipo !== 'entrada' || !m.fornecedor) continue;
      const t = totais.get(m.fornecedor) ?? { doacoes: 0, pecas: 0 };
      t.doacoes += 1;
      t.pecas += m.quantidade;
      totais.set(m.fornecedor, t);
    }
    const total = [...totais.values()].reduce((s, t) => s + t.pecas, 0);
    const linhas = [...totais.entries()].sort(([, a], [, b]) => b.pecas - a.pecas).map(([f, t]) => [f, t.doacoes, t.pecas, porcento(t.pecas, total)]);
    return {
      titulo: 'Doações por fornecedor',
      subtitulo: periodo,
      colunas: ['Fornecedor', 'Doações', 'Peças', 'Participação'],
      numericas: [1, 2, 3],
      linhas,
      resumo: [`Fornecedores: ${formatarNumero(linhas.length)}`, `Peças recebidas: ${formatarNumero(total)}`],
      nomeArquivo: `doacoes-por-fornecedor-${sufixo}`,
    };
  }

  const selecionadas = doPeriodo
    .filter((m) => filtros.movimentacao === 'todas' || m.tipo === filtros.movimentacao)
    .sort((a, b) => a.data.localeCompare(b.data) || a.created_at.localeCompare(b.created_at));
  const titulos: Record<FiltroMovimentacao, string> = {
    todas: 'Movimentações',
    entrada: 'Entradas',
    saida: 'Saídas',
    descarte: 'Descartes',
  };
  const soma = (tipo: TipoMovimentacao) => selecionadas.filter((m) => m.tipo === tipo).reduce((t, m) => t + m.quantidade, 0);

  return {
    titulo: titulos[filtros.movimentacao],
    subtitulo: periodo,
    colunas: ['Data', 'Tipo', 'Código', 'Peça', 'Gênero', 'Tam.', 'Qtd.', 'Fornecedor / motivo', 'Responsável'],
    numericas: [6],
    linhas: selecionadas.map((m) => [
      formatarData(m.data),
      ROTULOS_MOVIMENTACAO[m.tipo],
      codigoDoItem(m.item),
      m.item.tipo,
      m.item.genero,
      m.item.tamanho,
      m.quantidade,
      m.fornecedor ?? m.motivo ?? '',
      m.responsavel,
    ]),
    resumo: [
      `Registros: ${formatarNumero(selecionadas.length)}`,
      ...(['entrada', 'saida', 'descarte'] as const)
        .filter((t) => filtros.movimentacao === 'todas' || filtros.movimentacao === t)
        .map((t) => `${titulos[t]}: ${formatarNumero(soma(t))} peças`),
    ],
    nomeArquivo: `${titulos[filtros.movimentacao].toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')}-${sufixo}`,
  };
}

export function baixarArquivo(conteudo: BlobPart, tipo: string, nomeArquivo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type Tabela = Pick<Relatorio, 'colunas' | 'linhas' | 'nomeArquivo'>;

export async function exportarCSV(tabela: Tabela) {
  const { default: Papa } = await import('papaparse');
  // Ponto e vírgula e BOM para o Excel em português abrir o arquivo corretamente.
  // escapeFormulae impede que um texto como "=HYPERLINK(...)" vire fórmula ao abrir a planilha.
  const csv = Papa.unparse({ fields: tabela.colunas, data: tabela.linhas }, { delimiter: ';', escapeFormulae: true });
  baixarArquivo(`\uFEFF${csv}`, 'text/csv;charset=utf-8', `${tabela.nomeArquivo}.csv`);
}

export async function exportarExcel(tabela: Tabela) {
  const XLSX = await import('xlsx');
  const planilha = XLSX.utils.aoa_to_sheet([tabela.colunas, ...tabela.linhas]);
  planilha['!cols'] = tabela.colunas.map((coluna, i) => ({
    wch: Math.max(coluna.length, ...tabela.linhas.map((linha) => String(linha[i] ?? '').length)) + 2,
  }));
  const pasta = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(pasta, planilha, 'Relatório');
  XLSX.writeFile(pasta, `${tabela.nomeArquivo}.xlsx`);
}

export async function exportarPDF(relatorio: Relatorio) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const paisagem = relatorio.colunas.length > 6;
  const doc = new jsPDF({ orientation: paisagem ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
  const largura = doc.internal.pageSize.getWidth();
  const tinta: [number, number, number] = [15, 42, 51];
  const brasa: [number, number, number] = [228, 87, 46];

  doc.setFillColor(...tinta);
  doc.rect(0, 0, largura, 24, 'F');
  doc.setFillColor(...brasa);
  doc.rect(0, 24, largura, 1.2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Logística que Aquece', 14, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Campanha de agasalhos · SENAI e Rede Feminina de Garopaba', 14, 17);
  doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, largura - 14, 17, { align: 'right' });

  doc.setTextColor(...tinta);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(relatorio.titulo, 14, 37);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(94, 110, 118);
  doc.text(`${relatorio.subtitulo}  ·  ${relatorio.resumo.join('  ·  ')}`, 14, 43);

  autoTable(doc, {
    startY: 49,
    head: [relatorio.colunas],
    body: relatorio.linhas.map((linha) => linha.map((v) => (typeof v === 'number' ? formatarNumero(v) : v))),
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: { top: 2.2, bottom: 2.2, left: 2.5, right: 2.5 }, textColor: tinta },
    headStyles: { fillColor: [241, 244, 246], textColor: [94, 110, 118], fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { lineColor: [222, 228, 232], lineWidth: { bottom: 0.2 } },
    columnStyles: Object.fromEntries(relatorio.numericas.map((i) => [i, { halign: 'right' as const }])),
    margin: { left: 14, right: 14 },
    didDrawPage: () => {
      const altura = doc.internal.pageSize.getHeight();
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 170);
      doc.text(`Página ${doc.getNumberOfPages()}`, largura - 14, altura - 8, { align: 'right' });
    },
  });

  doc.save(`${relatorio.nomeArquivo}.pdf`);
}
