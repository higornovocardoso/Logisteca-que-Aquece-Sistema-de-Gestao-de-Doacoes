import { FileSpreadsheet, FileText, FileX, Loader2, Sheet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CabecalhoPagina, Campo, Carregando, EstadoVazio, Selecao } from '../components/ui';
import { useEstoque } from '../contexts/EstoqueContext';
import { useToast } from '../contexts/ToastContext';
import { formatarNumero } from '../lib/format';
import {
  exportarCSV,
  exportarExcel,
  exportarPDF,
  montarRelatorio,
  type FiltroMovimentacao,
  type FiltrosRelatorio,
  type Relatorio,
  type TipoRelatorio,
} from '../lib/relatorios';

const LIMITE_PREVIA = 50;

const FORMATOS = [
  { id: 'pdf', rotulo: 'PDF', icone: FileText, exportar: exportarPDF },
  { id: 'excel', rotulo: 'Excel', icone: FileSpreadsheet, exportar: exportarExcel },
  { id: 'csv', rotulo: 'CSV', icone: Sheet, exportar: exportarCSV },
] as const;

export function Relatorios() {
  const { itens, movimentacoes, carregando } = useEstoque();
  const { avisar } = useToast();
  const [filtros, setFiltros] = useState<FiltrosRelatorio>({ tipo: 'movimentacoes', inicio: '', fim: '', movimentacao: 'todas' });
  const [exportando, setExportando] = useState<string | null>(null);

  const relatorio = useMemo(() => montarRelatorio(filtros, itens, movimentacoes), [filtros, itens, movimentacoes]);
  const periodoInvalido = !!filtros.inicio && !!filtros.fim && filtros.inicio > filtros.fim;

  const alterar = <K extends keyof FiltrosRelatorio>(campo: K, valor: FiltrosRelatorio[K]) =>
    setFiltros((f) => ({ ...f, [campo]: valor }));

  async function exportar(id: string, exportador: (r: Relatorio) => Promise<void>) {
    setExportando(id);
    try {
      await exportador(relatorio);
    } catch {
      avisar('Não foi possível gerar o arquivo.', 'erro');
    } finally {
      setExportando(null);
    }
  }

  if (carregando) return <Carregando />;

  return (
    <>
      <CabecalhoPagina titulo="Relatórios" descricao="Gere relatórios da campanha e exporte em PDF, Excel ou CSV." />

      <section className="card p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Selecao
            rotulo="Relatório"
            value={filtros.tipo}
            onChange={(e) => alterar('tipo', e.target.value as TipoRelatorio)}
          >
            <option value="movimentacoes">Movimentações</option>
            <option value="resumo">Resumo por tipo de peça</option>
            <option value="estoque">Estoque atual</option>
          </Selecao>
          {filtros.tipo === 'movimentacoes' && (
            <Selecao
              rotulo="Movimentação"
              value={filtros.movimentacao}
              onChange={(e) => alterar('movimentacao', e.target.value as FiltroMovimentacao)}
            >
              <option value="todas">Entradas e saídas</option>
              <option value="entrada">Somente entradas</option>
              <option value="saida">Somente saídas</option>
            </Selecao>
          )}
          {filtros.tipo !== 'estoque' && (
            <>
              <Campo rotulo="De" type="date" value={filtros.inicio} onChange={(e) => alterar('inicio', e.target.value)} />
              <Campo
                rotulo="Até"
                type="date"
                value={filtros.fim}
                onChange={(e) => alterar('fim', e.target.value)}
                erro={periodoInvalido ? 'A data final é anterior à inicial' : undefined}
              />
            </>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-5 dark:border-slate-800">
          {FORMATOS.map(({ id, rotulo, icone: Icone, exportar: exportador }) => (
            <button
              key={id}
              type="button"
              className={id === 'pdf' ? 'btn-primary' : 'btn-secondary'}
              disabled={!!exportando || relatorio.linhas.length === 0 || periodoInvalido}
              onClick={() => void exportar(id, exportador)}
            >
              {exportando === id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icone className="h-4 w-4" />}
              Exportar {rotulo}
            </button>
          ))}
        </div>
      </section>

      <section className="card mt-6 overflow-hidden">
        <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-end sm:justify-between dark:border-slate-800">
          <div>
            <h2 className="font-semibold">{relatorio.titulo}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{relatorio.subtitulo}</p>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{relatorio.resumo.join(' · ')}</p>
        </div>

        {relatorio.linhas.length === 0 || periodoInvalido ? (
          <EstadoVazio icone={FileX} titulo="Nenhum dado para os filtros selecionados" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="tabela">
                <thead>
                  <tr>
                    {relatorio.colunas.map((coluna, i) => (
                      <th key={coluna} className={relatorio.numericas.includes(i) ? 'text-right' : ''}>
                        {coluna}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {relatorio.linhas.slice(0, LIMITE_PREVIA).map((linha, i) => (
                    <tr key={i}>
                      {linha.map((valor, j) => (
                        <td key={j} className={relatorio.numericas.includes(j) ? 'text-right tabular-nums' : ''}>
                          {typeof valor === 'number' ? formatarNumero(valor) : valor || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {relatorio.linhas.length > LIMITE_PREVIA && (
              <p className="border-t border-slate-100 px-5 py-3 text-sm text-slate-500 dark:border-slate-800">
                Prévia das primeiras {LIMITE_PREVIA} de {formatarNumero(relatorio.linhas.length)} linhas. O arquivo
                exportado contém todas.
              </p>
            )}
          </>
        )}
      </section>
    </>
  );
}
