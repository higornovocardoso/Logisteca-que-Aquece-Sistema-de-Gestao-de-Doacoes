import { addWeeks, differenceInCalendarWeeks, format, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, Boxes, PackageOpen, Shirt } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Link } from 'react-router-dom';
import { CabecalhoPagina, Carregando, CartaoEstatistica, EstadoVazio, Selo } from '../components/ui';
import { useEstoque } from '../contexts/EstoqueContext';
import { useTheme } from '../contexts/ThemeContext';
import { somar } from '../lib/estoque';
import { formatarData, formatarNumero } from '../lib/format';
import { CORES, coresDoTema } from '../lib/graficos';
import { descreverItem, PUBLICOS } from '../lib/types';

const ESTOQUE_BAIXO = 3;
/** Lacunas de até 8 semanas sem movimentação aparecem como zero; lacunas maiores são omitidas do gráfico. */
const MAIOR_LACUNA_PREENCHIDA = 8;

function Painel({ titulo, children, className = '' }: { titulo: string; children: ReactNode; className?: string }) {
  return (
    <section className={`card p-5 ${className}`}>
      <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">{titulo}</h2>
      {children}
    </section>
  );
}

export function Dashboard() {
  const { itens, movimentacoes, carregando, erro } = useEstoque();
  const { tema } = useTheme();
  const cores = coresDoTema(tema === 'escuro');

  const resumo = useMemo(() => {
    const arrecadado = somar(movimentacoes, 'entrada');
    const distribuido = somar(movimentacoes, 'saida');
    const emEstoque = itens.reduce((total, item) => total + item.saldo, 0);
    const baixos = itens
      .filter((item) => item.entradas > 0 && item.saldo <= ESTOQUE_BAIXO)
      .sort((a, b) => a.saldo - b.saldo);
    return { arrecadado, distribuido, emEstoque, baixos };
  }, [itens, movimentacoes]);

  const porSemana = useMemo(() => {
    const semanas = new Map<number, { entradas: number; saidas: number }>();
    for (const mov of movimentacoes) {
      const chave = startOfWeek(new Date(`${mov.data}T12:00:00`), { locale: ptBR }).getTime();
      const total = semanas.get(chave) ?? { entradas: 0, saidas: 0 };
      if (mov.tipo === 'entrada') total.entradas += mov.quantidade;
      else total.saidas += mov.quantidade;
      semanas.set(chave, total);
    }

    const ordenadas = [...semanas.keys()].sort((a, b) => a - b);
    const serie: Array<{ semana: Date; entradas: number; saidas: number }> = [];
    ordenadas.forEach((chave, i) => {
      const semana = new Date(chave);
      if (i > 0) {
        const anterior = new Date(ordenadas[i - 1]);
        const lacuna = differenceInCalendarWeeks(semana, anterior, { locale: ptBR });
        if (lacuna <= MAIOR_LACUNA_PREENCHIDA) {
          for (let k = 1; k < lacuna; k++) serie.push({ semana: addWeeks(anterior, k), entradas: 0, saidas: 0 });
        }
      }
      serie.push({ semana, ...semanas.get(chave)! });
    });

    const variosAnos = serie.length > 0 && serie[0].semana.getFullYear() !== serie.at(-1)!.semana.getFullYear();
    return serie.map((s) => ({ ...s, rotulo: format(s.semana, variosAnos ? 'dd/MM/yy' : 'dd/MM') }));
  }, [movimentacoes]);

  const estoquePorTipo = useMemo(() => {
    const tipos = new Map<string, number>();
    for (const item of itens) {
      if (item.saldo > 0) tipos.set(item.tipo, (tipos.get(item.tipo) ?? 0) + item.saldo);
    }
    return [...tipos.entries()].sort(([, a], [, b]) => b - a);
  }, [itens]);

  const distribuidoPorPublico = useMemo(
    () => PUBLICOS.map((publico) => itens.filter((i) => i.publico === publico).reduce((t, i) => t + i.saidas, 0)),
    [itens],
  );

  if (carregando) return <Carregando />;
  if (erro) return <EstadoVazio icone={AlertTriangle} titulo="Erro ao carregar os dados" texto={erro} />;

  const eixos = {
    ticks: { color: cores.texto },
    grid: { color: cores.grade },
    border: { display: false },
  };

  return (
    <>
      <CabecalhoPagina
        titulo="Dashboard"
        descricao="Visão geral das doações arrecadadas e distribuídas na campanha."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CartaoEstatistica titulo="Peças arrecadadas" valor={formatarNumero(resumo.arrecadado)} icone={ArrowDownCircle} cor="azul" detalhe="Total de entradas" />
        <CartaoEstatistica titulo="Peças distribuídas" valor={formatarNumero(resumo.distribuido)} icone={ArrowUpCircle} cor="laranja" detalhe="Total de saídas" />
        <CartaoEstatistica titulo="Em estoque" valor={formatarNumero(resumo.emEstoque)} icone={Boxes} cor="verde" detalhe="Disponíveis para doação" />
        <CartaoEstatistica
          titulo="Itens cadastrados"
          valor={formatarNumero(itens.length)}
          icone={Shirt}
          cor="roxo"
          detalhe="Combinações de peça, tamanho e público"
        />
      </div>

      {movimentacoes.length === 0 ? (
        <div className="card mt-6">
          <EstadoVazio
            icone={PackageOpen}
            titulo="Nenhuma movimentação ainda"
            texto="Registre a primeira doação recebida na tela de Entradas para ver os gráficos."
          />
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            <Painel titulo="Entradas e saídas por semana" className="xl:col-span-2">
              <div className="h-72">
                <Line
                  data={{
                    labels: porSemana.map((s) => s.rotulo),
                    datasets: [
                      {
                        label: 'Entradas',
                        data: porSemana.map((s) => s.entradas),
                        borderColor: CORES.entrada,
                        backgroundColor: `${CORES.entrada}22`,
                        fill: true,
                        tension: 0.35,
                      },
                      {
                        label: 'Saídas',
                        data: porSemana.map((s) => s.saidas),
                        borderColor: CORES.saida,
                        backgroundColor: `${CORES.saida}22`,
                        fill: true,
                        tension: 0.35,
                      },
                    ],
                  }}
                  options={{
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                      legend: { labels: { color: cores.texto, usePointStyle: true } },
                      tooltip: {
                        callbacks: { title: ([ponto]) => `Semana de ${format(porSemana[ponto.dataIndex].semana, 'dd/MM/yyyy')}` },
                      },
                    },
                    scales: { x: eixos, y: { ...eixos, beginAtZero: true } },
                  }}
                />
              </div>
            </Painel>

            <Painel titulo="Estoque atual por tipo de peça">
              {estoquePorTipo.length === 0 ? (
                <EstadoVazio icone={Boxes} titulo="Estoque vazio" />
              ) : (
                <div className="h-72">
                  <Doughnut
                    data={{
                      labels: estoquePorTipo.map(([tipo]) => tipo),
                      datasets: [
                        {
                          data: estoquePorTipo.map(([, qtd]) => qtd),
                          backgroundColor: CORES.paleta,
                          borderColor: cores.borda,
                          borderWidth: 2,
                        },
                      ],
                    }}
                    options={{
                      maintainAspectRatio: false,
                      cutout: '62%',
                      plugins: {
                        legend: { position: 'bottom', labels: { color: cores.texto, boxWidth: 10, padding: 10, font: { size: 11 } } },
                      },
                    }}
                  />
                </div>
              )}
            </Painel>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <Painel titulo="Peças distribuídas por público">
              <div className="h-64">
                <Bar
                  data={{
                    labels: [...PUBLICOS],
                    datasets: [
                      {
                        label: 'Peças distribuídas',
                        data: distribuidoPorPublico,
                        backgroundColor: [CORES.paleta[0], CORES.paleta[1], CORES.paleta[3], CORES.saida],
                        borderRadius: 8,
                        maxBarThickness: 48,
                      },
                    ],
                  }}
                  options={{
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { x: { ...eixos, grid: { display: false } }, y: { ...eixos, beginAtZero: true } },
                  }}
                />
              </div>
            </Painel>

            <Painel titulo="Últimas movimentações">
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {movimentacoes.slice(0, 6).map((mov) => (
                  <li key={mov.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{descreverItem(mov.item)}</p>
                      <p className="text-xs text-slate-400">
                        {formatarData(mov.data)} · {mov.responsavel}
                      </p>
                    </div>
                    <Selo cor={mov.tipo === 'entrada' ? 'azul' : 'amarelo'}>
                      {mov.tipo === 'entrada' ? '+' : '−'}
                      {mov.quantidade}
                    </Selo>
                  </li>
                ))}
              </ul>
            </Painel>

            <Painel titulo={`Estoque baixo (até ${ESTOQUE_BAIXO} peças)`}>
              {resumo.baixos.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum item com estoque baixo. 🎉</p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {resumo.baixos.slice(0, 6).map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                      <p className="truncate text-sm">{descreverItem(item)}</p>
                      <Selo cor={item.saldo === 0 ? 'vermelho' : 'amarelo'}>
                        {item.saldo === 0 ? 'Esgotado' : `${item.saldo} un.`}
                      </Selo>
                    </li>
                  ))}
                </ul>
              )}
              <Link to="/estoque" className="mt-3 inline-block text-sm font-medium text-blue-600 hover:underline dark:text-orange-400">
                Ver estoque completo →
              </Link>
            </Painel>
          </div>
        </>
      )}
    </>
  );
}
