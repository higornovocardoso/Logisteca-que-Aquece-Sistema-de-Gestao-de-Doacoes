import { Boxes, Download, PackageMinus, Search, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useRegistro } from '../components/Registro';
import { CabecalhoPagina, EstadoVazio, Esqueleto, Selo } from '../components/ui';
import { useEstoque } from '../contexts/EstoqueContext';
import { format } from 'date-fns';
import { ESTOQUE_BAIXO } from '../lib/estoque';
import { formatarNumero } from '../lib/format';
import { exportarCSV } from '../lib/relatorios';
import { codigoDoItem } from '../lib/sku';
import { GENEROS, TAMANHOS, TIPOS_PECA, type ItemComSaldo } from '../lib/types';
import { useAtalhoDeBusca } from '../lib/useAtalhoDeBusca';

type Situacao = 'disponivel' | 'baixo' | 'esgotado';

function situacaoDo(item: ItemComSaldo): Situacao {
  if (item.saldo === 0) return 'esgotado';
  if (item.saldo <= ESTOQUE_BAIXO) return 'baixo';
  return 'disponivel';
}

const SELOS = {
  disponivel: { cor: 'petroleo', texto: 'Disponível' },
  baixo: { cor: 'trigo', texto: 'Estoque baixo' },
  esgotado: { cor: 'vinho', texto: 'Esgotado' },
} as const;

export function Estoque() {
  const { itens, carregando } = useEstoque();
  const { abrir } = useRegistro();
  const campoDeBusca = useAtalhoDeBusca<HTMLInputElement>();
  const [busca, setBusca] = useState('');
  const [tipo, setTipo] = useState('');
  const [genero, setGenero] = useState('');
  const [situacao, setSituacao] = useState<Situacao | ''>('');

  const comHistorico = useMemo(() => itens.filter((i) => i.entradas > 0), [itens]);
  const contagem = useMemo(
    () => ({
      disponivel: comHistorico.filter((i) => situacaoDo(i) === 'disponivel').length,
      baixo: comHistorico.filter((i) => situacaoDo(i) === 'baixo').length,
      esgotado: comHistorico.filter((i) => situacaoDo(i) === 'esgotado').length,
    }),
    [comHistorico],
  );
  const maiorSaldo = Math.max(1, ...comHistorico.map((i) => i.saldo));

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return comHistorico
      .filter(
        (i) =>
          (!tipo || i.tipo === tipo) &&
          (!genero || i.genero === genero) &&
          (!situacao || situacaoDo(i) === situacao) &&
          (!termo || `${codigoDoItem(i)} ${i.tipo} ${i.genero} ${i.tamanho}`.toLowerCase().includes(termo)),
      )
      .sort(
        (a, b) =>
          TIPOS_PECA.indexOf(a.tipo) - TIPOS_PECA.indexOf(b.tipo) ||
          GENEROS.indexOf(a.genero) - GENEROS.indexOf(b.genero) ||
          TAMANHOS.indexOf(a.tamanho) - TAMANHOS.indexOf(b.tamanho),
      );
  }, [comHistorico, busca, tipo, genero, situacao]);

  const totais = filtrados.reduce(
    (t, i) => ({ entradas: t.entradas + i.entradas, saidas: t.saidas + i.saidas, descartes: t.descartes + i.descartes, saldo: t.saldo + i.saldo }),
    { entradas: 0, saidas: 0, descartes: 0, saldo: 0 },
  );
  const filtrosAtivos = !!(busca || tipo || genero || situacao);

  function exportar() {
    void exportarCSV({
      colunas: ['Código', 'Peça', 'Gênero', 'Tamanho', 'Entradas', 'Saídas', 'Descartes', 'Saldo', 'Situação'],
      linhas: filtrados.map((i) => [codigoDoItem(i), i.tipo, i.genero, i.tamanho, i.entradas, i.saidas, i.descartes, i.saldo, SELOS[situacaoDo(i)].texto]),
      nomeArquivo: `estoque-${format(new Date(), 'yyyy-MM-dd')}`,
    });
  }

  if (carregando) return <Esqueleto />;

  return (
    <>
      <CabecalhoPagina
        titulo="Estoque"
        descricao="Saldo de cada item, calculado a partir das entradas, saídas e descartes."
        acoes={
          <button type="button" className="btn-contorno" onClick={exportar} disabled={filtrados.length === 0}>
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrar por situação">
        {(['disponivel', 'baixo', 'esgotado'] as const).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={situacao === s}
            onClick={() => setSituacao(situacao === s ? '' : s)}
            className={`flex h-8 items-center gap-2 rounded-full border px-3 text-[13px] transition-colors ${
              situacao === s ? 'border-texto bg-texto text-superficie' : 'border-linha bg-superficie hover:border-suave'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${s === 'disponivel' ? 'bg-petroleo' : s === 'baixo' ? 'bg-trigo' : 'bg-vinho'}`} />
            {SELOS[s].texto}
            <span className="numero text-xs opacity-70">{contagem[s]}</span>
          </button>
        ))}
      </div>

      <section className="painel overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-linha p-3">
          <div className="relative min-w-[14rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-suave" />
            <input
              ref={campoDeBusca}
              className="campo pl-9 sm:pr-9"
              placeholder="Buscar por código ou peça…"
              aria-label="Buscar item"
              aria-keyshortcuts="/"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-linha px-1.5 font-mono text-[11px] text-suave sm:block" title="Atalho: tecla /">/</kbd>
          </div>
          <select className="campo w-auto" aria-label="Tipo de peça" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todos os tipos</option>
            {TIPOS_PECA.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select className="campo w-auto" aria-label="Gênero" value={genero} onChange={(e) => setGenero(e.target.value)}>
            <option value="">Todos os gêneros</option>
            {GENEROS.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
          {filtrosAtivos && (
            <button
              type="button"
              className="btn h-9 px-2.5 text-suave hover:text-texto"
              onClick={() => {
                setBusca('');
                setTipo('');
                setGenero('');
                setSituacao('');
              }}
            >
              <X className="h-4 w-4" />
              Limpar
            </button>
          )}
        </div>

        {filtrados.length === 0 ? (
          <EstadoVazio
            icone={Boxes}
            titulo={filtrosAtivos ? 'Nenhum item com esses filtros' : 'O estoque está vazio'}
            texto={filtrosAtivos ? 'Ajuste ou limpe os filtros.' : 'Os itens aparecem aqui assim que a primeira entrada for registrada.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Peça</th>
                  <th>Tam.</th>
                  <th className="text-right">Entradas</th>
                  <th className="text-right">Saídas</th>
                  <th className="text-right">Descartes</th>
                  <th className="min-w-[11rem]">Saldo</th>
                  <th>Situação</th>
                  <th className="w-20">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((item) => {
                  const selo = SELOS[situacaoDo(item)];
                  return (
                    <tr key={item.id} className="group">
                      <td className="sku whitespace-nowrap">{codigoDoItem(item)}</td>
                      <td className="whitespace-nowrap">
                        {item.tipo} <span className="text-suave">{item.genero.toLowerCase()}</span>
                      </td>
                      <td>
                        <span className="tag-tamanho">{item.tamanho}</span>
                      </td>
                      <td className="numero text-right text-suave">{formatarNumero(item.entradas)}</td>
                      <td className="numero text-right text-suave">{formatarNumero(item.saidas)}</td>
                      <td className="numero text-right text-suave">{formatarNumero(item.descartes)}</td>
                      <td>
                        <div className="flex items-center gap-3">
                          <span className="numero w-8 text-right font-medium">{formatarNumero(item.saldo)}</span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-fundo">
                            <div
                              className={`h-full origin-left animate-crescer rounded-full ${situacaoDo(item) === 'disponivel' ? 'bg-petroleo' : 'bg-trigo'}`}
                              style={{ width: `${(item.saldo / maiorSaldo) * 100}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        <Selo cor={selo.cor}>{selo.texto}</Selo>
                      </td>
                      <td>
                        {item.saldo > 0 && (
                          <div className="flex justify-end gap-0.5 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                            <button type="button" className="btn-icone" title="Registrar saída" aria-label={`Registrar saída de ${codigoDoItem(item)}`} onClick={() => abrir('saida', item.id)}>
                              <PackageMinus className="h-4 w-4" />
                            </button>
                            <button type="button" className="btn-icone" title="Registrar descarte" aria-label={`Registrar descarte de ${codigoDoItem(item)}`} onClick={() => abrir('descarte', item.id)}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-linha bg-fundo/60 text-[13px] font-medium">
                  <td className="px-4 py-2.5" colSpan={3}>
                    Total · <span className="numero">{filtrados.length}</span> itens
                  </td>
                  <td className="numero px-4 py-2.5 text-right">{formatarNumero(totais.entradas)}</td>
                  <td className="numero px-4 py-2.5 text-right">{formatarNumero(totais.saidas)}</td>
                  <td className="numero px-4 py-2.5 text-right">{formatarNumero(totais.descartes)}</td>
                  <td className="numero px-4 py-2.5">
                    <span className="inline-block w-8 text-right">{formatarNumero(totais.saldo)}</span>
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
