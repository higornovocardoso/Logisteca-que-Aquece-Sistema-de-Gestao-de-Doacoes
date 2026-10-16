import { FileSpreadsheet, FileText, FileX, Loader2, Sheet, type LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CabecalhoPagina, Campo, EstadoVazio, Esqueleto, Selecao } from '../components/ui';
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

const TIPOS: Array<{ id: TipoRelatorio; titulo: string; descricao: string }> = [
  { id: 'movimentacoes', titulo: 'Movimentações', descricao: 'Entradas, saídas e descartes, registro a registro' },
  { id: 'resumo', titulo: 'Resumo por tipo', descricao: 'Arrecadado, distribuído e descartado de cada peça' },
  { id: 'estoque', titulo: 'Posição de estoque', descricao: 'Saldo atual de cada item' },
  { id: 'fornecedores', titulo: 'Por fornecedor', descricao: 'Quanto cada origem doou' },
];

const FORMATOS: Array<{ id: string; rotulo: string; icone: LucideIcon; exportar(r: Relatorio): Promise<void> }> = [
  { id: 'pdf', rotulo: 'PDF', icone: FileText, exportar: exportarPDF },
  { id: 'excel', rotulo: 'Excel', icone: FileSpreadsheet, exportar: exportarExcel },
  { id: 'csv', rotulo: 'CSV', icone: Sheet, exportar: exportarCSV },
];

export function Relatorios() {
  const { itens, movimentacoes, carregando } = useEstoque();
  const { avisar } = useToast();
  const [filtros, setFiltros] = useState<FiltrosRelatorio>({ tipo: 'movimentacoes', inicio: '', fim: '', movimentacao: 'todas' });
  const [exportando, setExportando] = useState<string | null>(null);

  const relatorio = useMemo(() => montarRelatorio(filtros, itens, movimentacoes), [filtros, itens, movimentacoes]);
  const periodoInvalido = !!filtros.inicio && !!filtros.fim && filtros.inicio > filtros.fim;
  const alterar = <K extends keyof FiltrosRelatorio>(campo: K, valor: FiltrosRelatorio[K]) => setFiltros((f) => ({ ...f, [campo]: valor }));

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

  if (carregando) return <Esqueleto />;

  return (
    <>
      <CabecalhoPagina titulo="Relatórios" descricao="Gere relatórios da campanha e exporte em PDF, Excel ou CSV." />

      <div className="grid gap-4 lg:grid-cols-[17rem_1fr]">
        <aside className="space-y-4">
          <fieldset className="painel p-1.5">
            <legend className="sr-only">Tipo de relatório</legend>
            {TIPOS.map((t) => (
              <label
                key={t.id}
                className={`flex cursor-pointer gap-3 rounded-lg px-3 py-2.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-petroleo/60 ${
                  filtros.tipo === t.id ? 'bg-fundo' : 'hover:bg-fundo/60'
                }`}
              >
                <input type="radio" name="tipo-relatorio" className="sr-only" checked={filtros.tipo === t.id} onChange={() => alterar('tipo', t.id)} />
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${filtros.tipo === t.id ? 'bg-brasa' : 'bg-linha'}`} />
                <span>
                  <span className="block text-[13.5px] font-medium">{t.titulo}</span>
                  <span className="block text-xs text-suave">{t.descricao}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="painel space-y-4 p-4">
            {filtros.tipo === 'movimentacoes' && (
              <Selecao rotulo="Movimentação" value={filtros.movimentacao} onChange={(e) => alterar('movimentacao', e.target.value as FiltroMovimentacao)}>
                <option value="todas">Todas</option>
                <option value="entrada">Somente entradas</option>
                <option value="saida">Somente saídas</option>
                <option value="descarte">Somente descartes</option>
              </Selecao>
            )}
            {filtros.tipo !== 'estoque' ? (
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
            ) : (
              <p className="text-xs text-suave">A posição de estoque mostra sempre o saldo atual.</p>
            )}
          </div>
        </aside>

        <section className="painel min-w-0 overflow-hidden">
          <header className="flex flex-col gap-3 border-b border-linha px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-[15px] font-semibold">{relatorio.titulo}</h2>
              <p className="mt-0.5 text-xs text-suave">
                {relatorio.subtitulo} · {relatorio.resumo.join(' · ')}
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              {FORMATOS.map(({ id, rotulo, icone: Icone, exportar: exportador }) => (
                <button
                  key={id}
                  type="button"
                  className={id === 'pdf' ? 'btn-brasa' : 'btn-contorno'}
                  disabled={!!exportando || relatorio.linhas.length === 0 || periodoInvalido}
                  onClick={() => void exportar(id, exportador)}
                >
                  {exportando === id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icone className="h-4 w-4" />}
                  {rotulo}
                </button>
              ))}
            </div>
          </header>

          {relatorio.linhas.length === 0 || periodoInvalido ? (
            <EstadoVazio icone={FileX} titulo="Nenhum dado para estes filtros" texto="Ajuste o período ou escolha outro relatório." />
          ) : (
            <>
              <div className="max-h-[60vh] overflow-auto">
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
                          <td key={j} className={`whitespace-nowrap ${relatorio.numericas.includes(j) ? 'numero text-right' : ''}`}>
                            {typeof valor === 'number' ? formatarNumero(valor) : valor || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {relatorio.linhas.length > LIMITE_PREVIA && (
                <p className="border-t border-linha px-5 py-2.5 text-xs text-suave">
                  Prévia das primeiras {LIMITE_PREVIA} de {formatarNumero(relatorio.linhas.length)} linhas. Os arquivos exportados trazem todas.
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}
