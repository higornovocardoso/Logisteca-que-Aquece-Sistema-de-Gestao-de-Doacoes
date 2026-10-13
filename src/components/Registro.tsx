import { Loader2 } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useEstoque } from '../contexts/EstoqueContext';
import { useToast } from '../contexts/ToastContext';
import { hojeISO } from '../lib/format';
import { codigoDoItem } from '../lib/sku';
import {
  GENEROS,
  MOTIVOS_DESCARTE,
  TAMANHOS_ADULTO,
  TAMANHOS_INFANTIL,
  TIPOS_PECA,
  type TipoMovimentacao,
} from '../lib/types';
import { descarteSchema, entradaSchema, extrairErros, saidaSchema, type ErrosFormulario } from '../lib/validation';
import { AreaDeTexto, Campo, Escolha, Modal, Selecao } from './ui';

interface RegistroContextValue {
  abrir(tipo: TipoMovimentacao, itemId?: string): void;
}

const RegistroContext = createContext<RegistroContextValue | null>(null);

const TITULOS: Record<TipoMovimentacao, { titulo: string; descricao: string }> = {
  entrada: { titulo: 'Registrar entrada', descricao: 'Peças recebidas como doação.' },
  saida: { titulo: 'Registrar saída', descricao: 'Peças retiradas para distribuição.' },
  descarte: { titulo: 'Registrar descarte', descricao: 'Peças sem condições de uso, retiradas do estoque.' },
};

export function RegistroProvider({ children }: { children: ReactNode }) {
  const [aberto, setAberto] = useState<{ tipo: TipoMovimentacao; itemId?: string; chave: number } | null>(null);
  const abrir = useCallback((tipo: TipoMovimentacao, itemId?: string) => setAberto({ tipo, itemId, chave: Date.now() }), []);
  const fechar = useCallback(() => setAberto(null), []);
  const value = useMemo(() => ({ abrir }), [abrir]);

  return (
    <RegistroContext.Provider value={value}>
      {children}
      <Modal
        aberto={!!aberto}
        titulo={aberto ? TITULOS[aberto.tipo].titulo : ''}
        descricao={aberto ? TITULOS[aberto.tipo].descricao : undefined}
        aoFechar={fechar}
      >
        {aberto?.tipo === 'entrada' && <FormularioEntrada key={aberto.chave} aoConcluir={fechar} />}
        {aberto && aberto.tipo !== 'entrada' && (
          <FormularioRetirada key={aberto.chave} tipo={aberto.tipo} itemInicial={aberto.itemId} aoConcluir={fechar} />
        )}
      </Modal>
    </RegistroContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRegistro() {
  const ctx = useContext(RegistroContext);
  if (!ctx) throw new Error('useRegistro deve ser usado dentro de <RegistroProvider>');
  return ctx;
}

function Rodape({ enviando, rotulo, continuar, aoContinuar, aoCancelar }: {
  enviando: boolean;
  rotulo: string;
  continuar: boolean;
  aoContinuar(valor: boolean): void;
  aoCancelar(): void;
}) {
  return (
    <div className="col-span-full mt-2 flex flex-col-reverse gap-3 border-t border-linha pt-4 sm:flex-row sm:items-center sm:justify-between">
      <label className="flex cursor-pointer items-center gap-2 text-[13px] text-suave">
        <input
          type="checkbox"
          checked={continuar}
          onChange={(e) => aoContinuar(e.target.checked)}
          className="h-4 w-4 rounded border-linha accent-[rgb(var(--brasa))]"
        />
        Continuar registrando
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-contorno" onClick={aoCancelar}>
          Cancelar
        </button>
        <button type="submit" className="btn-brasa" disabled={enviando}>
          {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
          {rotulo}
        </button>
      </div>
    </div>
  );
}

function FormularioEntrada({ aoConcluir }: { aoConcluir(): void }) {
  const { registrarEntrada, movimentacoes } = useEstoque();
  const { sessao } = useAuth();
  const { avisar } = useToast();
  const inicial = { tipo: '', tamanho: '', genero: '', quantidade: '', data: hojeISO(), fornecedor: '', responsavel: sessao?.nome ?? '', observacao: '' };
  const [valores, setValores] = useState(inicial);
  const [erros, setErros] = useState<ErrosFormulario>({});
  const [enviando, setEnviando] = useState(false);
  const [continuar, setContinuar] = useState(false);

  const fornecedores = useMemo(
    () => [...new Set(movimentacoes.flatMap((m) => (m.fornecedor ? [m.fornecedor] : [])))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [movimentacoes],
  );

  const alterar = (campo: keyof typeof inicial) => (e: { target: { value: string } }) =>
    setValores((v) => ({ ...v, [campo]: e.target.value }));

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    const resultado = entradaSchema.safeParse(valores);
    if (!resultado.success) return setErros(extrairErros(resultado.error));
    setErros({});
    setEnviando(true);
    try {
      await registrarEntrada(resultado.data);
      avisar(`Entrada registrada: ${resultado.data.quantidade} × ${codigoDoItem(resultado.data)}`);
      if (continuar) setValores((v) => ({ ...v, tipo: '', tamanho: '', genero: '', quantidade: '', observacao: '' }));
      else aoConcluir();
    } catch (err) {
      avisar(err instanceof Error ? err.message : 'Não foi possível registrar a entrada.', 'erro');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="grid gap-4 sm:grid-cols-2">
      <Selecao rotulo="Tipo de peça" value={valores.tipo} onChange={alterar('tipo')} erro={erros.tipo}>
        <option value="">Selecione…</option>
        {TIPOS_PECA.map((t) => (
          <option key={t}>{t}</option>
        ))}
      </Selecao>
      <Selecao rotulo="Tamanho" value={valores.tamanho} onChange={alterar('tamanho')} erro={erros.tamanho}>
        <option value="">Selecione…</option>
        <optgroup label="Adulto">
          {TAMANHOS_ADULTO.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </optgroup>
        <optgroup label="Infantil">
          {TAMANHOS_INFANTIL.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </optgroup>
        <option>Único</option>
      </Selecao>
      <div className="sm:col-span-2">
        <Escolha rotulo="Gênero" opcoes={GENEROS} valor={valores.genero} aoEscolher={(genero) => setValores((v) => ({ ...v, genero }))} erro={erros.genero} />
      </div>
      <Campo rotulo="Quantidade" type="number" inputMode="numeric" min={1} value={valores.quantidade} onChange={alterar('quantidade')} erro={erros.quantidade} />
      <Campo rotulo="Data do recebimento" type="date" value={valores.data} onChange={alterar('data')} erro={erros.data} />
      <Campo
        rotulo="Fornecedor"
        list="fornecedores-conhecidos"
        placeholder="Quem doou as peças"
        value={valores.fornecedor}
        onChange={alterar('fornecedor')}
        erro={erros.fornecedor}
      />
      <datalist id="fornecedores-conhecidos">
        {fornecedores.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>
      <Campo rotulo="Recebido por" value={valores.responsavel} onChange={alterar('responsavel')} erro={erros.responsavel} autoComplete="name" />
      <AreaDeTexto
        rotulo="Observação (opcional)"
        placeholder="Ex.: estado das peças, ponto de coleta"
        value={valores.observacao}
        onChange={alterar('observacao')}
        erro={erros.observacao}
        className="sm:col-span-2"
      />
      <Rodape enviando={enviando} rotulo="Registrar entrada" continuar={continuar} aoContinuar={setContinuar} aoCancelar={aoConcluir} />
    </form>
  );
}

function FormularioRetirada({
  tipo,
  itemInicial,
  aoConcluir,
}: {
  tipo: 'saida' | 'descarte';
  itemInicial?: string;
  aoConcluir(): void;
}) {
  const { itens, registrarSaida, registrarDescarte } = useEstoque();
  const { sessao } = useAuth();
  const { avisar } = useToast();
  const inicial = { item_id: itemInicial ?? '', quantidade: '', data: hojeISO(), responsavel: tipo === 'descarte' ? (sessao?.nome ?? '') : '', motivo: '', observacao: '' };
  const [valores, setValores] = useState(inicial);
  const [erros, setErros] = useState<ErrosFormulario>({});
  const [enviando, setEnviando] = useState(false);
  const [continuar, setContinuar] = useState(false);

  const grupos = useMemo(
    () =>
      TIPOS_PECA.map((t) => ({
        tipo: t,
        itens: itens
          .filter((item) => item.tipo === t && item.saldo > 0)
          .sort((a, b) => codigoDoItem(a).localeCompare(codigoDoItem(b), 'pt-BR', { numeric: true })),
      })).filter((g) => g.itens.length > 0),
    [itens],
  );
  const selecionado = itens.find((item) => item.id === valores.item_id);
  const ehDescarte = tipo === 'descarte';

  const alterar = (campo: keyof typeof inicial) => (e: { target: { value: string } }) =>
    setValores((v) => ({ ...v, [campo]: e.target.value }));

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    const resultado = (ehDescarte ? descarteSchema : saidaSchema).safeParse(valores);
    if (!resultado.success) return setErros(extrairErros(resultado.error));
    if (selecionado && resultado.data.quantidade > selecionado.saldo) {
      return setErros({ quantidade: `Há ${selecionado.saldo} peça(s) disponível(is) deste item.` });
    }
    setErros({});
    setEnviando(true);
    try {
      if (ehDescarte) await registrarDescarte(descarteSchema.parse(valores));
      else await registrarSaida(resultado.data);
      avisar(`${ehDescarte ? 'Descarte registrado' : 'Saída registrada'}: ${resultado.data.quantidade} × ${selecionado ? codigoDoItem(selecionado) : 'item'}`);
      if (continuar) setValores((v) => ({ ...v, item_id: '', quantidade: '', observacao: '' }));
      else aoConcluir();
    } catch (err) {
      avisar(err instanceof Error ? err.message : 'Não foi possível concluir o registro.', 'erro');
    } finally {
      setEnviando(false);
    }
  }

  if (grupos.length === 0) {
    return <p className="text-sm text-suave">Não há peças em estoque. Registre uma entrada antes.</p>;
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="grid gap-4 sm:grid-cols-2">
      <Selecao
        rotulo="Item"
        value={valores.item_id}
        onChange={alterar('item_id')}
        erro={erros.item_id}
        dica={selecionado ? `${selecionado.saldo} peça(s) em estoque` : undefined}
        className="sm:col-span-2"
      >
        <option value="">Selecione a peça…</option>
        {grupos.map((grupo) => (
          <optgroup key={grupo.tipo} label={grupo.tipo}>
            {grupo.itens.map((item) => (
              <option key={item.id} value={item.id}>
                {codigoDoItem(item)} · {item.tipo} {item.genero.toLowerCase()} {item.tamanho} · {item.saldo} em estoque
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
      {ehDescarte && (
        <Selecao rotulo="Motivo" value={valores.motivo} onChange={alterar('motivo')} erro={erros.motivo}>
          <option value="">Selecione…</option>
          {MOTIVOS_DESCARTE.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </Selecao>
      )}
      <Campo
        rotulo={ehDescarte ? 'Responsável pela triagem' : 'Retirado por'}
        value={valores.responsavel}
        onChange={alterar('responsavel')}
        erro={erros.responsavel}
        className={ehDescarte ? '' : 'sm:col-span-2'}
        autoComplete="name"
      />
      <AreaDeTexto
        rotulo="Observação (opcional)"
        placeholder={ehDescarte ? 'Ex.: detalhes do defeito' : 'Ex.: destino das peças'}
        value={valores.observacao}
        onChange={alterar('observacao')}
        erro={erros.observacao}
        className="sm:col-span-2"
      />
      <Rodape
        enviando={enviando}
        rotulo={ehDescarte ? 'Registrar descarte' : 'Registrar saída'}
        continuar={continuar}
        aoContinuar={setContinuar}
        aoCancelar={aoConcluir}
      />
    </form>
  );
}
