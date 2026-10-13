import { saldoDoItem } from '../lib/estoque';
import { conferirSenha, gerarHashDeSenha } from '../lib/senha';
import { descreverItem, type Atividade, type Item, type Movimentacao, type Perfil, type Usuario } from '../lib/types';
import { ErroDeNegocio, type DadosEstoque, type FonteDeDados, type Sessao } from './fonte';
import { gerarAtividadesDeExemplo, gerarDadosDeExemplo, USUARIO_ADMINISTRADOR_EXEMPLO } from './seed';

const PREFIXO = 'logistica-que-aquece';
const CHAVES = {
  dados: `${PREFIXO}:dados:v2`,
  usuarios: `${PREFIXO}:usuarios:v2`,
  atividades: `${PREFIXO}:atividades:v2`,
  sessao: `${PREFIXO}:sessao:v2`,
};
const LIMITE_ATIVIDADES = 2000;

/** Contas do modo demonstração. A senha do Higor é aleatória: o acesso de demonstração é pelas outras duas. */
export const CONTAS_DEMO = [
  { nome: 'Visitante', usuario: 'Visitante', perfil: 'Administrador', senha: 'Visitante' },
  { nome: 'Marlene', usuario: 'Marlene', perfil: 'Operador', senha: 'Marlene' },
] as const;

interface UsuarioArmazenado extends Usuario {
  senha_hash: string;
}

/** Armazenamento que pode falhar (aba anônima, cota cheia); nesse caso os dados ficam só na memória. */
function criarArmazenamento(armazenamento: Storage | undefined) {
  const memoria = new Map<string, string>();
  return {
    ler<T>(chave: string): T | null {
      let bruto: string | null | undefined;
      try {
        bruto = armazenamento?.getItem(chave);
      } catch {
        bruto = undefined;
      }
      bruto ??= memoria.get(chave) ?? null;
      if (!bruto) return null;
      try {
        return JSON.parse(bruto) as T;
      } catch {
        return null;
      }
    },
    gravar(chave: string, valor: unknown) {
      const texto = JSON.stringify(valor);
      memoria.set(chave, texto);
      try {
        armazenamento?.setItem(chave, texto);
      } catch {
        // mantém apenas em memória
      }
    },
    remover(chave: string) {
      memoria.delete(chave);
      try {
        armazenamento?.removeItem(chave);
      } catch {
        // nada a fazer
      }
    },
  };
}

function novoId(prefixo: string): string {
  return `${prefixo}-${crypto.randomUUID()}`;
}

function semSenha({ senha_hash: _, ...usuario }: UsuarioArmazenado): Usuario {
  return usuario;
}

export function criarFonteLocal(
  armazenamento: Storage | undefined = typeof window !== 'undefined' ? window.localStorage : undefined,
): FonteDeDados {
  const store = criarArmazenamento(armazenamento);
  const agora = () => new Date().toISOString();

  const lerDados = (): DadosEstoque => {
    const salvo = store.ler<DadosEstoque>(CHAVES.dados);
    if (salvo) return salvo;
    const inicial = gerarDadosDeExemplo();
    store.gravar(CHAVES.dados, inicial);
    // Mantém o que já foi registrado (ex.: o login que antecedeu a criação dos dados de exemplo)
    const registradas = store.ler<Atividade[]>(CHAVES.atividades) ?? [];
    store.gravar(CHAVES.atividades, [...registradas, ...gerarAtividadesDeExemplo(inicial.itens, inicial.movimentacoes)]);
    return inicial;
  };
  const gravarDados = (dados: DadosEstoque) => store.gravar(CHAVES.dados, dados);

  let semeandoUsuarios: Promise<UsuarioArmazenado[]> | null = null;
  const lerUsuarios = async (): Promise<UsuarioArmazenado[]> => {
    const salvos = store.ler<UsuarioArmazenado[]>(CHAVES.usuarios);
    if (salvos) return salvos;
    semeandoUsuarios ??= (async () => {
      const criadoEm = new Date(2025, 4, 20).toISOString();
      const aleatoria = crypto.getRandomValues(new Uint8Array(24)).join('');
      const contas: Array<{ nome: string; usuario: string; perfil: Perfil; senha: string }> = [
        ...CONTAS_DEMO,
        { nome: 'Higor Cardoso', usuario: USUARIO_ADMINISTRADOR_EXEMPLO, perfil: 'Administrador', senha: aleatoria },
      ];
      const usuarios = await Promise.all(
        contas.map(async ({ senha, ...conta }) => ({
          ...conta,
          id: novoId('usr'),
          ativo: true,
          created_at: criadoEm,
          senha_hash: await gerarHashDeSenha(senha),
        })),
      );
      store.gravar(CHAVES.usuarios, usuarios);
      return usuarios;
    })();
    return semeandoUsuarios;
  };
  const gravarUsuarios = (usuarios: UsuarioArmazenado[]) => store.gravar(CHAVES.usuarios, usuarios);

  const sessaoSalva = () => store.ler<Sessao>(CHAVES.sessao);

  /** Confere, a cada operação, se quem está conectado ainda existe, está ativo e tem o perfil necessário. */
  const exigir = async (perfil?: Perfil): Promise<UsuarioArmazenado> => {
    const sessao = sessaoSalva();
    const usuario = sessao && (await lerUsuarios()).find((u) => u.id === sessao.id);
    if (!usuario || !usuario.ativo) throw new ErroDeNegocio('Sua sessão expirou. Entre novamente.');
    if (perfil && usuario.perfil !== perfil) throw new ErroDeNegocio('Somente administradores podem fazer isso.');
    return usuario;
  };

  const garantirAdministradorRestante = (usuarios: UsuarioArmazenado[]) => {
    if (!usuarios.some((u) => u.ativo && u.perfil === 'Administrador')) {
      throw new ErroDeNegocio('O sistema precisa de pelo menos um administrador ativo.');
    }
  };

  const registrarRetirada = async (
    tipo: 'saida' | 'descarte',
    dados: { item_id: string; quantidade: number; data: string; responsavel: string; observacao?: string; motivo?: Movimentacao['motivo'] },
  ) => {
    await exigir();
    const estoque = lerDados();
    const item = estoque.itens.find((i) => i.id === dados.item_id);
    if (!item) throw new ErroDeNegocio('Item não encontrado.');
    const saldo = saldoDoItem(item.id, estoque.movimentacoes);
    if (dados.quantidade > saldo) {
      throw new ErroDeNegocio(`Estoque insuficiente: há apenas ${saldo} peça(s) de ${descreverItem(item)}.`);
    }
    estoque.movimentacoes.push({
      id: novoId('mov'),
      item_id: item.id,
      tipo,
      quantidade: dados.quantidade,
      data: dados.data,
      responsavel: dados.responsavel,
      fornecedor: null,
      motivo: tipo === 'descarte' ? (dados.motivo ?? null) : null,
      observacao: dados.observacao || null,
      created_at: agora(),
    });
    gravarDados(estoque);
  };

  return {
    modo: 'demo',

    async carregar() {
      await exigir();
      return lerDados();
    },

    async registrarEntrada(entrada) {
      await exigir();
      const dados = lerDados();
      let item = dados.itens.find(
        (i) => i.tipo === entrada.tipo && i.tamanho === entrada.tamanho && i.genero === entrada.genero,
      );
      if (!item) {
        item = { id: novoId('item'), tipo: entrada.tipo, tamanho: entrada.tamanho, genero: entrada.genero, created_at: agora() } satisfies Item;
        dados.itens.push(item);
      }
      dados.movimentacoes.push({
        id: novoId('mov'),
        item_id: item.id,
        tipo: 'entrada',
        quantidade: entrada.quantidade,
        data: entrada.data,
        responsavel: entrada.responsavel,
        fornecedor: entrada.fornecedor,
        motivo: null,
        observacao: entrada.observacao || null,
        created_at: agora(),
      });
      gravarDados(dados);
    },

    registrarSaida: (saida) => registrarRetirada('saida', saida),
    registrarDescarte: (descarte) => registrarRetirada('descarte', descarte),

    async excluirMovimentacao(id) {
      await exigir('Administrador');
      const dados = lerDados();
      const mov = dados.movimentacoes.find((m) => m.id === id);
      if (!mov) return;
      if (mov.tipo === 'entrada' && saldoDoItem(mov.item_id, dados.movimentacoes) - mov.quantidade < 0) {
        throw new ErroDeNegocio(
          'Não é possível excluir esta entrada: parte dessas peças já saiu do estoque e o saldo ficaria negativo.',
        );
      }
      dados.movimentacoes = dados.movimentacoes.filter((m) => m.id !== id);
      gravarDados(dados);
    },

    async limparDados() {
      await exigir('Administrador');
      gravarDados({ itens: [], movimentacoes: [] });
    },

    async importarDados(dados) {
      await exigir('Administrador');
      gravarDados(dados);
    },

    async sessaoAtual() {
      const sessao = sessaoSalva();
      if (!sessao) return null;
      const usuario = (await lerUsuarios()).find((u) => u.id === sessao.id && u.ativo);
      if (!usuario) {
        store.remover(CHAVES.sessao);
        return null;
      }
      return { id: usuario.id, nome: usuario.nome, usuario: usuario.usuario, perfil: usuario.perfil };
    },

    async entrar(nomeDeUsuario, senha) {
      const usuario = (await lerUsuarios()).find((u) => u.usuario.toLowerCase() === nomeDeUsuario.trim().toLowerCase());
      const senhaConfere = usuario ? await conferirSenha(senha, usuario.senha_hash) : false;
      if (!usuario || !senhaConfere) throw new ErroDeNegocio('Usuário ou senha incorretos.');
      if (!usuario.ativo) throw new ErroDeNegocio('Este usuário está desativado. Fale com um administrador.');
      const sessao: Sessao = { id: usuario.id, nome: usuario.nome, usuario: usuario.usuario, perfil: usuario.perfil };
      store.gravar(CHAVES.sessao, sessao);
      return sessao;
    },

    async sair() {
      store.remover(CHAVES.sessao);
    },

    async listarUsuarios() {
      await exigir('Administrador');
      return (await lerUsuarios()).map(semSenha).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    },

    async criarUsuario(novo) {
      await exigir('Administrador');
      const usuarios = await lerUsuarios();
      if (usuarios.some((u) => u.usuario.toLowerCase() === novo.usuario.toLowerCase())) {
        throw new ErroDeNegocio(`O nome de usuário "${novo.usuario}" já está em uso.`);
      }
      usuarios.push({
        id: novoId('usr'),
        nome: novo.nome,
        usuario: novo.usuario,
        perfil: novo.perfil,
        ativo: true,
        created_at: agora(),
        senha_hash: await gerarHashDeSenha(novo.senha),
      });
      gravarUsuarios(usuarios);
    },

    async alterarUsuario(id, alteracao) {
      const eu = await exigir('Administrador');
      const usuarios = await lerUsuarios();
      const alvo = usuarios.find((u) => u.id === id);
      if (!alvo) throw new ErroDeNegocio('Usuário não encontrado.');
      if (id === eu.id && alteracao.ativo === false) throw new ErroDeNegocio('Você não pode desativar o próprio usuário.');

      if (alteracao.nome !== undefined) alvo.nome = alteracao.nome;
      if (alteracao.perfil !== undefined) alvo.perfil = alteracao.perfil;
      if (alteracao.ativo !== undefined) alvo.ativo = alteracao.ativo;
      if (alteracao.senha) alvo.senha_hash = await gerarHashDeSenha(alteracao.senha);
      garantirAdministradorRestante(usuarios);
      gravarUsuarios(usuarios);

      const sessao = sessaoSalva();
      if (sessao?.id === id) store.gravar(CHAVES.sessao, { ...sessao, nome: alvo.nome, perfil: alvo.perfil });
    },

    async removerUsuario(id) {
      const eu = await exigir('Administrador');
      if (id === eu.id) throw new ErroDeNegocio('Você não pode remover o próprio usuário.');
      const usuarios = (await lerUsuarios()).filter((u) => u.id !== id);
      garantirAdministradorRestante(usuarios);
      gravarUsuarios(usuarios);
    },

    async listarAtividades() {
      await exigir('Administrador');
      lerDados(); // garante o histórico de exemplo na primeira execução
      return store.ler<Atividade[]>(CHAVES.atividades) ?? [];
    },

    async registrarAtividade(acao, descricao, usuario) {
      const atividades = store.ler<Atividade[]>(CHAVES.atividades) ?? [];
      atividades.unshift({
        id: novoId('atv'),
        momento: agora(),
        usuario: usuario ?? sessaoSalva()?.nome ?? 'Sistema',
        acao,
        descricao,
      });
      store.gravar(CHAVES.atividades, atividades.slice(0, LIMITE_ATIVIDADES));
    },

    async restaurarDadosDeExemplo() {
      await exigir('Administrador');
      store.remover(CHAVES.dados);
      store.remover(CHAVES.atividades);
      lerDados();
    },
  };
}
