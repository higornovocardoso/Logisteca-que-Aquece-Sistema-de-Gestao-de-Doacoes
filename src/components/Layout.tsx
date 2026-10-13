import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3,
  Boxes,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PackageMinus,
  PackagePlus,
  Plus,
  RotateCcw,
  Settings2,
  Sun,
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEstoque } from '../contexts/EstoqueContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { servico } from '../data';
import type { TipoMovimentacao } from '../lib/types';
import { MarcaCabide } from './Logo';
import { RegistroProvider, useRegistro } from './Registro';
import { Confirmacao } from './ui';

interface ItemDeMenu {
  para: string;
  rotulo: string;
  icone: LucideIcon;
  somenteAdmin?: boolean;
}

const SECOES: Array<{ titulo: string; itens: ItemDeMenu[] }> = [
  {
    titulo: 'Operação',
    itens: [
      { para: '/', rotulo: 'Painel', icone: LayoutDashboard },
      { para: '/entradas', rotulo: 'Entradas', icone: PackagePlus },
      { para: '/saidas', rotulo: 'Saídas', icone: PackageMinus },
      { para: '/descartes', rotulo: 'Descartes', icone: Trash2 },
      { para: '/estoque', rotulo: 'Estoque', icone: Boxes },
    ],
  },
  {
    titulo: 'Gestão',
    itens: [
      { para: '/relatorios', rotulo: 'Relatórios', icone: BarChart3 },
      { para: '/administracao', rotulo: 'Administração', icone: Settings2, somenteAdmin: true },
    ],
  },
];

const ATALHOS: Array<{ tipo: TipoMovimentacao; rotulo: string; tecla: string; icone: LucideIcon }> = [
  { tipo: 'entrada', rotulo: 'Entrada', tecla: 'E', icone: PackagePlus },
  { tipo: 'saida', rotulo: 'Saída', tecla: 'S', icone: PackageMinus },
  { tipo: 'descarte', rotulo: 'Descarte', tecla: 'D', icone: Trash2 },
];

function useFecharAoClicarFora(aberto: boolean, fechar: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const aoClicar = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && fechar();
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && fechar();
    document.addEventListener('mousedown', aoClicar);
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('mousedown', aoClicar);
      document.removeEventListener('keydown', aoTeclar);
    };
  }, [aberto, fechar]);
  return ref;
}

function MenuSuspenso({
  aberto,
  alinhamento = 'direita',
  children,
}: {
  aberto: boolean;
  alinhamento?: 'direita' | 'esquerda';
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {aberto && (
        <motion.div
          role="menu"
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.12 }}
          className={`absolute top-full z-40 mt-1.5 min-w-[13rem] rounded-lg border border-linha bg-superficie p-1 shadow-flutuante ${
            alinhamento === 'direita' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'
          }`}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function OpcaoDeMenu({ icone: Icone, children, atalho, aoClicar }: { icone: LucideIcon; children: ReactNode; atalho?: string; aoClicar(): void }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={aoClicar}
      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm hover:bg-fundo"
    >
      <Icone className="h-4 w-4 text-suave" />
      <span className="flex-1">{children}</span>
      {atalho && <kbd className="rounded border border-linha px-1.5 font-mono text-[11px] text-suave">{atalho}</kbd>}
    </button>
  );
}

function Navegacao({ aoNavegar }: { aoNavegar?: () => void }) {
  const { ehAdministrador } = useAuth();
  return (
    <nav className="flex flex-col gap-6" aria-label="Menu principal">
      {SECOES.map((secao) => (
        <div key={secao.titulo}>
          <p className="mb-1.5 px-2.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-white/40">{secao.titulo}</p>
          <ul className="flex flex-col gap-0.5">
            {secao.itens
              .filter((item) => !item.somenteAdmin || ehAdministrador)
              .map(({ para, rotulo, icone: Icone }) => (
                <li key={para}>
                  <NavLink
                    to={para}
                    end={para === '/'}
                    onClick={aoNavegar}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13.5px] transition-colors ${
                        isActive ? 'bg-white/[0.08] font-medium text-white' : 'text-white/65 hover:bg-white/[0.05] hover:text-white'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && <span className="absolute -left-3 top-1.5 h-[calc(100%-12px)] w-[3px] rounded-r bg-brasa" />}
                        <Icone className={`h-4 w-4 ${isActive ? 'text-brasa' : ''}`} />
                        {rotulo}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function BarraLateral({ aoNavegar }: { aoNavegar?: () => void }) {
  return (
    <div className="flex h-full flex-col px-3 py-4 text-white">
      <div className="mb-7 flex items-center gap-2.5 px-2.5">
        <MarcaCabide className="h-7 w-7 text-white" />
        <div className="leading-tight">
          <p className="text-[14px] font-semibold tracking-tight">Logística que Aquece</p>
          <p className="font-mono text-[10.5px] text-white/45">Campanha de agasalhos</p>
        </div>
      </div>
      <Navegacao aoNavegar={aoNavegar} />
      <div className="mt-auto space-y-1 px-2.5 pt-6 font-mono text-[10.5px] text-white/40">
        <p className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${servico.modo === 'demo' ? 'bg-trigo' : 'bg-emerald-400'}`} />
          {servico.modo === 'demo' ? 'Modo demonstração' : 'Conectado ao banco'}
        </p>
        <p>Rede Feminina de Garopaba · SENAI</p>
      </div>
    </div>
  );
}

function BotaoRegistrar() {
  const { abrir } = useRegistro();
  const [aberto, setAberto] = useState(false);
  const ref = useFecharAoClicarFora(aberto, () => setAberto(false));

  // Atalhos de teclado E, S e D, fora de campos de texto
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement;
      if (e.ctrlKey || e.metaKey || e.altKey || alvo.closest('input, textarea, select, [role="dialog"]')) return;
      const atalho = ATALHOS.find((a) => a.tecla.toLowerCase() === e.key.toLowerCase());
      if (atalho) {
        e.preventDefault();
        abrir(atalho.tipo);
      }
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [abrir]);

  return (
    <div ref={ref} className="relative">
      <button type="button" className="btn-brasa pr-2.5" aria-haspopup="menu" aria-expanded={aberto} onClick={() => setAberto((v) => !v)}>
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Registrar</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-80" />
      </button>
      <MenuSuspenso aberto={aberto}>
        {ATALHOS.map(({ tipo, rotulo, tecla, icone }) => (
          <OpcaoDeMenu
            key={tipo}
            icone={icone}
            atalho={tecla}
            aoClicar={() => {
              setAberto(false);
              abrir(tipo);
            }}
          >
            {rotulo}
          </OpcaoDeMenu>
        ))}
      </MenuSuspenso>
    </div>
  );
}

function MenuDoUsuario() {
  const { sessao, sair } = useAuth();
  const { tema, alternarTema } = useTheme();
  const [aberto, setAberto] = useState(false);
  const ref = useFecharAoClicarFora(aberto, () => setAberto(false));
  const iniciais = (sessao?.nome ?? '?')
    .split(' ')
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join('');

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        className="flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-fundo"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-tinta font-mono text-[11px] font-medium text-white dark:bg-petroleo-clara dark:text-petroleo">
          {iniciais}
        </span>
        <span className="hidden text-left leading-tight md:block">
          <span className="block text-[13px] font-medium">{sessao?.nome}</span>
          <span className="block text-[11px] text-suave">{sessao?.perfil}</span>
        </span>
        <ChevronDown className="hidden h-3.5 w-3.5 text-suave md:block" />
      </button>
      <MenuSuspenso aberto={aberto}>
        <div className="border-b border-linha px-2.5 pb-2 pt-1.5 md:hidden">
          <p className="text-[13px] font-medium">{sessao?.nome}</p>
          <p className="text-[11px] text-suave">{sessao?.perfil}</p>
        </div>
        <OpcaoDeMenu icone={tema === 'claro' ? Moon : Sun} aoClicar={alternarTema}>
          {tema === 'claro' ? 'Tema escuro' : 'Tema claro'}
        </OpcaoDeMenu>
        <OpcaoDeMenu icone={LogOut} aoClicar={() => void sair()}>
          Sair
        </OpcaoDeMenu>
      </MenuSuspenso>
    </div>
  );
}

function FaixaDemonstracao() {
  const { ehAdministrador } = useAuth();
  const { restaurarDadosDeExemplo } = useEstoque();
  const { avisar } = useToast();
  const [confirmando, setConfirmando] = useState(false);
  const [processando, setProcessando] = useState(false);
  if (servico.modo !== 'demo') return null;

  async function restaurar() {
    setProcessando(true);
    try {
      await restaurarDadosDeExemplo();
      avisar('Dados de exemplo restaurados.');
      setConfirmando(false);
    } finally {
      setProcessando(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-trigo/25 bg-trigo-clara px-4 py-1.5 text-xs text-trigo sm:px-6 lg:px-8">
      <span>
        <strong className="font-semibold">Modo demonstração.</strong>{' '}
        <span className="hidden sm:inline">Dados de exemplo da campanha de 2025, salvos apenas neste navegador.</span>
      </span>
      {ehAdministrador && (
        <button type="button" onClick={() => setConfirmando(true)} className="inline-flex shrink-0 items-center gap-1 font-semibold hover:underline">
          <RotateCcw className="h-3 w-3" />
          Restaurar exemplo
        </button>
      )}
      <Confirmacao
        aberto={confirmando}
        titulo="Restaurar dados de exemplo"
        mensagem="As alterações feitas neste navegador serão descartadas."
        textoConfirmar="Restaurar"
        processando={processando}
        aoConfirmar={() => void restaurar()}
        aoCancelar={() => setConfirmando(false)}
      />
    </div>
  );
}

const TITULOS_DE_PAGINA: Record<string, string> = {
  '/': 'Painel',
  '/entradas': 'Entradas',
  '/saidas': 'Saídas',
  '/descartes': 'Descartes',
  '/estoque': 'Estoque',
  '/relatorios': 'Relatórios',
  '/administracao': 'Administração',
};

export function Layout() {
  const [menuAberto, setMenuAberto] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuAberto(false);
    document.title = `${TITULOS_DE_PAGINA[location.pathname] ?? 'Início'} · Logística que Aquece`;
  }, [location.pathname]);

  return (
    <RegistroProvider>
      <div className="min-h-screen lg:pl-60">
        <aside className="fixed inset-y-0 left-0 hidden w-60 bg-tinta lg:block">
          <BarraLateral />
        </aside>

        <AnimatePresence>
          {menuAberto && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <motion.div className="absolute inset-0 bg-tinta/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenuAberto(false)} />
              <motion.aside
                className="absolute inset-y-0 left-0 w-64 bg-tinta"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'tween', duration: 0.2 }}
              >
                <button
                  type="button"
                  onClick={() => setMenuAberto(false)}
                  className="absolute right-2 top-3.5 rounded-md p-1.5 text-white/60 hover:bg-white/10"
                  aria-label="Fechar menu"
                >
                  <X className="h-4 w-4" />
                </button>
                <BarraLateral aoNavegar={() => setMenuAberto(false)} />
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        <header className="sticky top-[env(safe-area-inset-top,0px)] z-30 border-b border-linha bg-superficie/85 backdrop-blur-md">
          <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2">
              <button type="button" className="btn-icone lg:hidden" onClick={() => setMenuAberto(true)} aria-label="Abrir menu">
                <Menu className="h-5 w-5" />
              </button>
              <p className="text-[13px] text-suave">
                <span className="hidden sm:inline">Logística que Aquece</span>
                <span className="mx-2 hidden text-linha sm:inline">/</span>
                <span className="font-medium text-texto">{TITULOS_DE_PAGINA[location.pathname]}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <BotaoRegistrar />
              <div className="mx-1 h-6 w-px bg-linha" />
              <MenuDoUsuario />
            </div>
          </div>
          <FaixaDemonstracao />
        </header>

        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <Outlet />
          </motion.div>
        </main>
      </div>
    </RegistroProvider>
  );
}
