import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function formatarData(data: string): string {
  return format(parseISO(data), 'dd/MM/yyyy', { locale: ptBR });
}

export function formatarNumero(valor: number): string {
  return valor.toLocaleString('pt-BR');
}

export function hojeISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}
