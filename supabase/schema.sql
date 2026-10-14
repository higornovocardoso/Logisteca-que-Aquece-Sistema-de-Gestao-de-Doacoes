-- Logística que Aquece: esquema do banco de dados (Supabase / PostgreSQL)
-- Execute no SQL Editor do Supabase (ou como migração) em um projeto novo.

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- Perfis de usuário (complementam auth.users)
-- ─────────────────────────────────────────────────────────────
create table public.perfis (
  id          uuid primary key references auth.users (id) on delete cascade,
  nome        text not null check (char_length(nome) between 2 and 80),
  usuario     text not null unique check (usuario ~ '^[A-Za-z0-9._-]{3,30}$'),
  perfil      text not null default 'Operador' check (perfil in ('Administrador', 'Operador')),
  ativo       boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Cria o perfil automaticamente quando um usuário é criado em Authentication › Users.
-- O nome de usuário é a parte do e-mail antes do @ (ex.: higor@logisticaqueaquece.local → higor).
create function public.criar_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfis (id, nome, usuario, perfil)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', initcap(split_part(new.email, '@', 1))),
    split_part(new.email, '@', 1),
    coalesce(new.raw_user_meta_data ->> 'perfil', 'Operador')
  );
  return new;
end;
$$;

create trigger auth_usuario_criado
  after insert on auth.users
  for each row execute function public.criar_perfil();

-- Funções de permissão ficam num schema privado, que a API não expõe
create schema privado;
revoke all on schema privado from public, anon;
grant usage on schema privado to authenticated;

create function privado.usuario_ativo()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.perfis where id = auth.uid() and ativo);
$$;

create function privado.eh_administrador()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.perfis where id = auth.uid() and ativo and perfil = 'Administrador');
$$;

-- Impede ficar sem nenhum administrador ativo
-- Os gatilhos rodam como dono porque também disparam em operações do serviço de Auth
-- (ex.: ao excluir um usuário, o perfil é apagado em cascata).
create function public.manter_um_administrador()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.perfis where ativo and perfil = 'Administrador') then
    raise exception 'O sistema precisa de pelo menos um administrador ativo.' using errcode = 'P0001';
  end if;
  return null;
end;
$$;

create trigger perfis_manter_um_administrador
  after update or delete on public.perfis
  for each statement execute function public.manter_um_administrador();

-- Quem não é administrador pode alterar apenas o próprio nome (Meu perfil);
-- perfil, nome de usuário e acesso continuam sob controle dos administradores.
create function public.proteger_campos_do_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null
     and not privado.eh_administrador()
     and (new.id, new.usuario, new.perfil, new.ativo, new.created_at)
         is distinct from (old.id, old.usuario, old.perfil, old.ativo, old.created_at) then
    raise exception 'Somente administradores podem alterar o perfil, o nome de usuário ou o acesso.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger perfis_proteger_campos
  before update on public.perfis
  for each row execute function public.proteger_campos_do_perfil();

-- ─────────────────────────────────────────────────────────────
-- Itens: cada combinação de tipo de peça + tamanho + gênero
-- ─────────────────────────────────────────────────────────────
create table public.itens (
  id          uuid primary key default gen_random_uuid(),
  tipo        text not null check (tipo in ('Casaco', 'Jaqueta', 'Moletom', 'Blusa', 'Camiseta', 'Calça', 'Cobertor', 'Cachecol', 'Touca', 'Luva', 'Meia', 'Calçado')),
  tamanho     text not null check (tamanho in ('PP', 'P', 'M', 'G', 'GG', 'XG', '2', '4', '6', '8', '10', '12', '14', 'Único')),
  genero      text not null check (genero in ('Masculino', 'Feminino', 'Unissex')),
  created_at  timestamptz not null default now(),
  unique (tipo, tamanho, genero)
);

-- ─────────────────────────────────────────────────────────────
-- Movimentações: entradas (doações), saídas (distribuição) e descartes
-- ─────────────────────────────────────────────────────────────
create table public.movimentacoes (
  id           uuid primary key default gen_random_uuid(),
  item_id      uuid not null references public.itens (id) on delete restrict,
  tipo         text not null check (tipo in ('entrada', 'saida', 'descarte')),
  quantidade   integer not null check (quantidade between 1 and 10000),
  data         date not null default current_date,
  responsavel  text not null check (char_length(responsavel) between 2 and 80),
  fornecedor   text check (char_length(fornecedor) <= 80),
  motivo       text check (motivo in ('Rasgado ou danificado', 'Manchado', 'Mofo ou mau cheiro', 'Impróprio para uso', 'Outro')),
  observacao   text check (char_length(observacao) <= 300),
  created_by   uuid references auth.users (id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  constraint entrada_tem_fornecedor check (tipo <> 'entrada' or fornecedor is not null),
  constraint descarte_tem_motivo check (tipo <> 'descarte' or motivo is not null)
);

create index movimentacoes_item_id_idx on public.movimentacoes (item_id);
create index movimentacoes_data_idx on public.movimentacoes (data desc);
create index movimentacoes_created_by_idx on public.movimentacoes (created_by);

-- Saldo atual de cada item
create view public.estoque with (security_invoker = true) as
select
  i.*,
  coalesce(sum(m.quantidade) filter (where m.tipo = 'entrada'), 0)::int  as entradas,
  coalesce(sum(m.quantidade) filter (where m.tipo = 'saida'), 0)::int    as saidas,
  coalesce(sum(m.quantidade) filter (where m.tipo = 'descarte'), 0)::int as descartes,
  coalesce(sum(case when m.tipo = 'entrada' then m.quantidade else -m.quantidade end), 0)::int as saldo
from public.itens i
left join public.movimentacoes m on m.item_id = i.id
group by i.id;

-- Impede que uma saída, um descarte ou a exclusão de uma entrada deixe o estoque negativo
create function public.validar_estoque()
returns trigger
language plpgsql
security definer
set search_path = ''
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
    raise exception 'Estoque insuficiente: a operação deixaria o saldo do item negativo.' using errcode = 'P0001';
  end if;

  return null;
end;
$$;

create constraint trigger movimentacoes_validar_estoque
  after insert or update or delete on public.movimentacoes
  deferrable initially immediate
  for each row execute function public.validar_estoque();

-- ─────────────────────────────────────────────────────────────
-- Registro de atividades (quem fez o quê e quando)
-- ─────────────────────────────────────────────────────────────
create table public.atividades (
  id         uuid primary key default gen_random_uuid(),
  momento    timestamptz not null default now(),
  user_id    uuid references auth.users (id) on delete set null default auth.uid(),
  usuario    text not null,
  acao       text not null check (acao in (
               'login', 'logout', 'login_bloqueado', 'entrada', 'saida', 'descarte', 'exclusao',
               'usuario_criado', 'usuario_alterado', 'usuario_removido',
               'backup_exportado', 'backup_importado', 'dados_limpos')),
  descricao  text not null check (char_length(descricao) <= 500)
);

create index atividades_momento_idx on public.atividades (momento desc);
create index atividades_user_id_idx on public.atividades (user_id);

-- O autor é sempre o usuário conectado, independentemente do que o aplicativo enviar
create function public.preencher_autor_da_atividade()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.user_id := auth.uid();
  new.usuario := coalesce((select nome from public.perfis where id = auth.uid()), 'Sistema');
  new.momento := now();
  return new;
end;
$$;

create trigger atividades_preencher_autor
  before insert on public.atividades
  for each row execute function public.preencher_autor_da_atividade();

-- ─────────────────────────────────────────────────────────────
-- Políticas de acesso (RLS)
-- Operadores registram e consultam; administradores também excluem,
-- gerenciam usuários e consultam o registro de atividades.
-- ─────────────────────────────────────────────────────────────
alter table public.perfis enable row level security;
alter table public.itens enable row level security;
alter table public.movimentacoes enable row level security;
alter table public.atividades enable row level security;

create policy "perfis: ver o próprio ou ser administrador" on public.perfis
  for select to authenticated using (id = (select auth.uid()) or (select privado.eh_administrador()));
create policy "perfis: administradores alteram" on public.perfis
  for update to authenticated using ((select privado.eh_administrador())) with check ((select privado.eh_administrador()));
-- Em Meu perfil, cada um altera o próprio registro; o gatilho proteger_campos_do_perfil limita a alteração ao nome
create policy "perfis: cada um altera o próprio nome" on public.perfis
  for update to authenticated
  using (id = (select auth.uid()) and (select privado.usuario_ativo()))
  with check (id = (select auth.uid()));

create policy "itens: usuários ativos consultam" on public.itens
  for select to authenticated using ((select privado.usuario_ativo()));
create policy "itens: usuários ativos cadastram" on public.itens
  for insert to authenticated with check ((select privado.usuario_ativo()));
create policy "itens: usuários ativos atualizam" on public.itens
  for update to authenticated using ((select privado.usuario_ativo())) with check ((select privado.usuario_ativo()));
create policy "itens: administradores excluem" on public.itens
  for delete to authenticated using ((select privado.eh_administrador()));

create policy "movimentações: usuários ativos consultam" on public.movimentacoes
  for select to authenticated using ((select privado.usuario_ativo()));
create policy "movimentações: usuários ativos registram" on public.movimentacoes
  for insert to authenticated with check ((select privado.usuario_ativo()));
create policy "movimentações: administradores excluem" on public.movimentacoes
  for delete to authenticated using ((select privado.eh_administrador()));

create policy "atividades: usuários ativos registram" on public.atividades
  for insert to authenticated with check ((select privado.usuario_ativo()));
create policy "atividades: administradores consultam" on public.atividades
  for select to authenticated using ((select privado.eh_administrador()));

-- As funções auxiliares não precisam ficar expostas pela API
revoke execute on function public.criar_perfil() from public, anon, authenticated;
revoke execute on function public.preencher_autor_da_atividade() from public, anon, authenticated;
revoke execute on function public.manter_um_administrador() from public, anon, authenticated;
revoke execute on function public.proteger_campos_do_perfil() from public, anon, authenticated;
revoke execute on function public.validar_estoque() from public, anon, authenticated;
revoke execute on function privado.usuario_ativo() from public, anon;
revoke execute on function privado.eh_administrador() from public, anon;
grant execute on function privado.usuario_ativo() to authenticated;
grant execute on function privado.eh_administrador() to authenticated;

-- Primeiro acesso: crie o primeiro administrador em Authentication › Users com o e-mail
--   seunome@logisticaqueaquece.local
-- e, em "User Metadata", informe {"nome": "Seu Nome", "perfil": "Administrador"}.
-- No login do sistema, use apenas "seunome" como nome de usuário. Os demais usuários
-- são criados pelo próprio sistema (Administração › Usuários), por meio da Edge Function
-- supabase/functions/gerenciar-usuarios.
