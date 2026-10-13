import { AnimatePresence, motion } from 'framer-motion';
import {
  Boxes,
  FileBarChart,
  Info,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PackageMinus,
  PackagePlus,
  RotateCcw,
  Sun,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEstoque } from '../contexts/EstoqueContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { fonte } from '../data';
import { Logo } from './Logo';

const NAVEGACAO = [
  { para: '/', rotulo: 'Dashboard', icone: LayoutDashboard },
  { para: '/entradas', rotulo: 'Entradas', icone: PackagePlus },
  { para: '/saidas', rotulo: 'Saídas', icone: PackageMinus },
  { para: '/estoque', rotulo: 'Estoque', icone: Boxes },
  { para: '/relatorios', rotulo: 'Relatórios', icone: FileBarChart },
];

function Navegacao({ aoNavegar }: { aoNavegar?: () => void }) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Menu principal">
      {NAVEGACAO.map(({ para, rotulo, icone: Icone }) => (
        <NavLink
          key={para}
          to={para}
          end={para === '/'}
          onClick={aoNavegar}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-white/10 text-white shadow-inner'
                : 'text-blue-100/70 hover:bg-white/5 hover:text-white'
            }`
          }
        >
          <Icone className="h-5 w-5" />
          {rotulo}
        </NavLink>
      ))}
    </nav>
  );
}

function Rodape() {
  const { sessao, sair } = useAuth();
  return (
    <div className="mt-auto border-t border-white/10 pt-4">
      <div className="flex items-center gap-3 px-1">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white">
          {sessao?.usuario.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{sessao?.usuario}</p>
          <p className="text-xs text-blue-100/60">Conectado</p>
        </div>
        <button
          type="button"
          onClick={() => void sair()}
          className="rounded-lg p-2 text-blue-100/70 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Sair"
          title="Sair"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function BotaoTema() {
  const { tema, alternarTema } = useTheme();
  return (
    <button
      type="button"
      onClick={alternarTema}
      className="btn-ghost"
      aria-label={tema === 'claro' ? 'Ativar modo escuro' : 'Ativar modo claro'}
      title={tema === 'claro' ? 'Modo escuro' : 'Modo claro'}
    >
      {tema === 'claro' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </button>
  );
}

function AvisoDemonstracao() {
  const { restaurarDadosDeExemplo } = useEstoque();
  const { avisar } = useToast();

  async function restaurar() {
    if (!restaurarDadosDeExemplo) return;
    if (!window.confirm('Descartar as alterações feitas neste navegador e restaurar os dados de exemplo?')) return;
    await restaurarDadosDeExemplo();
    avisar('Dados de exemplo restaurados.');
  }

  return (
    <div className="flex flex-col gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
      <p className="flex items-start gap-2">
        <Info className="mt-px h-4 w-4 shrink-0" />
        <span>
          Modo demonstração: os dados são exemplos da campanha de inverno de 2025 e as alterações ficam salvas apenas
          neste navegador.
        </span>
      </p>
      <button
        type="button"
        onClick={() => void restaurar()}
        className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg px-2 py-1 font-semibold hover:bg-amber-100 sm:self-auto dark:hover:bg-amber-500/10"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Restaurar dados de exemplo
      </button>
    </div>
  );
}

export function Layout() {
  const [menuAberto, setMenuAberto] = useState(false);
  const location = useLocation();

  useEffect(() => setMenuAberto(false), [location.pathname]);

  return (
    <div className="min-h-screen lg:pl-72">
      {/* Menu lateral (desktop) */}
      <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col bg-primary p-5 text-white lg:flex dark:bg-slate-900 dark:ring-1 dark:ring-slate-800">
        <div className="mb-8 px-1">
          <Logo />
        </div>
        <Navegacao />
        <Rodape />
      </aside>

      {/* Menu lateral (celular) */}
      <AnimatePresence>
        {menuAberto && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-slate-900/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuAberto(false)}
            />
            <motion.aside
              className="absolute inset-y-0 left-0 flex w-72 flex-col bg-primary p-5 text-white dark:bg-slate-900"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.22 }}
            >
              <div className="mb-8 flex items-center justify-between px-1">
                <Logo />
                <button
                  type="button"
                  onClick={() => setMenuAberto(false)}
                  className="rounded-lg p-2 text-blue-100/70 hover:bg-white/10"
                  aria-label="Fechar menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <Navegacao aoNavegar={() => setMenuAberto(false)} />
              <Rodape />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200/80 bg-white/80 px-4 py-3 backdrop-blur-md sm:px-6 lg:px-8 dark:border-slate-800 dark:bg-slate-950/80">
        <div className="flex items-center gap-2 lg:hidden">
          <button type="button" className="btn-ghost" onClick={() => setMenuAberto(true)} aria-label="Abrir menu">
            <Menu className="h-5 w-5" />
          </button>
          <Logo compacto />
        </div>
        <p className="hidden text-sm text-slate-500 lg:block dark:text-slate-400">
          Campanha de agasalhos · Rede Feminina de Garopaba
        </p>
        <BotaoTema />
      </header>

      {fonte.modo === 'demo' && <AvisoDemonstracao />}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}
