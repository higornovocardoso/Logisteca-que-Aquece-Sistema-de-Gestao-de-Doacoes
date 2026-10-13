import { addDays, format } from 'date-fns';
import type { Item, Movimentacao, Publico, Tamanho, TipoPeca } from '../lib/types';

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

const CATALOGO: Array<[TipoPeca, Publico, Tamanho[]]> = [
  ['Casaco', 'Masculino', ['M', 'G', 'GG']],
  ['Casaco', 'Feminino', ['P', 'M', 'G']],
  ['Casaco', 'Infantil', ['4', '8', '12']],
  ['Jaqueta', 'Unissex', ['M', 'G']],
  ['Moletom', 'Masculino', ['M', 'G']],
  ['Moletom', 'Feminino', ['P', 'M']],
  ['Moletom', 'Infantil', ['6', '10']],
  ['Blusa', 'Feminino', ['P', 'M', 'G']],
  ['Blusa', 'Infantil', ['4', '8']],
  ['Camiseta', 'Unissex', ['M', 'G']],
  ['Calça', 'Masculino', ['M', 'G']],
  ['Calça', 'Feminino', ['P', 'M']],
  ['Calça', 'Infantil', ['6', '10']],
  ['Cobertor', 'Unissex', ['Único']],
  ['Cachecol', 'Unissex', ['Único']],
  ['Touca', 'Unissex', ['Único']],
  ['Touca', 'Infantil', ['Único']],
  ['Luva', 'Unissex', ['Único']],
  ['Meia', 'Unissex', ['Único']],
  ['Calçado', 'Masculino', ['G']],
  ['Calçado', 'Feminino', ['M']],
];

const RECEBIDO_POR = ['Higor', 'Equipe SENAI', 'Ana Paula', 'Lucas', 'Bruna'];
const RETIRADO_POR = ['Marlene', 'Rosângela', 'Terezinha', 'Sandra', 'Cláudia'];
const ORIGENS = [
  'Ponto de coleta SENAI',
  'Ponto de coleta SENAI',
  'Doação de empresa parceira',
  'Arrecadação em escola',
  null,
];
const DESTINOS = [
  'Distribuição na sede da Rede Feminina',
  'Entrega em comunidade',
  'Atendimento a família cadastrada',
  null,
];

export function gerarDadosDeExemplo(): { itens: Item[]; movimentacoes: Movimentacao[] } {
  const aleatorio = criarAleatorio(2025);
  const inicioCampanha = new Date(2025, 4, 26); // 26/05/2025
  const criadoEm = inicioCampanha.toISOString();

  const itens: Item[] = CATALOGO.flatMap(([tipo, publico, tamanhos]) =>
    tamanhos.map((tamanho) => ({
      id: `item-${tipo}-${publico}-${tamanho}`.toLowerCase().normalize('NFD').replace(/[^a-z0-9-]/g, ''),
      tipo,
      tamanho,
      publico,
      created_at: criadoEm,
    })),
  );

  const movimentacoes: Movimentacao[] = [];
  const saldos = new Map(itens.map((item) => [item.id, 0]));
  let sequencia = 0;

  const registrar = (
    item: Item,
    tipo: Movimentacao['tipo'],
    quantidade: number,
    dia: Date,
    responsavel: string,
    observacao: string | null,
  ) => {
    sequencia += 1;
    movimentacoes.push({
      id: `mov-${String(sequencia).padStart(4, '0')}`,
      item_id: item.id,
      tipo,
      quantidade,
      data: format(dia, 'yyyy-MM-dd'),
      responsavel,
      observacao,
      created_at: new Date(dia.getTime() + sequencia * 1000).toISOString(),
    });
    saldos.set(item.id, (saldos.get(item.id) ?? 0) + (tipo === 'entrada' ? quantidade : -quantidade));
  };

  // 13 semanas de campanha: arrecadação forte no início, distribuição a partir da 3ª semana.
  for (let dia = 0; dia < 91; dia++) {
    const data = addDays(inicioCampanha, dia);
    const fimDeSemana = data.getDay() === 0 || data.getDay() === 6;
    if (fimDeSemana) continue;

    const intensidadeEntrada = dia < 35 ? 0.9 : dia < 63 ? 0.55 : 0.3;
    if (aleatorio.chance(intensidadeEntrada)) {
      const quantos = aleatorio.inteiro(1, 3);
      for (let i = 0; i < quantos; i++) {
        const item = aleatorio.escolher(itens);
        const peca = item.tipo === 'Meia' || item.tipo === 'Luva' ? aleatorio.inteiro(4, 20) : aleatorio.inteiro(2, 12);
        registrar(item, 'entrada', peca, data, aleatorio.escolher(RECEBIDO_POR), aleatorio.escolher(ORIGENS));
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
        const quantidade = Math.min(saldo, aleatorio.inteiro(1, 6));
        registrar(item, 'saida', quantidade, data, aleatorio.escolher(RETIRADO_POR), aleatorio.escolher(DESTINOS));
      }
    }
  }

  // Mantém apenas as combinações que realmente receberam doações
  const recebidos = new Set(movimentacoes.map((mov) => mov.item_id));
  return { itens: itens.filter((item) => recebidos.has(item.id)), movimentacoes };
}
