import { Search, Trash2, type LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useEstoque } from '../contexts/EstoqueContext';
import { useToast } from '../contexts/ToastContext';
import { formatarData, formatarNumero } from '../lib/format';
import { descreverItem, TIPOS_PECA, type MovimentacaoDetalhada, type TipoMovimentacao } from '../lib/types';
import { Confirmacao, EstadoVazio } from './ui';

const POR_PAGINA = 15;

export function TabelaMovimentacoes({
  tipo,
  iconeVazio,
  textoVazio,
}: {
  tipo: TipoMovimentacao;
  iconeVazio: LucideIcon;
  textoVazio: string;
}) {
  const { movimentacoes, excluirMovimentacao } = useEstoque();
  const { avisar } = useToast();
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [pagina, setPagina] = useState(1);
  const [excluindo, setExcluindo] = useState<MovimentacaoDetalhada | null>(null);
  const [processando, setProcessando] = useState(false);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return movimentacoes.filter(
      (mov) =>
        mov.tipo === tipo &&
        (!filtroTipo || mov.item.tipo === filtroTipo) &&
        (!inicio || mov.data >= inicio) &&
        (!fim || mov.data <= fim) &&
        (!termo ||
          descreverItem(mov.item).toLowerCase().includes(termo) ||
          mov.responsavel.toLowerCase().includes(termo) ||
          mov.observacao?.toLowerCase().includes(termo)),
    );
  }, [movimentacoes, tipo, busca, filtroTipo, inicio, fim]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = filtradas.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);
  const totalPecas = filtradas.reduce((total, mov) => total + mov.quantidade, 0);

  const filtrar = <T,>(setter: (valor: T) => void) => (valor: T) => {
    setter(valor);
    setPagina(1);
  };

  async function confirmarExclusao() {
    if (!excluindo) return;
    setProcessando(true);
    try {
      await excluirMovimentacao(excluindo.id);
      avisar(`${tipo === 'entrada' ? 'Entrada' : 'Saída'} excluída.`);
      setExcluindo(null);
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Não foi possível excluir.', 'erro');
    } finally {
      setProcessando(false);
    }
  }

  return (
    <section className="card overflow-hidden">
      <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Buscar peça, responsável…"
            aria-label="Buscar"
            value={busca}
            onChange={(e) => filtrar(setBusca)(e.target.value)}
          />
        </div>
        <select
          className="input"
          aria-label="Filtrar por tipo de peça"
          value={filtroTipo}
          onChange={(e) => filtrar(setFiltroTipo)(e.target.value)}
        >
          <option value="">Todos os tipos</option>
          {TIPOS_PECA.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <input
          type="date"
          className="input"
          aria-label="Data inicial"
          value={inicio}
          onChange={(e) => filtrar(setInicio)(e.target.value)}
        />
        <input
          type="date"
          className="input"
          aria-label="Data final"
          value={fim}
          onChange={(e) => filtrar(setFim)(e.target.value)}
        />
      </div>

      {filtradas.length === 0 ? (
        <EstadoVazio icone={iconeVazio} titulo="Nenhum registro encontrado" texto={textoVazio} />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Peça</th>
                  <th>Tamanho</th>
                  <th>Público</th>
                  <th className="text-right">Qtd.</th>
                  <th>Responsável</th>
                  <th>Observação</th>
                  <th className="sr-only">Ações</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((mov) => (
                  <tr key={mov.id}>
                    <td className="whitespace-nowrap tabular-nums">{formatarData(mov.data)}</td>
                    <td className="font-medium">{mov.item.tipo}</td>
                    <td>{mov.item.tamanho}</td>
                    <td>{mov.item.publico}</td>
                    <td className="text-right font-semibold tabular-nums">{formatarNumero(mov.quantidade)}</td>
                    <td className="whitespace-nowrap">{mov.responsavel}</td>
                    <td className="max-w-[16rem] truncate text-slate-500 dark:text-slate-400" title={mov.observacao ?? ''}>
                      {mov.observacao || '—'}
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="btn-ghost text-slate-400 hover:text-rose-600"
                        onClick={() => setExcluindo(mov)}
                        aria-label={`Excluir registro de ${descreverItem(mov.item)} em ${formatarData(mov.data)}`}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500 sm:flex-row dark:border-slate-800">
            <span>
              {formatarNumero(filtradas.length)} registro(s) · {formatarNumero(totalPecas)} peça(s)
            </span>
            {totalPaginas > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-secondary px-3 py-1.5"
                  disabled={paginaAtual === 1}
                  onClick={() => setPagina(paginaAtual - 1)}
                >
                  Anterior
                </button>
                <span className="tabular-nums">
                  {paginaAtual} / {totalPaginas}
                </span>
                <button
                  type="button"
                  className="btn-secondary px-3 py-1.5"
                  disabled={paginaAtual === totalPaginas}
                  onClick={() => setPagina(paginaAtual + 1)}
                >
                  Próxima
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <Confirmacao
        aberto={!!excluindo}
        titulo={`Excluir ${tipo === 'entrada' ? 'entrada' : 'saída'}`}
        mensagem={
          excluindo && (
            <>
              Deseja excluir o registro de <strong>{excluindo.quantidade}</strong> peça(s) de{' '}
              <strong>{descreverItem(excluindo.item)}</strong> em {formatarData(excluindo.data)}? O estoque será
              recalculado.
            </>
          )
        }
        textoConfirmar="Excluir"
        processando={processando}
        aoConfirmar={() => void confirmarExclusao()}
        aoCancelar={() => setExcluindo(null)}
      />
    </section>
  );
}
