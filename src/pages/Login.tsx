import { motion, useAnimationControls } from 'framer-motion';
import { Eye, EyeOff, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LogoSenai } from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';
import { CONTAS_DEMO, LoginBloqueado, servico } from '../data';
import { MAX_TENTATIVAS } from '../lib/limiteTentativas';

function formatarEspera(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

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
  const [liberaEm, setLiberaEm] = useState<number | null>(null);
  const [agora, setAgora] = useState(Date.now());
  const cartao = useAnimationControls();
  // Um leve "não" com a cabeça quando o acesso é recusado
  const recusar = (mensagem: string) => {
    setErro(mensagem);
    void cartao.start({ x: [0, -7, 6, -4, 3, 0], transition: { duration: 0.38 } });
  };

  useEffect(() => {
    document.title = 'Entrar';
  }, []);

  useEffect(() => {
    if (!liberaEm) return;
    const relogio = setInterval(() => {
      setAgora(Date.now());
      if (Date.now() >= liberaEm) {
        setLiberaEm(null);
        setErro(null);
      }
    }, 1000);
    return () => clearInterval(relogio);
  }, [liberaEm]);

  if (sessao) return <Navigate to={destino} replace />;

  const bloqueado = liberaEm !== null && agora < liberaEm;

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    if (!usuario.trim() || !senha) {
      recusar('Informe o nome de usuário e a senha.');
      return;
    }
    const situacao = servico.situacaoLogin(usuario);
    if (situacao.bloqueado) {
      setLiberaEm(situacao.liberaEm);
      setAgora(Date.now());
      setErro(null);
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      await entrar(usuario, senha);
      navigate(destino, { replace: true });
    } catch (e) {
      if (e instanceof LoginBloqueado) {
        setLiberaEm(e.liberaEm);
        setAgora(Date.now());
      } else {
        recusar(e instanceof Error ? e.message : 'Não foi possível entrar.');
      }
      setSenha('');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-fundo px-4 py-12">
      <motion.div className="w-full max-w-[380px]" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoSenai className="h-10" />
          <h1 className="mt-5 text-xl font-semibold tracking-tight">Logística que Aquece</h1>
        </div>

        <motion.div className="painel p-6" animate={cartao}>
          <form onSubmit={aoEnviar} className="space-y-4" noValidate>
            <div>
              <label htmlFor="usuario" className="rotulo">
                Nome de usuário
              </label>
              <input
                id="usuario"
                className="campo"
                autoComplete="username"
                autoCapitalize="none"
                autoFocus
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="senha" className="rotulo">
                Senha
              </label>
              <div className="relative">
                <input
                  id="senha"
                  type={mostrarSenha ? 'text' : 'password'}
                  className="campo pr-10"
                  autoComplete="current-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-suave hover:text-texto"
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {bloqueado ? (
              <div role="alert" className="flex gap-2.5 rounded-lg border border-vinho/25 bg-vinho-clara px-3 py-2.5 text-[13px] text-vinho">
                <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Acesso bloqueado após {MAX_TENTATIVAS} tentativas incorretas. Tente novamente em{' '}
                  <strong className="numero">{formatarEspera(liberaEm! - agora)}</strong>.
                </p>
              </div>
            ) : (
              erro && (
                <p role="alert" className="rounded-lg border border-vinho/25 bg-vinho-clara px-3 py-2.5 text-[13px] text-vinho">
                  {erro}
                </p>
              )
            )}

            <button type="submit" className="btn-brasa h-10 w-full" disabled={enviando || bloqueado}>
              {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
              Entrar
            </button>
          </form>
        </motion.div>

        <div className="mt-5 flex items-start gap-2.5 px-1 text-xs text-suave">
          <ShieldCheck className="mt-px h-4 w-4 shrink-0" />
          <p>
            Acesso restrito à equipe da campanha. Após {MAX_TENTATIVAS} tentativas incorretas em 15 minutos, o acesso é
            bloqueado temporariamente. Todas as ações ficam registradas.
          </p>
        </div>

        {servico.modo === 'demo' && (
          <div className="mt-5 rounded-lg border border-dashed border-linha px-4 py-3 text-xs">
            <p className="rotulo-mono mb-2">Contas de demonstração</p>
            <dl className="space-y-1">
              {CONTAS_DEMO.map((conta) => (
                <div key={conta.usuario} className="flex justify-between gap-3">
                  <dt className="text-suave">{conta.perfil}</dt>
                  <dd className="font-mono">
                    {conta.usuario} / {conta.senha}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </motion.div>
    </div>
  );
}
