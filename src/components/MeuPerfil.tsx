import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { servico } from '../data';
import { extrairErros, meuPerfilSchema, trocaDeSenhaSchema, type ErrosFormulario } from '../lib/validation';
import { Abas, Campo, Modal } from './ui';

type Aba = 'dados' | 'senha';

/** Janela em que cada pessoa, administradora ou não, altera o próprio nome e a própria senha. */
export function MeuPerfil({ aberto, aoFechar }: { aberto: boolean; aoFechar(): void }) {
  const [aba, setAba] = useState<Aba>('dados');

  return (
    <Modal aberto={aberto} titulo="Meu perfil" aoFechar={aoFechar} largura="max-w-md">
      {aberto && (
        <>
          <Abas<Aba>
            abas={[
              { id: 'dados', rotulo: 'Dados' },
              { id: 'senha', rotulo: 'Senha' },
            ]}
            ativa={aba}
            aoTrocar={setAba}
          />
          {aba === 'dados' ? <FormularioDados aoFechar={aoFechar} /> : <FormularioSenha aoFechar={aoFechar} />}
        </>
      )}
    </Modal>
  );
}

function useEnvio(aoFechar: () => void) {
  const { avisar } = useToast();
  const [processando, setProcessando] = useState(false);

  async function enviar(acao: () => Promise<void>, sucesso: string) {
    setProcessando(true);
    try {
      await acao();
      avisar(sucesso);
      aoFechar();
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Não foi possível concluir a operação.', 'erro');
    } finally {
      setProcessando(false);
    }
  }

  return { processando, enviar };
}

function Rodape({ processando, texto, aoCancelar }: { processando: boolean; texto: string; aoCancelar(): void }) {
  return (
    <div className="flex justify-end gap-2 border-t border-linha pt-4">
      <button type="button" className="btn-contorno" onClick={aoCancelar}>
        Cancelar
      </button>
      <button type="submit" className="btn-brasa" disabled={processando}>
        {processando && <Loader2 className="h-4 w-4 animate-spin" />}
        {texto}
      </button>
    </div>
  );
}

function FormularioDados({ aoFechar }: { aoFechar(): void }) {
  const { sessao, atualizarSessao } = useAuth();
  const [valores, setValores] = useState({ nome: sessao?.nome ?? '', usuario: sessao?.usuario ?? '', senhaAtual: '' });
  const [erros, setErros] = useState<ErrosFormulario>({});
  const { processando, enviar } = useEnvio(aoFechar);
  const alterar = (campo: keyof typeof valores) => (e: { target: { value: string } }) => setValores((v) => ({ ...v, [campo]: e.target.value }));
  const trocandoUsuario = valores.usuario.trim().toLowerCase() !== (sessao?.usuario ?? '').toLowerCase();

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    const resultado = meuPerfilSchema.safeParse(valores);
    const novosErros = resultado.success ? {} : extrairErros(resultado.error);
    if (trocandoUsuario && !valores.senhaAtual) novosErros.senhaAtual = 'Confirme com a sua senha atual';
    setErros(novosErros);
    if (!resultado.success || Object.keys(novosErros).length) return;

    const { nome, usuario } = resultado.data;
    await enviar(async () => {
      if (nome !== sessao?.nome) await servico.atualizarMeuPerfil(nome);
      if (trocandoUsuario) await servico.alterarMeuUsuario(usuario, valores.senhaAtual);
      await atualizarSessao();
    }, trocandoUsuario ? `Pronto. No próximo acesso, entre com "${usuario}".` : 'Perfil atualizado.');
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="space-y-4">
      <Campo rotulo="Nome" value={valores.nome} onChange={alterar('nome')} erro={erros.nome} autoComplete="name" />
      <Campo
        rotulo="Nome de usuário"
        value={valores.usuario}
        onChange={alterar('usuario')}
        erro={erros.usuario}
        dica="Usado para entrar no sistema. Sem espaços nem acentos."
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
      />
      <AnimatePresence initial={false}>
        {trocandoUsuario && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <Campo
              rotulo="Senha atual"
              type="password"
              value={valores.senhaAtual}
              onChange={alterar('senhaAtual')}
              erro={erros.senhaAtual}
              dica="Por segurança, confirme a senha para trocar o nome de usuário."
              autoComplete="current-password"
            />
          </motion.div>
        )}
      </AnimatePresence>
      <Campo rotulo="Perfil" value={sessao?.perfil ?? ''} disabled dica="O perfil é definido por um administrador." />
      <Rodape processando={processando} texto="Salvar" aoCancelar={aoFechar} />
    </form>
  );
}

function FormularioSenha({ aoFechar }: { aoFechar(): void }) {
  const [valores, setValores] = useState({ senhaAtual: '', novaSenha: '', confirmacao: '' });
  const [erros, setErros] = useState<ErrosFormulario>({});
  const { processando, enviar } = useEnvio(aoFechar);
  const alterar = (campo: keyof typeof valores) => (e: { target: { value: string } }) => setValores((v) => ({ ...v, [campo]: e.target.value }));

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    const resultado = trocaDeSenhaSchema.safeParse(valores);
    if (!resultado.success) return setErros(extrairErros(resultado.error));
    setErros({});
    await enviar(() => servico.trocarMinhaSenha(valores.senhaAtual, valores.novaSenha), 'Senha alterada.');
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="space-y-4">
      <Campo
        rotulo="Senha atual"
        type="password"
        value={valores.senhaAtual}
        onChange={alterar('senhaAtual')}
        erro={erros.senhaAtual}
        autoComplete="current-password"
      />
      <Campo
        rotulo="Nova senha"
        type="password"
        value={valores.novaSenha}
        onChange={alterar('novaSenha')}
        erro={erros.novaSenha}
        dica="Mínimo de 8 caracteres."
        autoComplete="new-password"
      />
      <Campo
        rotulo="Confirme a nova senha"
        type="password"
        value={valores.confirmacao}
        onChange={alterar('confirmacao')}
        erro={erros.confirmacao}
        autoComplete="new-password"
      />
      <Rodape processando={processando} texto="Trocar senha" aoCancelar={aoFechar} />
    </form>
  );
}
