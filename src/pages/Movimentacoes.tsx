import { Download, PackageMinus, PackagePlus, Plus, Search, Trash2, X, type LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useRegistro } from '../components/Registro';
import { CabecalhoPagina, Confirmacao, EstadoVazio, Esqueleto } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useEstoque } from '../contexts/EstoqueContext';
import { useToast } from '../contexts/ToastContext';
import { formatarData, formatarNumero } from '../lib/format';
import { exportarCSV } from '../lib/relatorios';
import { codigoDoItem } from '../lib/sku';
import { descreverItem, GENEROS, TIPOS_PECA, type MovimentacaoDetalhada, type TipoMovimentacao } from '../lib/types';
import { useAtalhoDeBusca } from '../lib/useAtalhoDeBusca';

const POR_PAGINA = 20;

const CONFIG: Record<
  TipoMovimentacao,
  { titulo: string; descricao: string; acao: string; vazio: string; icone: LucideIcon; pessoa: string; extra?: { rotulo: string; valor(m: MovimentacaoDetalhada): string } }
> = {
  entrada: {
    titulo: 'Entradas',
    descricao: 'Doações recebidas pela campanha.',
    acao: 'Registrar entrada',
    vazio: 'Registre as doações recebidas para que entrem no estoque.',
    icone: PackagePlus,
    pessoa: 'Recebido por',
    extra: { rotulo: 'Fornecedor', valor: (m) => m.fornecedor ?? '—' },
  },
  saida: {
    titulo: 'Saídas',
    descricao: 'Peças retiradas do estoque para distribuição.',
    acao: 'Registrar saída',
    vazio: 'Registre as retiradas de peças para distribuição.',
    icone: PackageMinus,
    pessoa: 'Retirado por',
  },
  descarte: {
    titulo: 'Descartes',
    descricao: 'Peças sem condições de uso, retiradas do estoque na triagem.',
    acao: 'Registrar descarte',
    vazio: 'Nenhuma peça descartada até agora.',
    icone: Trash2,
    pessoa: 'Responsável',
    extra: { rotulo: 'Motivo', valor: (m) => m.motivo ?? '—' },
  },
};

export function Movimentacoes({ tipo }: { tipo: TipoMovimentacao }) {
  const config = CONFIG[tipo];
  const campoDeBusca = useAtalhoDeBusca<HTMLInputElement>();
  const { movimentacoes, excluirMovimentacao, carregando } = useEstoque();
  const { ehAdministrador } = useAuth();
  const { abrir } = useRegistro();
  const { avisar } = useToast();

  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroGenero, setFiltroGenero] = useState('');
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
        (!filtroGenero || mov.item.genero === filtroGenero) &&
        (!inicio || mov.data >= inicio) &&
        (!fim || mov.data <= fim) &&
        (!termo ||
          [codigoDoItem(mov.item), descreverItem(mov.item), mov.responsavel, mov.fornecedor, mov.motivo, mov.observacao]
            .filter(Boolean)
            .some((texto) => texto!.toLowerCase().includes(termo))),
    );
  }, [movimentacoes, tipo, busca, filtroTipo, filtroGenero, inicio, fim]);

  const filtrosAtivos = !!(busca || filtroTipo || filtroGenero || inicio || fim);
  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = filtradas.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);
  const totalPecas = filtradas.reduce((t, m) => t + m.quantidade, 0);

  const filtrar = (setter: (v: string) => void) => (valor: string) => {
    setter(valor);
    setPagina(1);
  };

  function limparFiltros() {
    [setBusca, setFiltroTipo, setFiltroGenero, setInicio, setFim].forEach((s) => s(''));
    setPagina(1);
  }

  function exportar() {
    void exportarCSV({
      colunas: ['Data', 'Código', 'Peça', 'Tamanho', 'Gênero', 'Quantidade', ...(config.extra ? [config.extra.rotulo] : []), config.pessoa, 'Observação'],
      linhas: filtradas.map((m) => [
        formatarData(m.data),
        codigoDoItem(m.item),
        m.item.tipo,
        m.item.tamanho,
        m.item.genero,
        m.quantidade,
        ...(config.extra ? [config.extra.valor(m)] : []),
        m.responsavel,
        m.observacao ?? '',
      ]),
      nomeArquivo: `${config.titulo.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')}-${new Date().toISOString().slice(0, 10)}`,
    });
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    setProcessando(true);
    try {
      await excluirMovimentacao(excluindo.id);
      avisar('Registro excluído. O estoque foi recalculado.');
      setExcluindo(null);
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Não foi possível excluir o registro.', 'erro');
    } finally {
      setProcessando(false);
    }
  }

  return (
    <>
      <CabecalhoPagina
        titulo={config.titulo}
        descricao={config.descricao}
        acoes={
          <>
            <button type="button" className="btn-contorno" onClick={exportar} disabled={filtradas.length === 0}>
              <Download className="h-4 w-4" />
              Exportar CSV
            </button>
            <button type="button" className="btn-brasa" onClick={() => abrir(tipo)}>
              <Plus className="h-4 w-4" />
              {config.acao}
            </button>
          </>
        }
      />

      {carregando ? (
        <Esqueleto cabecalho={false} />
      ) : (
        <section className="painel overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-linha p-3">
            <div className="relative min-w-[14rem] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-suave" />
              <input
                ref={campoDeBusca}
                className="campo pl-9 sm:pr-9"
                placeholder={`Buscar por código, peça, ${config.extra?.rotulo.toLowerCase() ?? 'responsável'}…`}
                aria-label="Buscar"
                aria-keyshortcuts="/"
                value={busca}
                onChange={(e) => filtrar(setBusca)(e.target.value)}
              />
              <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-linha px-1.5 font-mono text-[11px] text-suave sm:block" title="Atalho: tecla /">/</kbd>
            </div>
            <select className="campo w-auto" aria-label="Tipo de peça" value={filtroTipo} onChange={(e) => filtrar(setFiltroTipo)(e.target.value)}>
              <option value="">Todos os tipos</option>
              {TIPOS_PECA.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <select className="campo w-auto" aria-label="Gênero" value={filtroGenero} onChange={(e) => filtrar(setFiltroGenero)(e.target.value)}>
              <option value="">Todos os gêneros</option>
              {GENEROS.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
            <div className="flex items-center gap-1.5">
              <input type="date" className="campo w-auto" aria-label="De" value={inicio} onChange={(e) => filtrar(setInicio)(e.target.value)} />
              <span className="text-suave">–</span>
              <input type="date" className="campo w-auto" aria-label="Até" value={fim} onChange={(e) => filtrar(setFim)(e.target.value)} />
            </div>
            {filtrosAtivos && (
              <button type="button" className="btn h-9 px-2.5 text-suave hover:text-texto" onClick={limparFiltros}>
                <X className="h-4 w-4" />
                Limpar
              </button>
            )}
          </div>

          {filtradas.length === 0 ? (
            <EstadoVazio
              icone={config.icone}
              titulo={filtrosAtivos ? 'Nenhum registro com esses filtros' : `Nenhum registro de ${config.titulo.toLowerCase()}`}
              texto={filtrosAtivos ? 'Ajuste ou limpe os filtros para ver mais registros.' : config.vazio}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Código</th>
                      <th>Peça</th>
                      <th>Tam.</th>
                      <th className="text-right">Qtd.</th>
                      {config.extra && <th>{config.extra.rotulo}</th>}
                      <th>{config.pessoa}</th>
                      <th>Observação</th>
                      {ehAdministrador && <th className="w-10"><span className="sr-only">Ações</span></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {visiveis.map((mov) => (
                      <tr key={mov.id}>
                        <td className="numero whitespace-nowrap text-[13px]">{formatarData(mov.data)}</td>
                        <td className="sku whitespace-nowrap">{codigoDoItem(mov.item)}</td>
                        <td className="whitespace-nowrap">
                          {mov.item.tipo} <span className="text-suave">{mov.item.genero.toLowerCase()}</span>
                        </td>
                        <td>
                          <span className="tag-tamanho">{mov.item.tamanho}</span>
                        </td>
                        <td className="numero text-right font-medium">{formatarNumero(mov.quantidade)}</td>
                        {config.extra && <td className="whitespace-nowrap">{config.extra.valor(mov)}</td>}
                        <td className="whitespace-nowrap">{mov.responsavel}</td>
                        <td className="max-w-[16rem] truncate text-suave" title={mov.observacao ?? ''}>
                          {mov.observacao || '—'}
                        </td>
                        {ehAdministrador && (
                          <td className="text-right">
                            <button
                              type="button"
                              className="btn-icone hover:text-vinho"
                              onClick={() => setExcluindo(mov)}
                              aria-label={`Excluir registro de ${codigoDoItem(mov.item)} em ${formatarData(mov.data)}`}
                              title="Excluir registro"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <footer className="flex flex-col items-center justify-between gap-3 border-t border-linha px-4 py-2.5 text-[13px] text-suave sm:flex-row">
                <span>
                  <span className="numero text-texto">{formatarNumero(filtradas.length)}</span> registros ·{' '}
                  <span className="numero text-texto">{formatarNumero(totalPecas)}</span> peças
                </span>
                {totalPaginas > 1 && (
                  <div className="flex items-center gap-2">
                    <button type="button" className="btn-contorno h-8 px-3" disabled={paginaAtual === 1} onClick={() => setPagina(paginaAtual - 1)}>
                      Anterior
                    </button>
                    <span className="numero px-1">
                      {paginaAtual} / {totalPaginas}
                    </span>
                    <button type="button" className="btn-contorno h-8 px-3" disabled={paginaAtual === totalPaginas} onClick={() => setPagina(paginaAtual + 1)}>
                      Próxima
                    </button>
                  </div>
                )}
              </footer>
            </>
          )}
        </section>
      )}

      <Confirmacao
        aberto={!!excluindo}
        titulo="Excluir registro"
        textoConfirmar="Excluir"
        processando={processando}
        aoConfirmar={() => void confirmarExclusao()}
        aoCancelar={() => setExcluindo(null)}
        mensagem={
          excluindo && (
            <>
              O registro de <strong className="text-texto">{excluindo.quantidade} × {descreverItem(excluindo.item)}</strong> de{' '}
              {formatarData(excluindo.data)} será excluído e o estoque, recalculado. Esta ação fica no registro de atividades.
            </>
          )
        }
      />
    </>
  );
}
