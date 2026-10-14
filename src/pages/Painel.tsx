import { AlertTriangle, ArrowRight, PackageMinus, PackageOpen, PackagePlus, Trash2 } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { Link } from 'react-router-dom';
import { useRegistro } from '../components/Registro';
import { CabecalhoPagina, Carregando, EstadoVazio, Selo } from '../components/ui';
import { useEstoque } from '../contexts/EstoqueContext';
import { useTheme } from '../contexts/ThemeContext';
import { somar } from '../lib/estoque';
import { formatarData, formatarNumero } from '../lib/format';
import { paletaDosGraficos } from '../lib/graficos';
import { distribuirPor, seriePorSemana, type Distribuicao } from '../lib/series';
import { codigoDoItem } from '../lib/sku';
import { GENEROS, ROTULOS_MOVIMENTACAO, type TipoMovimentacao } from '../lib/types';

const ESTOQUE_BAIXO = 3;

function percentual(parte: number, total: number): string {
  return total ? `${((parte / total) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` : '0%';
}

function Secao({ titulo, descricao, acao, children, className = '' }: { titulo: string; descricao?: string; acao?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`painel flex flex-col ${className}`}>
      <header className="flex items-start justify-between gap-3 px-5 pb-3 pt-4">
        <div>
          <h2 className="text-[14px] font-semibold">{titulo}</h2>
          {descricao && <p className="mt-0.5 text-xs text-suave">{descricao}</p>}
        </div>
        {acao}
      </header>
      <div className="flex-1 px-5 pb-5">{children}</div>
    </section>
  );
}

/** Mini gráfico de linha para a faixa de indicadores. */
function Faisca({ valores, cor }: { valores: number[]; cor: string }) {
  if (valores.length < 2) return null;
  const max = Math.max(...valores, 1);
  const pontos = valores.map((v, i) => `${(i / (valores.length - 1)) * 100},${28 - (v / max) * 26}`).join(' ');
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-8 w-24" aria-hidden="true">
      <polyline points={pontos} fill="none" stroke={cor} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

function Indicador({ rotulo, valor, detalhe, faisca, cor }: { rotulo: string; valor: number; detalhe: string; faisca: number[]; cor: string }) {
  return (
    <div className="flex items-end justify-between gap-3 bg-superficie px-5 py-4">
      <div className="min-w-0">
        <p className="rotulo-mono">{rotulo}</p>
        <p className="numero mt-1.5 text-[28px] font-medium leading-none tracking-tight">{formatarNumero(valor)}</p>
        <p className="mt-1.5 truncate text-xs text-suave">{detalhe}</p>
      </div>
      <Faisca valores={faisca} cor={cor} />
    </div>
  );
}

/** Barra empilhada que mostra para onde foram as peças arrecadadas. */
function BarraDeDestino({ distribuido, estoque, descartado }: { distribuido: number; estoque: number; descartado: number }) {
  const total = distribuido + estoque + descartado;
  const partes = [
    { rotulo: 'Distribuídas', valor: distribuido, classe: 'bg-brasa' },
    { rotulo: 'Em estoque', valor: estoque, classe: 'bg-petroleo' },
    { rotulo: 'Descartadas', valor: descartado, classe: 'bg-vinho' },
  ];
  return (
    <div>
      <div
        className="flex h-3 w-full origin-left animate-crescer gap-[2px] overflow-hidden rounded-full bg-fundo"
        role="img"
        aria-label={partes.map((p) => `${p.rotulo}: ${p.valor}`).join(', ')}
      >
        {partes.map((p) => p.valor > 0 && <div key={p.rotulo} className={p.classe} style={{ width: `${(p.valor / total) * 100}%` }} />)}
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-4">
        {partes.map((p) => (
          <div key={p.rotulo}>
            <dt className="flex items-center gap-1.5 text-xs text-suave">
              <span className={`h-2 w-2 rounded-sm ${p.classe}`} />
              {p.rotulo}
            </dt>
            <dd className="mt-1 flex items-baseline gap-1.5">
              <span className="numero text-lg font-medium">{formatarNumero(p.valor)}</span>
              <span className="numero text-xs text-suave">{percentual(p.valor, total)}</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function GraficoDeDistribuicao({ dados, altura }: { dados: Distribuicao[]; altura: number }) {
  const { tema } = useTheme();
  const cores = useMemo(() => paletaDosGraficos(), [tema]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div style={{ height: altura }}>
      <Bar
        data={{
          labels: dados.map((d) => d.rotulo),
          datasets: [
            { label: 'Distribuídas', data: dados.map((d) => d.distribuido), backgroundColor: cores.distribuido },
            { label: 'Em estoque', data: dados.map((d) => d.estoque), backgroundColor: cores.estoque },
            { label: 'Descartadas', data: dados.map((d) => d.descartado), backgroundColor: cores.descartado },
          ].map((d) => ({ ...d, borderRadius: 2, borderSkipped: false, barThickness: 14 })),
        }}
        options={{
          indexAxis: 'y',
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { backgroundColor: cores.tooltipFundo } },
          scales: {
            x: { stacked: true, grid: { color: cores.grade }, border: { display: false }, ticks: { color: cores.texto, precision: 0 } },
            y: { stacked: true, grid: { display: false }, border: { display: false }, ticks: { color: cores.texto } },
          },
        }}
      />
    </div>
  );
}

function ListaDeBarras({ itens, total, classe }: { itens: Array<[string, number]>; total: number; classe: string }) {
  const maior = itens[0]?.[1] ?? 1;
  return (
    <ul className="space-y-3">
      {itens.map(([rotulo, valor]) => (
        <li key={rotulo}>
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate">{rotulo}</span>
            <span className="numero shrink-0 text-suave">
              {formatarNumero(valor)} <span className="text-[11px]">· {percentual(valor, total)}</span>
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-fundo">
            <div className={`h-full origin-left animate-crescer rounded-full ${classe}`} style={{ width: `${(valor / maior) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

const ICONES = { entrada: PackagePlus, saida: PackageMinus, descarte: Trash2 } satisfies Record<TipoMovimentacao, unknown>;
const CORES_ICONE = { entrada: 'bg-petroleo-clara text-petroleo', saida: 'bg-brasa-clara text-brasa-escura dark:text-brasa', descarte: 'bg-vinho-clara text-vinho' };

export function Painel() {
  const { itens, movimentacoes, carregando, erro } = useEstoque();
  const { abrir } = useRegistro();
  const { tema } = useTheme();
  const cores = useMemo(() => paletaDosGraficos(), [tema]); // eslint-disable-line react-hooks/exhaustive-deps

  const resumo = useMemo(() => {
    const comEntradas = itens.filter((i) => i.entradas > 0);
    return {
      arrecadado: somar(movimentacoes, 'entrada'),
      distribuido: somar(movimentacoes, 'saida'),
      descartado: somar(movimentacoes, 'descarte'),
      emEstoque: itens.reduce((t, i) => t + i.saldo, 0),
      itensDisponiveis: itens.filter((i) => i.saldo > 0).length,
      criticos: comEntradas.filter((i) => i.saldo <= ESTOQUE_BAIXO).sort((a, b) => a.saldo - b.saldo),
      fornecedores: new Set(movimentacoes.flatMap((m) => (m.fornecedor ? [m.fornecedor] : []))).size,
    };
  }, [itens, movimentacoes]);

  const semanas = useMemo(() => seriePorSemana(movimentacoes), [movimentacoes]);
  const porTipo = useMemo(() => distribuirPor(itens, (i) => i.tipo), [itens]);
  const porGenero = useMemo(() => distribuirPor(itens, (i) => i.genero, GENEROS), [itens]);
  const porMotivo = useMemo(() => {
    const totais = new Map<string, number>();
    for (const mov of movimentacoes) if (mov.motivo) totais.set(mov.motivo, (totais.get(mov.motivo) ?? 0) + mov.quantidade);
    return [...totais.entries()].sort(([, a], [, b]) => b - a);
  }, [movimentacoes]);
  const porFornecedor = useMemo(() => {
    const totais = new Map<string, number>();
    for (const mov of movimentacoes) if (mov.fornecedor) totais.set(mov.fornecedor, (totais.get(mov.fornecedor) ?? 0) + mov.quantidade);
    return [...totais.entries()].sort(([, a], [, b]) => b - a);
  }, [movimentacoes]);

  if (carregando) return <Carregando />;
  if (erro) return <EstadoVazio icone={AlertTriangle} titulo="Não foi possível carregar os dados" texto={erro} />;

  if (movimentacoes.length === 0) {
    return (
      <>
        <CabecalhoPagina titulo="Painel" descricao="Visão geral do estoque da campanha." />
        <div className="painel">
          <EstadoVazio
            icone={PackageOpen}
            titulo="Nenhuma peça registrada ainda"
            texto="Registre a primeira doação recebida para acompanhar o estoque por aqui."
            acao={
              <button type="button" className="btn-brasa" onClick={() => abrir('entrada')}>
                <PackagePlus className="h-4 w-4" />
                Registrar entrada
              </button>
            }
          />
        </div>
      </>
    );
  }

  const eixos = { grid: { color: cores.grade }, border: { display: false }, ticks: { color: cores.texto } };

  return (
    <>
      <CabecalhoPagina titulo="Painel" descricao="Visão geral das doações recebidas, distribuídas e em estoque." />

      <section className="grid gap-px overflow-hidden rounded-xl border border-linha bg-linha shadow-cartao sm:grid-cols-2 xl:grid-cols-4">
        <Indicador
          rotulo="Em estoque"
          valor={resumo.emEstoque}
          detalhe={`${resumo.itensDisponiveis} itens disponíveis`}
          faisca={semanas.map((s) => s.saldo)}
          cor={cores.estoque}
        />
        <Indicador rotulo="Arrecadadas" valor={resumo.arrecadado} detalhe={`De ${resumo.fornecedores} fornecedores`} faisca={semanas.map((s) => s.entradas)} cor={cores.estoque} />
        <Indicador
          rotulo="Distribuídas"
          valor={resumo.distribuido}
          detalhe={`${percentual(resumo.distribuido, resumo.arrecadado)} do arrecadado`}
          faisca={semanas.map((s) => s.saidas)}
          cor={cores.distribuido}
        />
        <Indicador
          rotulo="Descartadas"
          valor={resumo.descartado}
          detalhe={`${percentual(resumo.descartado, resumo.arrecadado)} do arrecadado`}
          faisca={semanas.map((s) => s.descartes)}
          cor={cores.descartado}
        />
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Secao titulo="Destino das peças arrecadadas" descricao={`${formatarNumero(resumo.arrecadado)} peças recebidas desde o início da campanha`} className="xl:col-span-1">
          <BarraDeDestino distribuido={resumo.distribuido} estoque={resumo.emEstoque} descartado={resumo.descartado} />
          <div className="mt-6 border-t border-linha pt-4">
            <p className="rotulo-mono mb-3">Por gênero</p>
            <GraficoDeDistribuicao dados={porGenero} altura={110} />
          </div>
        </Secao>

        <Secao titulo="Movimentação semanal" descricao="Peças que entraram e saíram do estoque a cada semana" className="xl:col-span-2">
          <div className="h-[260px]">
            <Line
              data={{
                labels: semanas.map((s) => s.rotulo),
                datasets: [
                  { label: 'Entradas', data: semanas.map((s) => s.entradas), borderColor: cores.entrada, backgroundColor: cores.entrada },
                  { label: 'Saídas', data: semanas.map((s) => s.saidas), borderColor: cores.saida, backgroundColor: cores.saida },
                ].map((d) => ({ ...d, cubicInterpolationMode: 'monotone' as const, borderWidth: 2, pointRadius: 0, pointHoverRadius: 4 })),
              }}
              options={{
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                  legend: { position: 'top', align: 'end', labels: { color: cores.texto, boxWidth: 8, boxHeight: 8, usePointStyle: true, pointStyle: 'rectRounded' } },
                  tooltip: {
                    backgroundColor: cores.tooltipFundo,
                    callbacks: { title: ([p]) => `Semana de ${formatarData(semanas[p.dataIndex].inicio.toISOString().slice(0, 10))}` },
                  },
                },
                scales: { x: { ...eixos, grid: { display: false } }, y: { ...eixos, beginAtZero: true, ticks: { ...eixos.ticks, precision: 0 } } },
              }}
            />
          </div>
        </Secao>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Secao
          titulo="Por tipo de peça"
          descricao="Destino das peças arrecadadas de cada tipo"
          className="xl:col-span-2"
          acao={
            <div className="hidden gap-3 text-xs text-suave sm:flex">
              {[
                ['bg-brasa', 'Distribuídas'],
                ['bg-petroleo', 'Em estoque'],
                ['bg-vinho', 'Descartadas'],
              ].map(([classe, rotulo]) => (
                <span key={rotulo} className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-sm ${classe}`} />
                  {rotulo}
                </span>
              ))}
            </div>
          }
        >
          <GraficoDeDistribuicao dados={porTipo} altura={Math.max(160, porTipo.length * 30)} />
        </Secao>

        <Secao titulo="Origem e triagem" descricao="De onde vieram as doações e por que peças foram descartadas">
          <p className="rotulo-mono mb-3">Por fornecedor</p>
          <ListaDeBarras itens={porFornecedor} total={resumo.arrecadado} classe="bg-petroleo" />
          <p className="rotulo-mono mb-3 mt-6 border-t border-linha pt-5">Motivos de descarte</p>
          {porMotivo.length === 0 ? (
            <p className="text-[13px] text-suave">Nenhuma peça descartada.</p>
          ) : (
            <ListaDeBarras itens={porMotivo} total={resumo.descartado} classe="bg-vinho" />
          )}
        </Secao>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Secao
          titulo="Estoque crítico"
          descricao={`Itens com até ${ESTOQUE_BAIXO} peças`}
          acao={
            <Link to="/estoque" className="inline-flex items-center gap-1 text-xs font-medium text-suave hover:text-texto">
              Ver estoque <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {resumo.criticos.length === 0 ? (
            <p className="py-6 text-center text-sm text-suave">Nenhum item com estoque baixo.</p>
          ) : (
            <ul className="-mx-5 divide-y divide-linha border-t border-linha">
              {resumo.criticos.slice(0, 6).map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-5 py-2.5">
                  <span className="sku w-[5.5rem] shrink-0">{codigoDoItem(item)}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px]">
                    {item.tipo} {item.genero.toLowerCase()} <span className="tag-tamanho ml-1">{item.tamanho}</span>
                  </span>
                  <Selo cor={item.saldo === 0 ? 'vinho' : 'trigo'}>{item.saldo === 0 ? 'Esgotado' : `${item.saldo} un.`}</Selo>
                </li>
              ))}
            </ul>
          )}
        </Secao>

        <Secao titulo="Últimos registros" descricao="Movimentações mais recentes">
          <ul className="-mx-5 divide-y divide-linha border-t border-linha">
            {movimentacoes.slice(0, 6).map((mov) => {
              const Icone = ICONES[mov.tipo];
              return (
                <li key={mov.id} className="flex items-center gap-3 px-5 py-2.5">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${CORES_ICONE[mov.tipo]}`}>
                    <Icone className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px]">
                      {ROTULOS_MOVIMENTACAO[mov.tipo]} · {mov.item.tipo} {mov.item.genero.toLowerCase()} {mov.item.tamanho}
                    </p>
                    <p className="text-xs text-suave">
                      {formatarData(mov.data)} · {mov.fornecedor ?? mov.responsavel}
                    </p>
                  </div>
                  <span className={`numero text-[13px] font-medium ${mov.tipo === 'entrada' ? 'text-petroleo' : 'text-suave'}`}>
                    {mov.tipo === 'entrada' ? '+' : '−'}
                    {mov.quantidade}
                  </span>
                </li>
              );
            })}
          </ul>
        </Secao>
      </div>
    </>
  );
}
