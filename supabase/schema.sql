-- Logística que Aquece: esquema do banco de dados (Supabase / PostgreSQL)
-- Execute no SQL Editor do Supabase para criar as tabelas, a validação de estoque e as políticas de acesso.

create extension if not exists "pgcrypto";

-- Peças de roupa, identificadas pela combinação tipo + tamanho + público
create table if not exists public.itens (
  id          uuid primary key default gen_random_uuid(),
  tipo        text not null,
  tamanho     text not null,
  publico     text not null check (publico in ('Masculino', 'Feminino', 'Unissex', 'Infantil')),
  created_at  timestamptz not null default now(),
  unique (tipo, tamanho, publico)
);

-- Entradas (doações recebidas) e saídas (retiradas para distribuição)
create table if not exists public.movimentacoes (
  id           uuid primary key default gen_random_uuid(),
  item_id      uuid not null references public.itens (id) on delete restrict,
  tipo         text not null check (tipo in ('entrada', 'saida')),
  quantidade   integer not null check (quantidade > 0),
  data         date not null default current_date,
  responsavel  text not null check (char_length(responsavel) between 2 and 80),
  observacao   text check (char_length(observacao) <= 300),
  created_by   uuid references auth.users (id) default auth.uid(),
  created_at   timestamptz not null default now()
);

create index if not exists movimentacoes_item_id_idx on public.movimentacoes (item_id);
create index if not exists movimentacoes_data_idx on public.movimentacoes (data desc);

-- Saldo atual de cada peça
create or replace view public.estoque with (security_invoker = true) as
select
  i.*,
  coalesce(sum(m.quantidade) filter (where m.tipo = 'entrada'), 0)::int as entradas,
  coalesce(sum(m.quantidade) filter (where m.tipo = 'saida'), 0)::int   as saidas,
  coalesce(sum(case when m.tipo = 'entrada' then m.quantidade else -m.quantidade end), 0)::int as saldo
from public.itens i
left join public.movimentacoes m on m.item_id = i.id
group by i.id;

-- Impede que uma saída (ou a exclusão de uma entrada) deixe o estoque negativo
create or replace function public.validar_estoque()
returns trigger
language plpgsql
as $$
declare
  v_item_id uuid := coalesce(new.item_id, old.item_id);
  v_saldo   integer;
begin
  perform 1 from public.itens where id = v_item_id for update;

  select coalesce(sum(case when tipo = 'entrada' then quantidade else -quantidade end), 0)
    into v_saldo
    from public.movimentacoes
   where item_id = v_item_id;

  if v_saldo < 0 then
    raise exception 'Estoque insuficiente: a operação deixaria o saldo do item negativo (%).', v_saldo
      using errcode = 'P0001';
  end if;

  return null;
end;
$$;

drop trigger if exists movimentacoes_validar_estoque on public.movimentacoes;
create constraint trigger movimentacoes_validar_estoque
  after insert or update or delete on public.movimentacoes
  deferrable initially immediate
  for each row execute function public.validar_estoque();

-- Acesso restrito a usuários autenticados
alter table public.itens enable row level security;
alter table public.movimentacoes enable row level security;

drop policy if exists "itens: autenticados" on public.itens;
create policy "itens: autenticados" on public.itens
  for all to authenticated using (true) with check (true);

drop policy if exists "movimentacoes: autenticados" on public.movimentacoes;
create policy "movimentacoes: autenticados" on public.movimentacoes
  for all to authenticated using (true) with check (true);

-- Usuário de acesso: crie em Authentication > Users com o e-mail
--   visitante@logisticaqueaquece.local
-- (o login aceita o nome de usuário "Visitante" e completa o domínio automaticamente).
