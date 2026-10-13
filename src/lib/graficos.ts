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

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
);

ChartJS.defaults.font.family = 'Inter, system-ui, sans-serif';

export const CORES = {
  entrada: '#2563eb',
  saida: '#f97316',
  paleta: ['#1a365d', '#2563eb', '#0ea5e9', '#14b8a6', '#22c55e', '#eab308', '#f97316', '#ef4444', '#ec4899', '#a855f7', '#64748b', '#78350f'],
};

export function coresDoTema(escuro: boolean) {
  return {
    texto: escuro ? '#94a3b8' : '#64748b',
    grade: escuro ? 'rgba(148, 163, 184, 0.12)' : 'rgba(100, 116, 139, 0.12)',
    borda: escuro ? '#0f172a' : '#ffffff',
  };
}
