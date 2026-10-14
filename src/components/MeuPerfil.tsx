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
  const [nome, setNome] = useState(sessao?.nome ?? '');
  const [erros, setErros] = useState<ErrosFormulario>({});
  const { processando, enviar } = useEnvio(aoFechar);

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    const resultado = meuPerfilSchema.safeParse({ nome });
    if (!resultado.success) return setErros(extrairErros(resultado.error));
    setErros({});
    await enviar(async () => {
      await servico.atualizarMeuPerfil(resultado.data.nome);
      await atualizarSessao();
    }, 'Perfil atualizado.');
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="space-y-4">
      <Campo rotulo="Nome" value={nome} onChange={(e) => setNome(e.target.value)} erro={erros.nome} autoComplete="name" />
      <Campo rotulo="Nome de usuário" value={sessao?.usuario ?? ''} disabled dica="Usado para entrar no sistema. Não pode ser alterado." />
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
        dica="Mínimo de 6 caracteres."
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
