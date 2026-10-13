import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, X, type LucideIcon } from 'lucide-react';
import { useEffect, useId, type ReactNode, type SelectHTMLAttributes, type InputHTMLAttributes } from 'react';

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">{texto}</span>
    </div>
  );
}

export function CabecalhoPagina({
  titulo,
  descricao,
  acoes,
}: {
  titulo: string;
  descricao?: string;
  acoes?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary dark:text-white">{titulo}</h1>
        {descricao && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </div>
  );
}

const CORES_ESTATISTICA = {
  azul: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
  laranja: 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300',
  verde: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  roxo: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
};

export function CartaoEstatistica({
  titulo,
  valor,
  detalhe,
  icone: Icone,
  cor,
}: {
  titulo: string;
  valor: string;
  detalhe?: string;
  icone: LucideIcon;
  cor: keyof typeof CORES_ESTATISTICA;
}) {
  return (
    <div className="card flex items-start gap-4 p-5">
      <div className={`rounded-xl p-3 ${CORES_ESTATISTICA[cor]}`}>
        <Icone className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{titulo}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{valor}</p>
        {detalhe && <p className="mt-0.5 text-xs text-slate-400">{detalhe}</p>}
      </div>
    </div>
  );
}

export function EstadoVazio({ icone: Icone, titulo, texto }: { icone: LucideIcon; titulo: string; texto?: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="rounded-full bg-slate-100 p-4 dark:bg-slate-800">
        <Icone className="h-7 w-7 text-slate-400" />
      </div>
      <p className="mt-4 font-semibold text-slate-700 dark:text-slate-200">{titulo}</p>
      {texto && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{texto}</p>}
    </div>
  );
}

const CORES_SELO = {
  verde: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  vermelho: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  amarelo: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  cinza: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  azul: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
};

export function Selo({ cor, children }: { cor: keyof typeof CORES_SELO; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${CORES_SELO[cor]}`}>
      {children}
    </span>
  );
}

export function Modal({
  aberto,
  titulo,
  aoFechar,
  children,
  largura = 'max-w-lg',
}: {
  aberto: boolean;
  titulo: string;
  aoFechar(): void;
  children: ReactNode;
  largura?: string;
}) {
  const tituloId = useId();

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar();
    document.addEventListener('keydown', aoTeclar);
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = overflowAnterior;
    };
  }, [aberto, aoFechar]);

  return (
    <AnimatePresence>
      {aberto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <motion.div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={aoFechar}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={tituloId}
            className={`card relative max-h-[92vh] w-full overflow-y-auto rounded-b-none sm:rounded-2xl ${largura}`}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <h2 id={tituloId} className="text-lg font-semibold">
                {titulo}
              </h2>
              <button type="button" className="btn-ghost" onClick={aoFechar} aria-label="Fechar">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Confirmacao({
  aberto,
  titulo,
  mensagem,
  textoConfirmar = 'Confirmar',
  processando,
  aoConfirmar,
  aoCancelar,
}: {
  aberto: boolean;
  titulo: string;
  mensagem: ReactNode;
  textoConfirmar?: string;
  processando?: boolean;
  aoConfirmar(): void;
  aoCancelar(): void;
}) {
  return (
    <Modal aberto={aberto} titulo={titulo} aoFechar={aoCancelar} largura="max-w-md">
      <div className="text-sm text-slate-600 dark:text-slate-300">{mensagem}</div>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={aoCancelar}>
          Cancelar
        </button>
        <button type="button" className="btn-danger" onClick={aoConfirmar} disabled={processando}>
          {processando && <Loader2 className="h-4 w-4 animate-spin" />}
          {textoConfirmar}
        </button>
      </div>
    </Modal>
  );
}

interface CampoBase {
  rotulo: string;
  erro?: string;
}

export function Campo({ rotulo, erro, id, className, ...props }: CampoBase & InputHTMLAttributes<HTMLInputElement>) {
  const gerado = useId();
  const campoId = id ?? gerado;
  return (
    <div className={className}>
      <label htmlFor={campoId} className="label">
        {rotulo}
      </label>
      <input
        id={campoId}
        className={`input ${erro ? 'input-erro' : ''}`}
        aria-invalid={!!erro}
        aria-describedby={erro ? `${campoId}-erro` : undefined}
        {...props}
      />
      {erro && (
        <p id={`${campoId}-erro`} className="mt-1 text-xs text-rose-600 dark:text-rose-400">
          {erro}
        </p>
      )}
    </div>
  );
}

export function Selecao({
  rotulo,
  erro,
  id,
  className,
  children,
  ...props
}: CampoBase & SelectHTMLAttributes<HTMLSelectElement>) {
  const gerado = useId();
  const campoId = id ?? gerado;
  return (
    <div className={className}>
      <label htmlFor={campoId} className="label">
        {rotulo}
      </label>
      <select
        id={campoId}
        className={`input ${erro ? 'input-erro' : ''}`}
        aria-invalid={!!erro}
        aria-describedby={erro ? `${campoId}-erro` : undefined}
        {...props}
      >
        {children}
      </select>
      {erro && (
        <p id={`${campoId}-erro`} className="mt-1 text-xs text-rose-600 dark:text-rose-400">
          {erro}
        </p>
      )}
    </div>
  );
}
