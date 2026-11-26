-- =====================================================================
-- MAPA CAJUEIRO — Estrutura inicial do banco (Supabase / PostgreSQL)
-- Parte 1: perfis, permissões e funções de apoio
-- =====================================================================

-- Idiomas aceitos em todo o sistema
create type public.idioma as enum ('pt', 'en', 'es');

-- Situação de publicação usada em locais, eventos e notícias
create type public.status_publicacao as enum ('rascunho', 'publicado', 'inativo');

-- Tipo de local: estabelecimento comercial ou ponto turístico
create type public.tipo_local as enum ('estabelecimento', 'ponto_turistico');

-- Função genérica: atualiza a coluna atualizado_em a cada UPDATE
create or replace function public.tocar_atualizado_em()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- PERFIS: um registro para cada pessoa que pode entrar no /admin.
-- Liga-se ao usuário de login (auth.users) pelo mesmo id.
-- ---------------------------------------------------------------------
create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  papel text not null check (papel in ('admin', 'editor')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger perfis_atualizado before update on public.perfis
  for each row execute function public.tocar_atualizado_em();

-- Módulos que um editor pode receber do administrador
create table public.permissoes_editor (
  perfil_id uuid not null references public.perfis (id) on delete cascade,
  modulo text not null check (modulo in (
    'locais', 'mapa', 'categorias', 'eventos', 'noticias',
    'inicio', 'midia', 'traducoes', 'configuracoes'
  )),
  primary key (perfil_id, modulo)
);

-- É administrador ativo?
create or replace function public.eh_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.perfis
    where id = (select auth.uid()) and papel = 'admin' and ativo
  );
$$;

-- Pode mexer neste módulo? (admin pode tudo; editor só o que recebeu)
create or replace function public.pode(p_modulo text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.ativo
      and (
        p.papel = 'admin'
        or exists (
          select 1 from public.permissoes_editor pe
          where pe.perfil_id = p.id and pe.modulo = p_modulo
        )
      )
  );
$$;

revoke execute on function public.eh_admin() from public, anon;
revoke execute on function public.pode(text) from public, anon;
grant execute on function public.eh_admin() to authenticated;
grant execute on function public.pode(text) to authenticated;
