import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';

ChartJS.register(ArcElement, BarElement, CategoryScale, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip);

ChartJS.defaults.font.family = '"Geist Variable", system-ui, sans-serif';
ChartJS.defaults.font.size = 12;
ChartJS.defaults.plugins.tooltip.padding = 10;
ChartJS.defaults.plugins.tooltip.cornerRadius = 6;
ChartJS.defaults.plugins.tooltip.boxPadding = 4;
ChartJS.defaults.plugins.tooltip.titleFont = { weight: 600 };

/** Lê um token de cor do CSS (ex.: "brasa") como rgb(), com transparência opcional. */
function corDoToken(token: string, alfa = 1): string {
  const valor = getComputedStyle(document.documentElement).getPropertyValue(`--${token}`).trim();
  return alfa === 1 ? `rgb(${valor})` : `rgb(${valor} / ${alfa})`;
}

/** Cores usadas pelos gráficos; chame de novo quando o tema mudar. */
export function paletaDosGraficos() {
  return {
    distribuido: corDoToken('brasa'),
    estoque: corDoToken('petroleo'),
    descartado: corDoToken('vinho'),
    entrada: corDoToken('petroleo'),
    saida: corDoToken('brasa'),
    texto: corDoToken('suave'),
    grade: corDoToken('linha', 0.7),
    tooltipFundo: corDoToken('tinta'),
  };
}
