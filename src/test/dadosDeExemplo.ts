import { addDays, format } from 'date-fns';
import { type Genero, type Item, type MotivoDescarte, type Movimentacao, type Tamanho, type TipoPeca } from '../lib/types';

// Dados de exemplo da campanha, usados pelos testes automatizados.

/** Gerador pseudoaleatório determinístico, para os dados de exemplo serem sempre os mesmos. */
function criarAleatorio(semente: number) {
  let estado = semente;
  const proximo = () => {
    estado = (estado * 1664525 + 1013904223) % 4294967296;
    return estado / 4294967296;
  };
  return {
    inteiro: (min: number, max: number) => Math.floor(proximo() * (max - min + 1)) + min,
    escolher: <T,>(lista: readonly T[]): T => lista[Math.floor(proximo() * lista.length)],
    chance: (probabilidade: number) => proximo() < probabilidade,
  };
}

const CATALOGO: Array<[TipoPeca, Genero, Tamanho[]]> = [
  ['Casaco', 'Masculino', ['M', 'G', 'GG']],
  ['Casaco', 'Feminino', ['P', 'M', 'G']],
  ['Casaco', 'Unissex', ['Infantil']],
  ['Jaqueta', 'Unissex', ['M', 'G']],
  ['Moletom', 'Masculino', ['M', 'G']],
  ['Moletom', 'Feminino', ['P', 'M']],
  ['Moletom', 'Unissex', ['Infantil']],
  ['Blusa', 'Feminino', ['Infantil', 'P', 'M', 'G']],
  ['Camiseta', 'Unissex', ['M', 'G']],
  ['Calça', 'Masculino', ['M', 'G']],
  ['Calça', 'Feminino', ['Infantil', 'P', 'M']],
  ['Cobertor', 'Unissex', ['Único']],
  ['Cachecol', 'Unissex', ['Único']],
  ['Touca', 'Unissex', ['Único']],
  ['Luva', 'Unissex', ['Único']],
  ['Meia', 'Unissex', ['Único']],
  ['Calçado', 'Masculino', ['G']],
  ['Calçado', 'Feminino', ['M']],
];

/** A maior parte das doações chegou pelo ponto de coleta do SENAI. */
const FORNECEDORES = [
  'SENAI Garopaba',
  'SENAI Garopaba',
  'SENAI Garopaba',
  'SENAI Garopaba',
  'SENAI Garopaba',
  'Escola Municipal',
  'Comunidade',
  'Empresa parceira',
];
const RECEBIDO_POR = ['Higor', 'Ana Paula', 'Lucas', 'Bruna'];
const RETIRADO_POR = ['Marlene', 'Rosângela', 'Terezinha', 'Sandra', 'Cláudia'];
const DESTINOS = [
  'Distribuição na sede da Rede Feminina',
  'Entrega em comunidade',
  'Atendimento a família cadastrada',
  null,
];
const MOTIVOS: MotivoDescarte[] = ['Rasgado ou danificado', 'Manchado', 'Mofo ou mau cheiro', 'Impróprio para uso'];

export function gerarDadosDeExemplo(): { itens: Item[]; movimentacoes: Movimentacao[] } {
  const aleatorio = criarAleatorio(2025);
  const inicioCampanha = new Date(2025, 4, 26); // 26/05/2025
  const criadoEm = inicioCampanha.toISOString();

  const itens: Item[] = CATALOGO.flatMap(([tipo, genero, tamanhos]) =>
    tamanhos.map((tamanho) => ({
      id: `item-${tipo}-${genero}-${tamanho}`.toLowerCase().normalize('NFD').replace(/[^a-z0-9-]/g, ''),
      tipo,
      tamanho,
      genero,
      created_at: criadoEm,
    })),
  );

  const movimentacoes: Movimentacao[] = [];
  const saldos = new Map(itens.map((item) => [item.id, 0]));
  let sequencia = 0;

  const registrar = (
    item: Item,
    dados: Pick<Movimentacao, 'tipo' | 'quantidade' | 'responsavel' | 'observacao'> &
      Partial<Pick<Movimentacao, 'fornecedor' | 'motivo'>>,
    dia: Date,
  ) => {
    sequencia += 1;
    movimentacoes.push({
      id: `mov-${String(sequencia).padStart(4, '0')}`,
      item_id: item.id,
      data: format(dia, 'yyyy-MM-dd'),
      fornecedor: null,
      motivo: null,
      created_at: new Date(dia.getTime() + 9 * 3600_000 + sequencia * 60_000).toISOString(),
      ...dados,
    });
    saldos.set(item.id, (saldos.get(item.id) ?? 0) + (dados.tipo === 'entrada' ? dados.quantidade : -dados.quantidade));
  };

  // 13 semanas de campanha: arrecadação forte no início, distribuição a partir da 3ª semana.
  for (let dia = 0; dia < 91; dia++) {
    const data = addDays(inicioCampanha, dia);
    if (data.getDay() === 0 || data.getDay() === 6) continue;

    const intensidadeEntrada = dia < 35 ? 0.9 : dia < 63 ? 0.55 : 0.3;
    if (aleatorio.chance(intensidadeEntrada)) {
      const quantos = aleatorio.inteiro(1, 3);
      for (let i = 0; i < quantos; i++) {
        const item = aleatorio.escolher(itens);
        const quantidade = item.tipo === 'Meia' || item.tipo === 'Luva' ? aleatorio.inteiro(4, 20) : aleatorio.inteiro(2, 12);
        registrar(
          item,
          {
            tipo: 'entrada',
            quantidade,
            responsavel: aleatorio.escolher(RECEBIDO_POR),
            fornecedor: aleatorio.escolher(FORNECEDORES),
            observacao: null,
          },
          data,
        );
      }
    }

    // Triagem: algumas peças recebidas sem condições de uso são descartadas.
    if (dia > 3 && aleatorio.chance(0.12)) {
      const disponiveis = itens.filter((item) => (saldos.get(item.id) ?? 0) > 0);
      if (disponiveis.length > 0) {
        const item = aleatorio.escolher(disponiveis);
        const quantidade = Math.min(saldos.get(item.id) ?? 0, aleatorio.inteiro(1, 2));
        registrar(
          item,
          { tipo: 'descarte', quantidade, responsavel: aleatorio.escolher(RECEBIDO_POR), motivo: aleatorio.escolher(MOTIVOS), observacao: null },
          data,
        );
      }
    }

    const intensidadeSaida = dia < 14 ? 0 : dia < 42 ? 0.5 : 0.8;
    if (aleatorio.chance(intensidadeSaida)) {
      const disponiveis = itens.filter((item) => (saldos.get(item.id) ?? 0) > 0);
      const quantos = Math.min(disponiveis.length, aleatorio.inteiro(1, 3));
      for (let i = 0; i < quantos; i++) {
        const item = aleatorio.escolher(disponiveis);
        const saldo = saldos.get(item.id) ?? 0;
        if (saldo <= 0) continue;
        registrar(
          item,
          {
            tipo: 'saida',
            quantidade: Math.min(saldo, aleatorio.inteiro(1, 6)),
            responsavel: aleatorio.escolher(RETIRADO_POR),
            observacao: aleatorio.escolher(DESTINOS),
          },
          data,
        );
      }
    }
  }

  // Mantém apenas as combinações que realmente receberam doações
  const recebidos = new Set(movimentacoes.map((mov) => mov.item_id));
  return { itens: itens.filter((item) => recebidos.has(item.id)), movimentacoes };
}

/** Histórico de atividades correspondente aos dados de exemplo. */
