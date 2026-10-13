import { format } from 'date-fns';
import { formatarData, formatarNumero } from './format';
import { TIPOS_PECA, type ItemComSaldo, type MovimentacaoDetalhada } from './types';

export type TipoRelatorio = 'movimentacoes' | 'estoque' | 'resumo';
export type FiltroMovimentacao = 'todas' | 'entrada' | 'saida';

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
  /** Colunas numéricas, alinhadas à direita */
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

function noPeriodo(data: string, { inicio, fim }: FiltrosRelatorio): boolean {
  return (!inicio || data >= inicio) && (!fim || data <= fim);
}

export function montarRelatorio(
  filtros: FiltrosRelatorio,
  itens: ItemComSaldo[],
  movimentacoes: MovimentacaoDetalhada[],
): Relatorio {
  const periodo = descreverPeriodo(filtros.inicio, filtros.fim);
  const sufixo = format(new Date(), 'yyyy-MM-dd');

  if (filtros.tipo === 'estoque') {
    const comSaldo = itens
      .filter((item) => item.entradas > 0)
      .sort((a, b) => TIPOS_PECA.indexOf(a.tipo) - TIPOS_PECA.indexOf(b.tipo) || a.publico.localeCompare(b.publico));
    const total = comSaldo.reduce((t, item) => t + item.saldo, 0);
    return {
      titulo: 'Relatório de estoque atual',
      subtitulo: `Posição em ${format(new Date(), 'dd/MM/yyyy')}`,
      colunas: ['Peça', 'Tamanho', 'Público', 'Entradas', 'Saídas', 'Saldo'],
      numericas: [3, 4, 5],
      linhas: comSaldo.map((item) => [item.tipo, item.tamanho, item.publico, item.entradas, item.saidas, item.saldo]),
      resumo: [
        `Itens: ${formatarNumero(comSaldo.length)}`,
        `Peças em estoque: ${formatarNumero(total)}`,
        `Itens esgotados: ${formatarNumero(comSaldo.filter((i) => i.saldo === 0).length)}`,
      ],
      nomeArquivo: `estoque-${sufixo}`,
    };
  }

  const doPeriodo = movimentacoes.filter((mov) => noPeriodo(mov.data, filtros));

  if (filtros.tipo === 'resumo') {
    const porTipo = new Map<string, { entradas: number; saidas: number }>();
    for (const mov of doPeriodo) {
      const total = porTipo.get(mov.item.tipo) ?? { entradas: 0, saidas: 0 };
      if (mov.tipo === 'entrada') total.entradas += mov.quantidade;
      else total.saidas += mov.quantidade;
      porTipo.set(mov.item.tipo, total);
    }
    const linhas = TIPOS_PECA.filter((tipo) => porTipo.has(tipo)).map((tipo) => {
      const { entradas, saidas } = porTipo.get(tipo)!;
      return [tipo, entradas, saidas, entradas - saidas];
    });
    const entradas = linhas.reduce((t, l) => t + (l[1] as number), 0);
    const saidas = linhas.reduce((t, l) => t + (l[2] as number), 0);
    return {
      titulo: 'Resumo por tipo de peça',
      subtitulo: periodo,
      colunas: ['Tipo de peça', 'Arrecadadas', 'Distribuídas', 'Diferença'],
      numericas: [1, 2, 3],
      linhas,
      resumo: [
        `Peças arrecadadas: ${formatarNumero(entradas)}`,
        `Peças distribuídas: ${formatarNumero(saidas)}`,
        `Aproveitamento: ${entradas ? Math.round((saidas / entradas) * 100) : 0}% das peças arrecadadas`,
      ],
      nomeArquivo: `resumo-por-tipo-${sufixo}`,
    };
  }

  const selecionadas = doPeriodo
    .filter((mov) => filtros.movimentacao === 'todas' || mov.tipo === filtros.movimentacao)
    .sort((a, b) => a.data.localeCompare(b.data) || a.created_at.localeCompare(b.created_at));
  const titulos = { todas: 'Relatório de movimentações', entrada: 'Relatório de entradas', saida: 'Relatório de saídas' };
  const entradas = selecionadas.filter((m) => m.tipo === 'entrada').reduce((t, m) => t + m.quantidade, 0);
  const saidas = selecionadas.filter((m) => m.tipo === 'saida').reduce((t, m) => t + m.quantidade, 0);

  return {
    titulo: titulos[filtros.movimentacao],
    subtitulo: periodo,
    colunas: ['Data', 'Tipo', 'Peça', 'Tamanho', 'Público', 'Qtd.', 'Responsável', 'Observação'],
    numericas: [5],
    linhas: selecionadas.map((mov) => [
      formatarData(mov.data),
      mov.tipo === 'entrada' ? 'Entrada' : 'Saída',
      mov.item.tipo,
      mov.item.tamanho,
      mov.item.publico,
      mov.quantidade,
      mov.responsavel,
      mov.observacao ?? '',
    ]),
    resumo: [
      `Registros: ${formatarNumero(selecionadas.length)}`,
      ...(filtros.movimentacao !== 'saida' ? [`Peças recebidas: ${formatarNumero(entradas)}`] : []),
      ...(filtros.movimentacao !== 'entrada' ? [`Peças distribuídas: ${formatarNumero(saidas)}`] : []),
    ],
    nomeArquivo: `${filtros.movimentacao === 'todas' ? 'movimentacoes' : filtros.movimentacao === 'entrada' ? 'entradas' : 'saidas'}-${sufixo}`,
  };
}

function baixar(conteudo: BlobPart, tipo: string, nomeArquivo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportarCSV(relatorio: Relatorio) {
  const { default: Papa } = await import('papaparse');
  // Ponto e vírgula e BOM para o Excel em português abrir o arquivo corretamente
  const csv = Papa.unparse({ fields: relatorio.colunas, data: relatorio.linhas }, { delimiter: ';' });
  baixar(`\uFEFF${csv}`, 'text/csv;charset=utf-8', `${relatorio.nomeArquivo}.csv`);
}

export async function exportarExcel(relatorio: Relatorio) {
  const XLSX = await import('xlsx');
  const planilha = XLSX.utils.aoa_to_sheet([relatorio.colunas, ...relatorio.linhas]);
  planilha['!cols'] = relatorio.colunas.map((coluna, i) => ({
    wch: Math.max(coluna.length, ...relatorio.linhas.map((linha) => String(linha[i] ?? '').length)) + 2,
  }));
  const pasta = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(pasta, planilha, 'Relatório');
  XLSX.writeFile(pasta, `${relatorio.nomeArquivo}.xlsx`);
}

export async function exportarPDF(relatorio: Relatorio) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const paisagem = relatorio.colunas.length > 6;
  const doc = new jsPDF({ orientation: paisagem ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
  const largura = doc.internal.pageSize.getWidth();
  const azul: [number, number, number] = [26, 54, 93];

  doc.setFillColor(...azul);
  doc.rect(0, 0, largura, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Logística que Aquece', 14, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Campanha de agasalhos · SENAI e Rede Feminina de Garopaba', 14, 19);
  doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, largura - 14, 19, { align: 'right' });

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(relatorio.titulo, 14, 40);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(relatorio.subtitulo, 14, 46);

  autoTable(doc, {
    startY: 52,
    head: [relatorio.colunas],
    body: relatorio.linhas.map((linha) => linha.map((valor) => (typeof valor === 'number' ? formatarNumero(valor) : valor))),
    theme: 'striped',
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2.2 },
    headStyles: { fillColor: azul, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [241, 245, 249] },
    columnStyles: Object.fromEntries(relatorio.numericas.map((i) => [i, { halign: 'right' as const }])),
    margin: { left: 14, right: 14 },
    didDrawPage: () => {
      const altura = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Página ${doc.getNumberOfPages()}`, largura - 14, altura - 8, { align: 'right' });
    },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  let y = finalY + 10;
  if (y > doc.internal.pageSize.getHeight() - 30) {
    doc.addPage();
    y = 20;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('Resumo', 14, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  relatorio.resumo.forEach((linha, i) => doc.text(`• ${linha}`, 14, y + 6 + i * 5));

  doc.save(`${relatorio.nomeArquivo}.pdf`);
}
