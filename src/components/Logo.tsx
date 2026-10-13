/** Marca: um cabide (as roupas doadas) com uma brasa no gancho (o calor que elas levam). */
export function MarcaCabide({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        d="M24 15.5v-2.2a4.3 4.3 0 1 0-4.3-4.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M24 15.5 6.5 32.2a2.4 2.4 0 0 0 1.7 4.1h31.6a2.4 2.4 0 0 0 1.7-4.1Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <circle cx="31.5" cy="7.5" r="3.6" className="fill-brasa" />
    </svg>
  );
}

export function Logo({ claro = false }: { claro?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${claro ? 'text-white' : 'text-texto'}`}>
      <MarcaCabide className="h-8 w-8 shrink-0" />
      <div className="leading-tight">
        <p className="text-[15px] font-semibold tracking-tight">Logística que Aquece</p>
        <p className={`font-mono text-[11px] ${claro ? 'text-white/55' : 'text-suave'}`}>Controle de estoque</p>
      </div>
    </div>
  );
}
