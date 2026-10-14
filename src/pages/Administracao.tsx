import { format, parseISO } from 'date-fns';
import { AlertTriangle, Download, History, KeyRound, Loader2, Pencil, Plus, Power, RotateCcw, Search, Trash2, Upload, UserRound } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Abas, CabecalhoPagina, Campo, Carregando, Confirmacao, EstadoVazio, Modal, Selecao, Selo } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useEstoque } from '../contexts/EstoqueContext';
import { useToast } from '../contexts/ToastContext';
import { servico, type DadosEstoque } from '../data';
import { gerarBackup, lerBackup, nomeDoArquivoDeBackup, TAMANHO_MAXIMO_DO_BACKUP } from '../lib/backup';
import { formatarNumero } from '../lib/format';
import { baixarArquivo, exportarCSV } from '../lib/relatorios';
import { PERFIS, type AcaoAtividade, type Atividade, type Usuario } from '../lib/types';
import { edicaoUsuarioSchema, extrairErros, novoUsuarioSchema, type ErrosFormulario } from '../lib/validation';

type Aba = 'usuarios' | 'atividades' | 'dados';

export function Administracao() {
  const [aba, setAba] = useState<Aba>('usuarios');
  return (
    <>
      <CabecalhoPagina titulo="Administração" descricao="Usuários, registro de atividades e dados do sistema." />
      <Abas<Aba>
        abas={[
          { id: 'usuarios', rotulo: 'Usuários' },
          { id: 'atividades', rotulo: 'Registro de atividades' },
          { id: 'dados', rotulo: 'Dados e backup' },
        ]}
        ativa={aba}
        aoTrocar={setAba}
      />
      {aba === 'usuarios' && <Usuarios />}
      {aba === 'atividades' && <Atividades />}
      {aba === 'dados' && <Dados />}
    </>
  );
}

/* ───────────────────────── Usuários ───────────────────────── */

function Usuarios() {
  const { sessao, atualizarSessao } = useAuth();
  const { avisar } = useToast();
  const [usuarios, setUsuarios] = useState<Usuario[] | null>(null);
  const [editando, setEditando] = useState<Usuario | 'novo' | null>(null);
  const [removendo, setRemovendo] = useState<Usuario | null>(null);
  const [processando, setProcessando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setUsuarios(await servico.listarUsuarios());
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Não foi possível carregar os usuários.', 'erro');
      setUsuarios([]);
    }
  }, [avisar]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function executar(acao: () => Promise<void>, sucesso: string) {
    setProcessando(true);
    try {
      await acao();
      avisar(sucesso);
      await Promise.all([carregar(), atualizarSessao()]);
      return true;
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Não foi possível concluir a operação.', 'erro');
      return false;
    } finally {
      setProcessando(false);
    }
  }

  if (!usuarios) return <Carregando />;

  return (
    <section className="painel overflow-hidden">
      <header className="flex flex-col gap-3 border-b border-linha px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[15px] font-semibold">Equipe</h2>
          <p className="mt-0.5 text-xs text-suave">
            Administradores gerenciam usuários, dados e exclusões. Operadores registram entradas, saídas e descartes.
          </p>
        </div>
        <button type="button" className="btn-brasa shrink-0" onClick={() => setEditando('novo')}>
          <Plus className="h-4 w-4" />
          Novo usuário
        </button>
      </header>

      <div className="overflow-x-auto">
        <table className="tabela">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Usuário</th>
              <th>Perfil</th>
              <th>Situação</th>
              <th>Desde</th>
              <th className="w-28">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => {
              const eu = u.id === sessao?.id;
              return (
                <tr key={u.id}>
                  <td>
                    <span className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-fundo text-suave">
                        <UserRound className="h-3.5 w-3.5" />
                      </span>
                      <span className="font-medium">{u.nome}</span>
                      {eu && <span className="text-xs text-suave">(você)</span>}
                    </span>
                  </td>
                  <td className="sku">{u.usuario}</td>
                  <td>
                    <Selo cor={u.perfil === 'Administrador' ? 'petroleo' : 'neutro'}>{u.perfil}</Selo>
                  </td>
                  <td>
                    <span className="flex items-center gap-1.5 text-[13px]">
                      <span className={`h-1.5 w-1.5 rounded-full ${u.ativo ? 'bg-petroleo' : 'bg-suave/50'}`} />
                      {u.ativo ? 'Ativo' : 'Desativado'}
                    </span>
                  </td>
                  <td className="numero text-[13px] text-suave">{format(parseISO(u.created_at), 'dd/MM/yyyy')}</td>
                  <td>
                    <div className="flex justify-end gap-0.5">
                      <button type="button" className="btn-icone" title="Editar" aria-label={`Editar ${u.nome}`} onClick={() => setEditando(u)}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      {!eu && (
                        <button
                          type="button"
                          className="btn-icone"
                          title={u.ativo ? 'Desativar' : 'Reativar'}
                          aria-label={`${u.ativo ? 'Desativar' : 'Reativar'} ${u.nome}`}
                          disabled={processando}
                          onClick={() =>
                            void executar(
                              () => servico.alterarUsuario(u.id, { nome: u.nome, ativo: !u.ativo }),
                              u.ativo ? `${u.nome} foi desativado.` : `${u.nome} foi reativado.`,
                            )
                          }
                        >
                          <Power className="h-4 w-4" />
                        </button>
                      )}
                      {!eu && (
                        <button type="button" className="btn-icone hover:text-vinho" title="Remover" aria-label={`Remover ${u.nome}`} onClick={() => setRemovendo(u)}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal
        aberto={editando !== null}
        titulo={editando === 'novo' ? 'Novo usuário' : 'Editar usuário'}
        descricao={editando === 'novo' ? 'A pessoa entra no sistema com o nome de usuário e a senha definidos aqui.' : undefined}
        aoFechar={() => setEditando(null)}
      >
        {editando && (
          <FormularioUsuario
            usuario={editando === 'novo' ? null : editando}
            processando={processando}
            aoSalvar={async (dados) => {
              const ok =
                editando === 'novo'
                  ? await executar(() => servico.criarUsuario(dados as never), `Usuário ${dados.usuario} criado.`)
                  : await executar(
                      () =>
                        servico.alterarUsuario(editando.id, {
                          nome: dados.nome,
                          perfil: dados.perfil,
                          senha: dados.senha || undefined,
                          usuario: dados.usuario.trim().toLowerCase() !== editando.usuario.toLowerCase() ? dados.usuario.trim() : undefined,
                        }),
                      'Alterações salvas.',
                    );
              if (ok) setEditando(null);
            }}
            aoCancelar={() => setEditando(null)}
          />
        )}
      </Modal>

      <Confirmacao
        aberto={!!removendo}
        titulo="Remover usuário"
        textoConfirmar="Remover"
        processando={processando}
        mensagem={
          <>
            <strong className="text-texto">{removendo?.nome}</strong> perderá o acesso ao sistema. Os registros feitos por essa pessoa continuam no
            histórico. Para suspender o acesso temporariamente, prefira desativar.
          </>
        }
        aoCancelar={() => setRemovendo(null)}
        aoConfirmar={() =>
          void executar(() => servico.removerUsuario(removendo!.id), `${removendo!.nome} foi removido.`).then((ok) => ok && setRemovendo(null))
        }
      />
    </section>
  );
}

function FormularioUsuario({
  usuario,
  processando,
  aoSalvar,
  aoCancelar,
}: {
  usuario: Usuario | null;
  processando: boolean;
  aoSalvar(dados: { nome: string; usuario: string; perfil: Usuario['perfil']; senha: string }): Promise<void>;
  aoCancelar(): void;
}) {
  const [valores, setValores] = useState({
    nome: usuario?.nome ?? '',
    usuario: usuario?.usuario ?? '',
    perfil: usuario?.perfil ?? 'Operador',
    senha: '',
  });
  const [erros, setErros] = useState<ErrosFormulario>({});
  const alterar = (campo: keyof typeof valores) => (e: { target: { value: string } }) => setValores((v) => ({ ...v, [campo]: e.target.value }));

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    const resultado = (usuario ? edicaoUsuarioSchema : novoUsuarioSchema).safeParse(valores);
    if (!resultado.success) return setErros(extrairErros(resultado.error));
    setErros({});
    await aoSalvar({ ...valores, perfil: valores.perfil as Usuario['perfil'] });
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="space-y-4">
      <Campo rotulo="Nome" value={valores.nome} onChange={alterar('nome')} erro={erros.nome} autoComplete="off" />
      <Campo
        rotulo="Nome de usuário"
        value={valores.usuario}
        onChange={alterar('usuario')}
        erro={erros.usuario}
        dica={
          usuario && valores.usuario.trim().toLowerCase() !== usuario.usuario.toLowerCase()
            ? `A pessoa passa a entrar com "${valores.usuario.trim()}"; a senha continua a mesma.`
            : 'Usado para entrar no sistema. Sem espaços nem acentos.'
        }
        autoComplete="off"
        autoCapitalize="none"
      />
      <Selecao rotulo="Perfil" value={valores.perfil} onChange={alterar('perfil')} erro={erros.perfil}>
        {PERFIS.map((p) => (
          <option key={p}>{p}</option>
        ))}
      </Selecao>
      <Campo
        rotulo={usuario ? 'Nova senha (opcional)' : 'Senha'}
        type="password"
        value={valores.senha}
        onChange={alterar('senha')}
        erro={erros.senha}
        dica={usuario ? 'Deixe em branco para manter a senha atual.' : 'Mínimo de 8 caracteres.'}
        autoComplete="new-password"
      />
      <div className="flex justify-end gap-2 border-t border-linha pt-4">
        <button type="button" className="btn-contorno" onClick={aoCancelar}>
          Cancelar
        </button>
        <button type="submit" className="btn-brasa" disabled={processando}>
          {processando && <Loader2 className="h-4 w-4 animate-spin" />}
          {usuario ? 'Salvar alterações' : 'Criar usuário'}
        </button>
      </div>
    </form>
  );
}

/* ───────────────────── Registro de atividades ───────────────────── */

const ACOES: Record<AcaoAtividade, { rotulo: string; cor: 'petroleo' | 'brasa' | 'vinho' | 'trigo' | 'neutro' }> = {
  login: { rotulo: 'Login', cor: 'neutro' },
  logout: { rotulo: 'Logout', cor: 'neutro' },
  login_bloqueado: { rotulo: 'Acesso bloqueado', cor: 'vinho' },
  entrada: { rotulo: 'Entrada', cor: 'petroleo' },
  saida: { rotulo: 'Saída', cor: 'brasa' },
  descarte: { rotulo: 'Descarte', cor: 'vinho' },
  exclusao: { rotulo: 'Exclusão', cor: 'vinho' },
  usuario_criado: { rotulo: 'Usuário', cor: 'trigo' },
  usuario_alterado: { rotulo: 'Usuário', cor: 'trigo' },
  usuario_removido: { rotulo: 'Usuário', cor: 'trigo' },
  backup_exportado: { rotulo: 'Dados', cor: 'trigo' },
  backup_importado: { rotulo: 'Dados', cor: 'trigo' },
  dados_limpos: { rotulo: 'Dados', cor: 'vinho' },
};

const CATEGORIAS: Record<string, AcaoAtividade[]> = {
  Movimentações: ['entrada', 'saida', 'descarte', 'exclusao'],
  Acessos: ['login', 'logout', 'login_bloqueado'],
  Usuários: ['usuario_criado', 'usuario_alterado', 'usuario_removido'],
  Dados: ['backup_exportado', 'backup_importado', 'dados_limpos'],
};

const POR_PAGINA = 25;

function Atividades() {
  const { avisar } = useToast();
  const [atividades, setAtividades] = useState<Atividade[] | null>(null);
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('');
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    servico
      .listarAtividades()
      .then(setAtividades)
      .catch((e: unknown) => {
        avisar(e instanceof Error ? e.message : 'Não foi possível carregar o registro.', 'erro');
        setAtividades([]);
      });
  }, [avisar]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (atividades ?? []).filter(
      (a) =>
        (!categoria || CATEGORIAS[categoria].includes(a.acao)) &&
        (!termo || a.usuario.toLowerCase().includes(termo) || a.descricao.toLowerCase().includes(termo)),
    );
  }, [atividades, busca, categoria]);

  if (!atividades) return <Carregando />;

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);

  return (
    <section className="painel overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-linha p-3">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-suave" />
          <input
            className="campo pl-9"
            placeholder="Buscar por pessoa ou descrição…"
            aria-label="Buscar atividade"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(1);
            }}
          />
        </div>
        <select
          className="campo w-auto"
          aria-label="Categoria"
          value={categoria}
          onChange={(e) => {
            setCategoria(e.target.value);
            setPagina(1);
          }}
        >
          <option value="">Todas as ações</option>
          {Object.keys(CATEGORIAS).map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <button
          type="button"
          className="btn-contorno"
          disabled={filtradas.length === 0}
          onClick={() =>
            void exportarCSV({
              colunas: ['Data e hora', 'Usuário', 'Ação', 'Descrição'],
              linhas: filtradas.map((a) => [format(parseISO(a.momento), 'dd/MM/yyyy HH:mm'), a.usuario, ACOES[a.acao].rotulo, a.descricao]),
              nomeArquivo: `registro-de-atividades-${new Date().toISOString().slice(0, 10)}`,
            })
          }
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </button>
      </div>

      {filtradas.length === 0 ? (
        <EstadoVazio icone={History} titulo="Nenhuma atividade encontrada" />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Data e hora</th>
                  <th>Usuário</th>
                  <th>Ação</th>
                  <th>Descrição</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA).map((a) => (
                  <tr key={a.id}>
                    <td className="numero whitespace-nowrap text-[13px] text-suave">{format(parseISO(a.momento), 'dd/MM/yyyy HH:mm')}</td>
                    <td className="whitespace-nowrap font-medium">{a.usuario}</td>
                    <td>
                      <Selo cor={ACOES[a.acao].cor}>{ACOES[a.acao].rotulo}</Selo>
                    </td>
                    <td className="text-[13px]">{a.descricao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <footer className="flex flex-col items-center justify-between gap-3 border-t border-linha px-4 py-2.5 text-[13px] text-suave sm:flex-row">
            <span>
              <span className="numero text-texto">{formatarNumero(filtradas.length)}</span> atividades
            </span>
            {totalPaginas > 1 && (
              <div className="flex items-center gap-2">
                <button type="button" className="btn-contorno h-8 px-3" disabled={paginaAtual === 1} onClick={() => setPagina(paginaAtual - 1)}>
                  Anterior
                </button>
                <span className="numero px-1">
                  {paginaAtual} / {totalPaginas}
                </span>
                <button type="button" className="btn-contorno h-8 px-3" disabled={paginaAtual === totalPaginas} onClick={() => setPagina(paginaAtual + 1)}>
                  Próxima
                </button>
              </div>
            )}
          </footer>
        </>
      )}
    </section>
  );
}

/* ───────────────────────── Dados ───────────────────────── */

function CartaoDeAcao({ titulo, descricao, children, perigo = false }: { titulo: string; descricao: string; children: ReactNode; perigo?: boolean }) {
  return (
    <div className={`flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between ${perigo ? 'bg-vinho-clara/40' : ''}`}>
      <div className="max-w-xl">
        <h3 className={`text-[14px] font-semibold ${perigo ? 'text-vinho' : ''}`}>{titulo}</h3>
        <p className="mt-0.5 text-[13px] text-suave">{descricao}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

const CONFIRMACAO_LIMPEZA = 'LIMPAR';

function Dados() {
  const { dados, itens, movimentacoes, limparDados, importarDados, restaurarDadosDeExemplo } = useEstoque();
  const { avisar } = useToast();
  const arquivo = useRef<HTMLInputElement>(null);
  const [importando, setImportando] = useState<DadosEstoque | null>(null);
  const [limpando, setLimpando] = useState(false);
  const [restaurando, setRestaurando] = useState(false);
  const [textoConfirmacao, setTextoConfirmacao] = useState('');
  const [processando, setProcessando] = useState(false);

  async function executar(acao: () => Promise<void>, sucesso: string) {
    setProcessando(true);
    try {
      await acao();
      avisar(sucesso);
      return true;
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Não foi possível concluir a operação.', 'erro');
      return false;
    } finally {
      setProcessando(false);
    }
  }

  function exportarBackup() {
    baixarArquivo(gerarBackup(dados), 'application/json', nomeDoArquivoDeBackup());
    void servico.registrarAtividade(
      'backup_exportado',
      `Exportou um backup com ${dados.itens.length} item(ns) e ${dados.movimentacoes.length} movimentação(ões)`,
    );
    avisar('Backup exportado.');
  }

  async function aoEscolherArquivo(lista: FileList | null) {
    const escolhido = lista?.[0];
    if (arquivo.current) arquivo.current.value = '';
    if (!escolhido) return;
    if (escolhido.size > TAMANHO_MAXIMO_DO_BACKUP) {
      avisar('O arquivo é grande demais para ser um backup do sistema (máximo de 5 MB).', 'erro');
      return;
    }
    try {
      setImportando(lerBackup(await escolhido.text()));
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Arquivo inválido.', 'erro');
    }
  }

  return (
    <div className="space-y-4">
      <section className="painel grid gap-px overflow-hidden bg-linha sm:grid-cols-3">
        {[
          ['Itens cadastrados', itens.filter((i) => i.entradas > 0).length],
          ['Movimentações', movimentacoes.length],
          ['Peças em estoque', itens.reduce((t, i) => t + i.saldo, 0)],
        ].map(([rotulo, valor]) => (
          <div key={rotulo} className="bg-superficie px-5 py-4">
            <p className="rotulo-mono">{rotulo}</p>
            <p className="numero mt-1.5 text-2xl font-medium">{formatarNumero(valor as number)}</p>
          </div>
        ))}
      </section>

      <section className="painel divide-y divide-linha overflow-hidden">
        <CartaoDeAcao titulo="Exportar backup" descricao="Baixa um arquivo JSON com todos os itens e movimentações, para guardar ou levar para outro computador.">
          <button type="button" className="btn-contorno" onClick={exportarBackup}>
            <Download className="h-4 w-4" />
            Exportar backup
          </button>
        </CartaoDeAcao>
        <CartaoDeAcao titulo="Importar backup" descricao="Substitui os itens e movimentações atuais pelos de um arquivo de backup. O arquivo é validado antes.">
          <input ref={arquivo} type="file" accept="application/json,.json" className="sr-only" id="arquivo-backup" onChange={(e) => void aoEscolherArquivo(e.target.files)} />
          <label htmlFor="arquivo-backup" className="btn-contorno cursor-pointer">
            <Upload className="h-4 w-4" />
            Escolher arquivo
          </label>
        </CartaoDeAcao>
        {servico.modo === 'demo' && (
          <CartaoDeAcao titulo="Restaurar dados de exemplo" descricao="Volta aos dados da campanha de inverno de 2025 e descarta as alterações feitas neste navegador.">
            <button type="button" className="btn-contorno" onClick={() => setRestaurando(true)}>
              <RotateCcw className="h-4 w-4" />
              Restaurar
            </button>
          </CartaoDeAcao>
        )}
        <CartaoDeAcao perigo titulo="Limpar todos os dados" descricao="Apaga todos os itens e movimentações para começar uma nova campanha. Usuários e registro de atividades são mantidos.">
          <button type="button" className="btn-perigo" onClick={() => setLimpando(true)}>
            <Trash2 className="h-4 w-4" />
            Limpar dados
          </button>
        </CartaoDeAcao>
      </section>

      <Confirmacao
        aberto={!!importando}
        titulo="Importar backup"
        textoConfirmar="Substituir dados"
        processando={processando}
        mensagem={
          importando && (
            <>
              O backup tem <strong className="text-texto">{importando.itens.length} itens</strong> e{' '}
              <strong className="text-texto">{importando.movimentacoes.length} movimentações</strong>. Os dados atuais serão substituídos.
              Exporte um backup antes, se precisar deles.
            </>
          )
        }
        aoCancelar={() => setImportando(null)}
        aoConfirmar={() => void executar(() => importarDados(importando!), 'Backup importado.').then((ok) => ok && setImportando(null))}
      />

      <Confirmacao
        aberto={restaurando}
        titulo="Restaurar dados de exemplo"
        textoConfirmar="Restaurar"
        processando={processando}
        mensagem="As alterações feitas neste navegador serão descartadas."
        aoCancelar={() => setRestaurando(false)}
        aoConfirmar={() => void executar(restaurarDadosDeExemplo, 'Dados de exemplo restaurados.').then((ok) => ok && setRestaurando(false))}
      />

      <Modal aberto={limpando} titulo="Limpar todos os dados" aoFechar={() => setLimpando(false)} largura="max-w-md">
        <div className="flex gap-3 rounded-lg border border-vinho/25 bg-vinho-clara px-3 py-2.5 text-[13px] text-vinho">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Todos os {formatarNumero(movimentacoes.length)} registros e o estoque serão apagados. Esta ação não pode ser desfeita.
          </p>
        </div>
        <Campo
          className="mt-4"
          rotulo={`Digite ${CONFIRMACAO_LIMPEZA} para confirmar`}
          value={textoConfirmacao}
          onChange={(e) => setTextoConfirmacao(e.target.value)}
          autoComplete="off"
        />
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-contorno" onClick={() => setLimpando(false)}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn-perigo"
            disabled={textoConfirmacao !== CONFIRMACAO_LIMPEZA || processando}
            onClick={() =>
              void executar(limparDados, 'Todos os dados foram apagados.').then((ok) => {
                if (!ok) return;
                setLimpando(false);
                setTextoConfirmacao('');
              })
            }
          >
            {processando ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Apagar tudo
          </button>
        </div>
      </Modal>
    </div>
  );
}
