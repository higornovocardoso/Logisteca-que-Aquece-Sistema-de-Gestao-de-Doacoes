import { DatabaseZap } from 'lucide-react';
import { LogoSenai } from './Logo';

/** Aparece quando o sistema é aberto sem as variáveis do Supabase (ex.: rodando localmente sem o .env). */
export function SemConfiguracao() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-fundo px-4 py-12">
      <div className="w-full max-w-[420px] animate-surgir text-center">
        <LogoSenai className="mx-auto h-10" />
        <h1 className="mt-5 text-xl font-semibold tracking-tight">Logística que Aquece</h1>
        <div className="painel mt-8 p-6 text-left">
          <div className="flex items-center gap-2.5">
            <DatabaseZap className="h-5 w-5 text-brasa" />
            <h2 className="font-semibold">Banco de dados não configurado</h2>
          </div>
          <p className="mt-3 text-sm text-suave">
            Copie o arquivo <code className="font-mono text-texto">.env.example</code> para <code className="font-mono text-texto">.env</code>,
            preencha a URL e a chave pública do projeto Supabase e reinicie o servidor. O passo a passo está no README.
          </p>
        </div>
      </div>
    </div>
  );
}
