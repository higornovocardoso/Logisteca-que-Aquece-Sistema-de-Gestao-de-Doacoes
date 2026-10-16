import { lazy } from 'react';

/**
 * Cada página é carregada sob demanda, para que a tela de login abra rápido.
 * O menu chama `preCarregar` ao passar o mouse sobre um link, então a página
 * costuma já estar pronta quando a pessoa clica.
 */
const carregadores = {
  '/': () => import('./pages/Painel').then((m) => ({ default: m.Painel })),
  '/movimentacoes': () => import('./pages/Movimentacoes').then((m) => ({ default: m.Movimentacoes })),
  '/estoque': () => import('./pages/Estoque').then((m) => ({ default: m.Estoque })),
  '/relatorios': () => import('./pages/Relatorios').then((m) => ({ default: m.Relatorios })),
  '/administracao': () => import('./pages/Administracao').then((m) => ({ default: m.Administracao })),
};

type Caminho = keyof typeof carregadores;

const ROTA_DO_CAMINHO: Record<string, Caminho> = {
  '/': '/',
  '/entradas': '/movimentacoes',
  '/saidas': '/movimentacoes',
  '/descartes': '/movimentacoes',
  '/estoque': '/estoque',
  '/relatorios': '/relatorios',
  '/administracao': '/administracao',
};

export function preCarregar(caminho: string) {
  const rota = ROTA_DO_CAMINHO[caminho];
  if (rota) void carregadores[rota]().catch(() => undefined);
}

export const Painel = lazy(carregadores['/']);
export const Movimentacoes = lazy(carregadores['/movimentacoes']);
export const Estoque = lazy(carregadores['/estoque']);
export const Relatorios = lazy(carregadores['/relatorios']);
export const Administracao = lazy(carregadores['/administracao']);
