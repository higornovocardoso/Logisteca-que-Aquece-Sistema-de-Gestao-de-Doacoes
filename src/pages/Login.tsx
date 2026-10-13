import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, LogIn, Snowflake } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';
import { fonte } from '../data';

export function Login() {
  const { sessao, entrar } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destino = (location.state as { de?: string } | null)?.de ?? '/';

  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (sessao) return <Navigate to={destino} replace />;

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    if (!usuario.trim() || !senha) {
      setErro('Informe o usuário e a senha.');
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      await entrar(usuario, senha);
      navigate(destino, { replace: true });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível entrar.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-primary p-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl" />
        <Logo />
        <div className="relative my-auto max-w-md">
          <Snowflake className="mb-6 h-10 w-10 text-blue-200/70" />
          <h1 className="text-4xl font-extrabold leading-tight">
            Cada peça doada é um inverno mais quente para alguém.
          </h1>
          <p className="mt-4 text-blue-100/80">
            Sistema de gestão das doações da campanha de agasalhos do SENAI com a Rede Feminina de Garopaba: entradas,
            saídas, estoque e relatórios em um só lugar.
          </p>
        </div>
        <p className="relative text-xs text-blue-100/50">Garopaba · SC · Inverno de 2025</p>
      </section>

      <section className="flex items-center justify-center px-4 py-12 sm:px-8">
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h2 className="text-2xl font-bold text-primary dark:text-white">Entrar</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Acesse com seu usuário e senha.</p>

          <form onSubmit={aoEnviar} className="mt-8 space-y-5" noValidate>
            <div>
              <label htmlFor="usuario" className="label">
                Usuário
              </label>
              <input
                id="usuario"
                className="input"
                autoComplete="username"
                autoFocus
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="senha" className="label">
                Senha
              </label>
              <div className="relative">
                <input
                  id="senha"
                  type={mostrarSenha ? 'text' : 'password'}
                  className="input pr-11"
                  autoComplete="current-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {erro && (
              <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                {erro}
              </p>
            )}

            <button type="submit" className="btn-primary w-full py-3" disabled={enviando}>
              {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              Entrar
            </button>
          </form>

          {fonte.modo === 'demo' && (
            <div className="mt-8 rounded-xl border border-dashed border-slate-300 p-4 text-sm dark:border-slate-700">
              <p className="font-semibold text-slate-700 dark:text-slate-200">Acesso de demonstração</p>
              <p className="mt-1 text-slate-500 dark:text-slate-400">
                Usuário <code className="font-semibold text-slate-700 dark:text-slate-200">Visitante</code> · senha{' '}
                <code className="font-semibold text-slate-700 dark:text-slate-200">Visitante</code>
              </p>
            </div>
          )}
        </motion.div>
      </section>
    </div>
  );
}
