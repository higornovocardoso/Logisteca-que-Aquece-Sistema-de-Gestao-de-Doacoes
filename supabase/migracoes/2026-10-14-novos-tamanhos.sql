-- Novos tamanhos: Infantil, PP, P, M, G e GG ("Único" continua para os acessórios).
-- A numeração infantil (2 a 14) vira "Infantil" e XG vira GG. Itens que passam a ter a mesma
-- combinação (ex.: casaco unissex 4, 8 e 12) são unidos em um só, somando as movimentações e o saldo.
-- Pode ser executado no SQL Editor do Supabase; roda como um bloco só e, se algo falhar, nada muda.
-- Executar de novo não tem efeito.

do $$
begin
  alter table public.itens drop constraint if exists itens_tamanho_check;

  create temporary table destino on commit drop as
  select i.id,
         case when i.tamanho ~ '^\d+$' then 'Infantil' when i.tamanho = 'XG' then 'GG' else i.tamanho end as novo,
         first_value(i.id) over (
           partition by i.tipo, i.genero,
                        case when i.tamanho ~ '^\d+$' then 'Infantil' when i.tamanho = 'XG' then 'GG' else i.tamanho end
           order by (i.tamanho in ('Infantil', 'PP', 'P', 'M', 'G', 'GG', 'Único')) desc, i.created_at, i.id
         ) as manter
  from public.itens i;

  -- O saldo é conferido ao fim de cada comando, então mover entradas e saídas juntas nunca o deixa negativo
  update public.movimentacoes m set item_id = d.manter from destino d where m.item_id = d.id and d.id <> d.manter;
  delete from public.itens i using destino d where i.id = d.id and d.id <> d.manter;
  update public.itens i set tamanho = d.novo from destino d where i.id = d.id and i.tamanho <> d.novo;

  alter table public.itens
    add constraint itens_tamanho_check check (tamanho in ('Infantil', 'PP', 'P', 'M', 'G', 'GG', 'Único'));
end $$;

-- Conferência: deve listar apenas os novos tamanhos
select tamanho, count(*) as itens from public.itens group by tamanho order by tamanho;
