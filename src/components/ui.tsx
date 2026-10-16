import { animate, AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Loader2, X, type LucideIcon } from 'lucide-react';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import { formatarNumero } from '../lib/format';

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-20 text-suave" role="status">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">{texto}</span>
    </div>
  );
}

/** Silhueta da página enquanto os dados chegam: evita o "pulo" do conteúdo ao carregar. */
export function Esqueleto({ formato = 'tabela', cabecalho = true }: { formato?: 'painel' | 'tabela'; cabecalho?: boolean }) {
  const bloco = 'rounded-md bg-linha/60 animate-pulso';
  return (
    <div role="status" aria-label="Carregando" className="animate-surgir">
      {cabecalho && (
        <div className="mb-6 space-y-2.5">
          <div className={`${bloco} h-7 w-44`} />
          <div className={`${bloco} h-4 w-80 max-w-full`} />
        </div>
      )}
      {formato === 'painel' ? (
        <>
          <div className="grid gap-px overflow-hidden rounded-xl border border-linha bg-linha sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-3 bg-superficie px-5 py-4">
                <div className={`${bloco} h-3 w-20`} />
                <div className={`${bloco} h-7 w-16`} />
                <div className={`${bloco} h-3 w-28`} />
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-[2fr_3fr]">
            <div className="painel h-72" />
            <div className="painel h-72" />
          </div>
        </>
      ) : (
        <div className="painel overflow-hidden">
          <div className="flex gap-3 border-b border-linha p-3">
            <div className={`${bloco} h-9 flex-1`} />
            <div className={`${bloco} hidden h-9 w-36 sm:block`} />
          </div>
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex items-center gap-6 border-b border-linha px-4 py-3.5 last:border-0">
              <div className={`${bloco} h-3.5 w-20`} />
              <div className={`${bloco} h-3.5 flex-1`} style={{ maxWidth: `${40 + ((i * 37) % 45)}%` }} />
              <div className={`${bloco} h-3.5 w-10`} />
            </div>
          ))}
        </div>
      )}
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
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        {descricao && <p className="mt-1 max-w-2xl text-suave">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </header>
  );
}

export function EstadoVazio({
  icone: Icone,
  titulo,
  texto,
  acao,
}: {
  icone: LucideIcon;
  titulo: string;
  texto?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-fundo"><Icone className="h-5 w-5 text-suave" strokeWidth={1.75} /></div>
      <p className="mt-3 text-[15px] font-semibold">{titulo}</p>
      {texto && <p className="mt-1 max-w-sm text-sm text-suave">{texto}</p>}
      {acao && <div className="mt-5">{acao}</div>}
    </div>
  );
}

const CORES_SELO = {
  petroleo: 'bg-petroleo-clara text-petroleo',
  brasa: 'bg-brasa-clara text-brasa-escura dark:text-brasa',
  vinho: 'bg-vinho-clara text-vinho',
  trigo: 'bg-trigo-clara text-trigo',
  neutro: 'bg-fundo text-suave',
};

export function Selo({ cor, children }: { cor: keyof typeof CORES_SELO; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${CORES_SELO[cor]}`}>
      {children}
    </span>
  );
}

export function Abas<T extends string>({
  abas,
  ativa,
  aoTrocar,
}: {
  abas: Array<{ id: T; rotulo: string; contagem?: number }>;
  ativa: T;
  aoTrocar(id: T): void;
}) {
  return (
    <div role="tablist" className="mb-5 flex gap-1 overflow-x-auto border-b border-linha">
      {abas.map((aba) => (
        <button
          key={aba.id}
          role="tab"
          type="button"
          aria-selected={aba.id === ativa}
          onClick={() => aoTrocar(aba.id)}
          className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 pb-2.5 pt-1 text-sm font-medium transition-colors ${
            aba.id === ativa ? 'border-brasa text-texto' : 'border-transparent text-suave hover:text-texto'
          }`}
        >
          {aba.rotulo}
          {aba.contagem !== undefined && (
            <span className="numero rounded-full bg-fundo px-2 text-xs text-suave">{aba.contagem}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Modal({
  aberto,
  titulo,
  descricao,
  aoFechar,
  children,
  largura = 'max-w-lg',
}: {
  aberto: boolean;
  titulo: string;
  descricao?: string;
  aoFechar(): void;
  children: ReactNode;
  largura?: string;
}) {
  const tituloId = useId();
  const caixa = useRef<HTMLDivElement>(null);
  // Guardado em ref: quem chama costuma passar uma função nova a cada render, e isso não deve
  // reabrir o efeito (o foco pularia para o primeiro campo a cada tecla digitada)
  const fechar = useRef(aoFechar);
  fechar.current = aoFechar;

  useEffect(() => {
    if (!aberto) return;
    const focoAnterior = document.activeElement as HTMLElement | null;
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && fechar.current();
    document.addEventListener('keydown', aoTeclar);
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      caixa.current?.querySelector<HTMLElement>('input, select, textarea, button:not([aria-label="Fechar"])')?.focus();
    });
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = overflowAnterior;
      focoAnterior?.focus?.();
    };
  }, [aberto]);

  // Fica no <body> para não ser recortada por elementos com backdrop-filter, como o cabeçalho
  return createPortal(
    <AnimatePresence>
      {aberto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <motion.div
            className="absolute inset-0 bg-tinta/55 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={aoFechar}
          />
          <motion.div
            ref={caixa}
            role="dialog"
            aria-modal="true"
            aria-labelledby={tituloId}
            className={`painel relative max-h-[94vh] w-full overflow-y-auto rounded-b-none shadow-flutuante sm:rounded-xl ${largura}`}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 28 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-5">
              <div>
                <h2 id={tituloId} className="text-lg font-semibold tracking-tight">
                  {titulo}
                </h2>
                {descricao && <p className="mt-0.5 text-sm text-suave">{descricao}</p>}
              </div>
              <button type="button" className="btn-icone -mr-2" onClick={aoFechar} aria-label="Fechar">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 pb-6 pt-3">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function Confirmacao({
  aberto,
  titulo,
  mensagem,
  textoConfirmar,
  processando,
  aoConfirmar,
  aoCancelar,
  children,
}: {
  aberto: boolean;
  titulo: string;
  mensagem: ReactNode;
  textoConfirmar: string;
  processando?: boolean;
  aoConfirmar(): void;
  aoCancelar(): void;
  children?: ReactNode;
}) {
  return (
    <Modal aberto={aberto} titulo={titulo} aoFechar={aoCancelar} largura="max-w-md">
      <div className="text-sm text-suave">{mensagem}</div>
      {children}
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className="btn-contorno" onClick={aoCancelar}>
          Cancelar
        </button>
        <button type="button" className="btn-perigo" onClick={aoConfirmar} disabled={processando}>
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
  dica?: string;
}

function Envoltorio({
  id,
  rotulo,
  erro,
  dica,
  className,
  children,
}: CampoBase & { id: string; className?: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="rotulo">
        {rotulo}
      </label>
      {children}
      {erro ? (
        <p id={`${id}-erro`} className="mt-1 text-xs font-medium text-vinho">
          {erro}
        </p>
      ) : (
        dica && <p className="mt-1 text-xs text-suave">{dica}</p>
      )}
    </div>
  );
}

const atributosDeErro = (id: string, erro?: string) => ({
  'aria-invalid': !!erro,
  'aria-describedby': erro ? `${id}-erro` : undefined,
});

export function Campo({ rotulo, erro, dica, id, className, ...props }: CampoBase & InputHTMLAttributes<HTMLInputElement>) {
  const gerado = useId();
  const campoId = id ?? gerado;
  return (
    <Envoltorio id={campoId} rotulo={rotulo} erro={erro} dica={dica} className={className}>
      <input id={campoId} className={`campo ${erro ? 'campo-erro' : ''}`} {...atributosDeErro(campoId, erro)} {...props} />
    </Envoltorio>
  );
}

export function AreaDeTexto({
  rotulo,
  erro,
  dica,
  id,
  className,
  ...props
}: CampoBase & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const gerado = useId();
  const campoId = id ?? gerado;
  return (
    <Envoltorio id={campoId} rotulo={rotulo} erro={erro} dica={dica} className={className}>
      <textarea id={campoId} rows={2} className={`campo resize-none ${erro ? 'campo-erro' : ''}`} {...atributosDeErro(campoId, erro)} {...props} />
    </Envoltorio>
  );
}

export function Selecao({
  rotulo,
  erro,
  dica,
  id,
  className,
  children,
  ...props
}: CampoBase & SelectHTMLAttributes<HTMLSelectElement>) {
  const gerado = useId();
  const campoId = id ?? gerado;
  return (
    <Envoltorio id={campoId} rotulo={rotulo} erro={erro} dica={dica} className={className}>
      <select id={campoId} className={`campo ${erro ? 'campo-erro' : ''}`} {...atributosDeErro(campoId, erro)} {...props}>
        {children}
      </select>
    </Envoltorio>
  );
}

/** Grupo de botões para escolher uma opção curta (ex.: gênero), mais rápido que uma lista suspensa. */
export function Escolha<T extends string>({
  rotulo,
  opcoes,
  valor,
  aoEscolher,
  erro,
}: {
  rotulo: string;
  opcoes: readonly T[];
  valor: string;
  aoEscolher(valor: T): void;
  erro?: string;
}) {
  const id = useId();
  return (
    <fieldset aria-describedby={erro ? `${id}-erro` : undefined}>
      <legend className="rotulo">{rotulo}</legend>
      <div className="flex flex-wrap gap-2">
        {opcoes.map((opcao) => (
          <label
            key={opcao}
            className={`flex h-9 cursor-pointer items-center rounded-lg border px-3 text-sm font-medium shadow-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-petroleo/60 ${
              valor === opcao
                ? 'border-texto bg-texto text-superficie'
                : `border-linha bg-superficie text-texto hover:border-suave ${erro ? 'border-vinho' : ''}`
            }`}
          >
            <input type="radio" name={id} value={opcao} checked={valor === opcao} onChange={() => aoEscolher(opcao)} className="sr-only" />
            {opcao}
          </label>
        ))}
      </div>
      {erro && (
        <p id={`${id}-erro`} className="mt-1 text-xs font-medium text-vinho">
          {erro}
        </p>
      )}
    </fieldset>
  );
}


/** Número que "conta" até o valor ao aparecer e ao mudar; respeita a preferência por movimento reduzido. */
export function NumeroAnimado({ valor, formatar = formatarNumero }: { valor: number; formatar?: (n: number) => string }) {
  const reduzir = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const atual = useRef(reduzir ? valor : 0);
  // O texto inicial é fixo: daí em diante quem escreve no elemento é a animação, não o React
  const [inicial] = useState(() => formatar(atual.current));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduzir) {
      el.textContent = formatar(valor);
      atual.current = valor;
      return;
    }
    const controle = animate(atual.current, valor, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (n) => {
        atual.current = n;
        el.textContent = formatar(Math.round(n));
      },
    });
    return () => controle.stop();
  }, [valor, reduzir, formatar]);

  return (
    <>
      <span ref={ref} aria-hidden="true">
        {inicial}
      </span>
      <span className="sr-only">{formatar(valor)}</span>
    </>
  );
}
