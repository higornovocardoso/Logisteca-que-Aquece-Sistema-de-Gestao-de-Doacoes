import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type TipoAviso = 'sucesso' | 'erro';

interface Aviso {
  id: number;
  tipo: TipoAviso;
  mensagem: string;
}

interface ToastContextValue {
  avisar(mensagem: string, tipo?: TipoAviso): void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
let proximoId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  const avisar = useCallback((mensagem: string, tipo: TipoAviso = 'sucesso') => {
    const id = proximoId++;
    setAvisos((atual) => [...atual, { id, tipo, mensagem }]);
    setTimeout(() => setAvisos((atual) => atual.filter((a) => a.id !== id)), 4500);
  }, []);

  const value = useMemo(() => ({ avisar }), [avisar]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-end gap-2 sm:left-auto">
        <AnimatePresence>
          {avisos.map((aviso) => (
            <motion.div
              key={aviso.id}
              role={aviso.tipo === 'erro' ? 'alert' : 'status'}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40 }}
              className="pointer-events-auto flex max-w-sm items-start gap-2.5 rounded-lg border border-linha bg-superficie px-3.5 py-3 text-sm shadow-flutuante"
            >
              {aviso.tipo === 'sucesso' ? (
                <CheckCircle2 className="mt-px h-[18px] w-[18px] shrink-0 text-petroleo" />
              ) : (
                <XCircle className="mt-px h-[18px] w-[18px] shrink-0 text-vinho" />
              )}
              <span>{aviso.mensagem}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast deve ser usado dentro de <ToastProvider>');
  return ctx;
}
