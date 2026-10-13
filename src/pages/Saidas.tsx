import { Loader2, PackageMinus, Plus } from 'lucide-react';
import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { TabelaMovimentacoes } from '../components/TabelaMovimentacoes';
import { CabecalhoPagina, Campo, Carregando, Modal, Selecao } from '../components/ui';
import { useEstoque } from '../contexts/EstoqueContext';
import { useToast } from '../contexts/ToastContext';
import { hojeISO } from '../lib/format';
import { TIPOS_PECA } from '../lib/types';
import { extrairErros, saidaSchema, type ErrosFormulario } from '../lib/validation';

const VAZIO = { item_id: '', quantidade: '', data: '', responsavel: '', observacao: '' };

function FormularioSaida({ aoConcluir }: { aoConcluir(): void }) {
  const { itens, registrarSaida } = useEstoque();
  const { avisar } = useToast();
  const [valores, setValores] = useState({ ...VAZIO, data: hojeISO() });
  const [erros, setErros] = useState<ErrosFormulario>({});
  const [enviando, setEnviando] = useState(false);

  const disponiveis = useMemo(() => itens.filter((item) => item.saldo > 0), [itens]);
  const grupos = useMemo(
    () =>
      TIPOS_PECA.map((tipo) => ({
        tipo,
        itens: disponiveis
          .filter((item) => item.tipo === tipo)
          .sort((a, b) => a.publico.localeCompare(b.publico) || a.tamanho.localeCompare(b.tamanho, 'pt-BR', { numeric: true })),
      })).filter((grupo) => grupo.itens.length > 0),
    [disponiveis],
  );
  const selecionado = disponiveis.find((item) => item.id === valores.item_id);

  const alterar = (campo: keyof typeof VAZIO) => (e: { target: { value: string } }) =>
    setValores((v) => ({ ...v, [campo]: e.target.value }));

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    const resultado = saidaSchema.safeParse(valores);
    if (!resultado.success) {
      setErros(extrairErros(resultado.error));
      return;
    }
    if (selecionado && resultado.data.quantidade > selecionado.saldo) {
      setErros({ quantidade: `Há apenas ${selecionado.saldo} peça(s) disponível(is).` });
      return;
    }
    setErros({});
    setEnviando(true);
    try {
      await registrarSaida(resultado.data);
      avisar(`Saída de ${resultado.data.quantidade} peça(s) registrada.`);
      aoConcluir();
    } catch (err) {
      avisar(err instanceof Error ? err.message : 'Não foi possível registrar a saída.', 'erro');
    } finally {
      setEnviando(false);
    }
  }

  if (disponiveis.length === 0) {
    return (
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Não há peças em estoque no momento. Registre uma entrada antes de lançar uma saída.
      </p>
    );
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="grid gap-4 sm:grid-cols-2">
      <Selecao rotulo="Item" value={valores.item_id} onChange={alterar('item_id')} erro={erros.item_id} className="sm:col-span-2">
        <option value="">Selecione a peça…</option>
        {grupos.map((grupo) => (
          <optgroup key={grupo.tipo} label={grupo.tipo}>
            {grupo.itens.map((item) => (
              <option key={item.id} value={item.id}>
                {item.tipo} {item.publico.toLowerCase()} – tam. {item.tamanho} ({item.saldo} disponíveis)
              </option>
            ))}
          </optgroup>
        ))}
      </Selecao>
      <Campo
        rotulo="Quantidade"
        type="number"
        inputMode="numeric"
        min={1}
        max={selecionado?.saldo}
        value={valores.quantidade}
        onChange={alterar('quantidade')}
        erro={erros.quantidade}
      />
      <Campo rotulo="Data" type="date" value={valores.data} onChange={alterar('data')} erro={erros.data} />
      <Campo
        rotulo="Responsável pela retirada"
        value={valores.responsavel}
        onChange={alterar('responsavel')}
        erro={erros.responsavel}
        className="sm:col-span-2"
        autoComplete="name"
      />
      <Campo
        rotulo="Observação (opcional)"
        placeholder="Ex.: destino das peças"
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
          Registrar saída
        </button>
      </div>
    </form>
  );
}

export function Saidas() {
  const { carregando } = useEstoque();
  const [aberto, setAberto] = useState(false);
  const fechar = useCallback(() => setAberto(false), []);

  return (
    <>
      <CabecalhoPagina
        titulo="Saídas"
        descricao="Retiradas de peças para distribuição."
        acoes={
          <button type="button" className="btn-primary" onClick={() => setAberto(true)}>
            <Plus className="h-4 w-4" />
            Nova saída
          </button>
        }
      />
      {carregando ? (
        <Carregando />
      ) : (
        <TabelaMovimentacoes
          tipo="saida"
          iconeVazio={PackageMinus}
          textoVazio="Registre as retiradas de peças pelo botão “Nova saída”."
        />
      )}
      <Modal aberto={aberto} titulo="Nova saída" aoFechar={fechar}>
        <FormularioSaida aoConcluir={fechar} />
      </Modal>
    </>
  );
}
