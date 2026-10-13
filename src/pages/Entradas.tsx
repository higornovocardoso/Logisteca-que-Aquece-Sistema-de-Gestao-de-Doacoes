import { Loader2, PackagePlus, Plus } from 'lucide-react';
import { useCallback, useState, type FormEvent } from 'react';
import { TabelaMovimentacoes } from '../components/TabelaMovimentacoes';
import { CabecalhoPagina, Campo, Carregando, Modal, Selecao } from '../components/ui';
import { useEstoque } from '../contexts/EstoqueContext';
import { useToast } from '../contexts/ToastContext';
import { hojeISO } from '../lib/format';
import { PUBLICOS, TAMANHOS, TIPOS_PECA } from '../lib/types';
import { entradaSchema, extrairErros, type ErrosFormulario } from '../lib/validation';

const VAZIO = { tipo: '', tamanho: '', publico: '', quantidade: '', data: '', responsavel: '', observacao: '' };

function FormularioEntrada({ aoConcluir }: { aoConcluir(): void }) {
  const { registrarEntrada } = useEstoque();
  const { avisar } = useToast();
  const [valores, setValores] = useState({ ...VAZIO, data: hojeISO() });
  const [erros, setErros] = useState<ErrosFormulario>({});
  const [enviando, setEnviando] = useState(false);

  const alterar = (campo: keyof typeof VAZIO) => (e: { target: { value: string } }) =>
    setValores((v) => ({ ...v, [campo]: e.target.value }));

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    const resultado = entradaSchema.safeParse(valores);
    if (!resultado.success) {
      setErros(extrairErros(resultado.error));
      return;
    }
    setErros({});
    setEnviando(true);
    try {
      await registrarEntrada(resultado.data);
      avisar(`Entrada de ${resultado.data.quantidade} peça(s) registrada.`);
      aoConcluir();
    } catch (err) {
      avisar(err instanceof Error ? err.message : 'Não foi possível registrar a entrada.', 'erro');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="grid gap-4 sm:grid-cols-2">
      <Selecao rotulo="Tipo da peça" value={valores.tipo} onChange={alterar('tipo')} erro={erros.tipo} className="sm:col-span-2">
        <option value="">Selecione…</option>
        {TIPOS_PECA.map((t) => (
          <option key={t}>{t}</option>
        ))}
      </Selecao>
      <Selecao rotulo="Tamanho" value={valores.tamanho} onChange={alterar('tamanho')} erro={erros.tamanho}>
        <option value="">Selecione…</option>
        <optgroup label="Adulto">
          {TAMANHOS.slice(0, 6).map((t) => (
            <option key={t}>{t}</option>
          ))}
        </optgroup>
        <optgroup label="Infantil">
          {TAMANHOS.slice(6, 13).map((t) => (
            <option key={t}>{t}</option>
          ))}
        </optgroup>
        <option>Único</option>
      </Selecao>
      <Selecao rotulo="Público" value={valores.publico} onChange={alterar('publico')} erro={erros.publico}>
        <option value="">Selecione…</option>
        {PUBLICOS.map((p) => (
          <option key={p}>{p}</option>
        ))}
      </Selecao>
      <Campo
        rotulo="Quantidade"
        type="number"
        inputMode="numeric"
        min={1}
        value={valores.quantidade}
        onChange={alterar('quantidade')}
        erro={erros.quantidade}
      />
      <Campo rotulo="Data" type="date" value={valores.data} onChange={alterar('data')} erro={erros.data} />
      <Campo
        rotulo="Responsável pelo recebimento"
        value={valores.responsavel}
        onChange={alterar('responsavel')}
        erro={erros.responsavel}
        className="sm:col-span-2"
        autoComplete="name"
      />
      <Campo
        rotulo="Observação (opcional)"
        placeholder="Ex.: ponto de coleta, doador, estado das peças"
        value={valores.observacao}
        onChange={alterar('observacao')}
        erro={erros.observacao}
        className="sm:col-span-2"
      />
      <div className="flex justify-end gap-2 sm:col-span-2">
        <button type="button" className="btn-secondary" onClick={aoConcluir}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={enviando}>
          {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
          Registrar entrada
        </button>
      </div>
    </form>
  );
}

export function Entradas() {
  const { carregando } = useEstoque();
  const [aberto, setAberto] = useState(false);
  const fechar = useCallback(() => setAberto(false), []);

  return (
    <>
      <CabecalhoPagina
        titulo="Entradas"
        descricao="Doações recebidas pela campanha."
        acoes={
          <button type="button" className="btn-primary" onClick={() => setAberto(true)}>
            <Plus className="h-4 w-4" />
            Nova entrada
          </button>
        }
      />
      {carregando ? (
        <Carregando />
      ) : (
        <TabelaMovimentacoes
          tipo="entrada"
          iconeVazio={PackagePlus}
          textoVazio="Registre as doações recebidas pelo botão “Nova entrada”."
        />
      )}
      <Modal aberto={aberto} titulo="Nova entrada" aoFechar={fechar}>
        <FormularioEntrada aoConcluir={fechar} />
      </Modal>
    </>
  );
}
