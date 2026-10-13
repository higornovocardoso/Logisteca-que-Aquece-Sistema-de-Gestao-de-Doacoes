import { Boxes, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CabecalhoPagina, Carregando, EstadoVazio, Selo } from '../components/ui';
import { useEstoque } from '../contexts/EstoqueContext';
import { formatarNumero } from '../lib/format';
import { PUBLICOS, TAMANHOS, TIPOS_PECA, type ItemComSaldo } from '../lib/types';

type Situacao = '' | 'disponivel' | 'baixo' | 'esgotado';

function situacaoDo(item: ItemComSaldo): Exclude<Situacao, ''> {
  if (item.saldo === 0) return 'esgotado';
  if (item.saldo <= 3) return 'baixo';
  return 'disponivel';
}

const SELOS = {
  disponivel: { cor: 'verde', texto: 'Disponível' },
  baixo: { cor: 'amarelo', texto: 'Estoque baixo' },
  esgotado: { cor: 'vermelho', texto: 'Esgotado' },
} as const;

export function Estoque() {
  const { itens, carregando } = useEstoque();
  const [busca, setBusca] = useState('');
  const [tipo, setTipo] = useState('');
  const [publico, setPublico] = useState('');
  const [situacao, setSituacao] = useState<Situacao>('');

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return itens
      .filter(
        (item) =>
          (!tipo || item.tipo === tipo) &&
          (!publico || item.publico === publico) &&
          (!situacao || situacaoDo(item) === situacao) &&
          (!termo || `${item.tipo} ${item.publico} ${item.tamanho}`.toLowerCase().includes(termo)),
      )
      .sort(
        (a, b) =>
          TIPOS_PECA.indexOf(a.tipo) - TIPOS_PECA.indexOf(b.tipo) ||
          PUBLICOS.indexOf(a.publico) - PUBLICOS.indexOf(b.publico) ||
          TAMANHOS.indexOf(a.tamanho) - TAMANHOS.indexOf(b.tamanho),
      );
  }, [itens, busca, tipo, publico, situacao]);

  const totais = filtrados.reduce(
    (t, item) => ({ entradas: t.entradas + item.entradas, saidas: t.saidas + item.saidas, saldo: t.saldo + item.saldo }),
    { entradas: 0, saidas: 0, saldo: 0 },
  );

  if (carregando) return <Carregando />;

  return (
    <>
      <CabecalhoPagina titulo="Estoque" descricao="Saldo de cada peça, calculado a partir das entradas e saídas." />

      <section className="card overflow-hidden">
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Buscar peça…"
              aria-label="Buscar peça"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <select className="input" aria-label="Filtrar por tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todos os tipos</option>
            {TIPOS_PECA.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select
            className="input"
            aria-label="Filtrar por público"
            value={publico}
            onChange={(e) => setPublico(e.target.value)}
          >
            <option value="">Todos os públicos</option>
            {PUBLICOS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <select
            className="input"
            aria-label="Filtrar por situação"
            value={situacao}
            onChange={(e) => setSituacao(e.target.value as Situacao)}
          >
            <option value="">Todas as situações</option>
            <option value="disponivel">Disponível</option>
            <option value="baixo">Estoque baixo</option>
            <option value="esgotado">Esgotado</option>
          </select>
        </div>

        {filtrados.length === 0 ? (
          <EstadoVazio
            icone={Boxes}
            titulo="Nenhum item encontrado"
            texto="Os itens aparecem aqui automaticamente quando uma entrada é registrada."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Peça</th>
                  <th>Tamanho</th>
                  <th>Público</th>
                  <th className="text-right">Entradas</th>
                  <th className="text-right">Saídas</th>
                  <th className="text-right">Saldo</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((item) => {
                  const selo = SELOS[situacaoDo(item)];
                  return (
                    <tr key={item.id}>
                      <td className="font-medium">{item.tipo}</td>
                      <td>{item.tamanho}</td>
                      <td>{item.publico}</td>
                      <td className="text-right tabular-nums">{formatarNumero(item.entradas)}</td>
                      <td className="text-right tabular-nums">{formatarNumero(item.saidas)}</td>
                      <td className="text-right text-base font-bold tabular-nums">{formatarNumero(item.saldo)}</td>
                      <td>
                        <Selo cor={selo.cor}>{selo.texto}</Selo>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-semibold dark:bg-slate-800/60">
                  <td className="px-4 py-3" colSpan={3}>
                    Total ({filtrados.length} itens)
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatarNumero(totais.entradas)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatarNumero(totais.saidas)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatarNumero(totais.saldo)}</td>
                  <td className="px-4 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
