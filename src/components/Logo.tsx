import { Flame } from 'lucide-react';

export function Logo({ compacto = false }: { compacto?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 shadow-md shadow-orange-500/20">
        <Flame className="h-6 w-6 text-white" />
      </div>
      {!compacto && (
        <div className="leading-tight">
          <p className="text-base font-extrabold tracking-tight">Logística que Aquece</p>
          <p className="text-xs text-slate-400">Gestão de doações</p>
        </div>
      )}
    </div>
  );
}
