-- =====================================================================
-- Parte 2: tabelas de conteúdo
-- Regra geral: dados "fixos" ficam na tabela principal; textos que mudam
-- conforme o idioma ficam na tabela *_traducoes (uma linha por idioma).
-- =====================================================================

-- CONFIGURAÇÕES (ex.: número oficial do WhatsApp)
create table public.configuracoes (
  chave text primary key,
  valor jsonb not null,
  publico boolean not null default false,   -- true = o site público pode ler
  descricao text,
  atualizado_em timestamptz not null default now()
);
create trigger configuracoes_atualizado before update on public.configuracoes
  for each row execute function public.tocar_atualizado_em();

-- CATEGORIAS
create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  tipo public.tipo_local not null,
  icone text,
  ordem int not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger categorias_atualizado before update on public.categorias
  for each row execute function public.tocar_atualizado_em();

create table public.categorias_traducoes (
  categoria_id uuid not null references public.categorias (id) on delete cascade,
  idioma public.idioma not null,
  nome text not null,
  primary key (categoria_id, idioma)
);

-- LOCAIS: estabelecimentos e pontos turísticos na mesma tabela (campo tipo)
create table public.locais (
  id uuid primary key default gen_random_uuid(),
  tipo public.tipo_local not null,
  categoria_id uuid references public.categorias (id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  nome text not null,
  logo_path text,                -- caminho do arquivo no Storage
  whatsapp text,                 -- só dígitos, com DDI: 5586...
  telefone text,
  instagram text,
  site text,
  cardapio_url text,
  endereco text,
  latitude numeric(9, 6) check (latitude between -90 and 90),     -- localização REAL
  longitude numeric(9, 6) check (longitude between -180 and 180), -- (Google Maps/Waze)
  horario_funcionamento text,
  status public.status_publicacao not null default 'rascunho',
  destaque boolean not null default false,
  eh_demonstracao boolean not null default false,  -- marca dados de teste
  criado_por uuid references auth.users (id) on delete set null,
  atualizado_por uuid references auth.users (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (whatsapp is null or whatsapp ~ '^[0-9]{10,15}$')
);
create index locais_status_idx on public.locais (status);
create index locais_categoria_idx on public.locais (categoria_id);
create trigger locais_atualizado before update on public.locais
  for each row execute function public.tocar_atualizado_em();

create table public.locais_traducoes (
  local_id uuid not null references public.locais (id) on delete cascade,
  idioma public.idioma not null,
  descricao text,
  servicos text[] not null default '{}',
  informacoes_uteis text,
  revisado boolean not null default false,   -- tradução revisada pela equipe?
  primary key (local_id, idioma)
);

-- FOTOS da galeria de cada local
create table public.fotos (
  id uuid primary key default gen_random_uuid(),
  local_id uuid not null references public.locais (id) on delete cascade,
  path text not null,
  legenda text,
  ordem int not null default 0,
  criado_em timestamptz not null default now()
);
create index fotos_local_idx on public.fotos (local_id, ordem);

-- MAPAS ilustrados (permite trocar a imagem no futuro; só um ativo por vez)
create table public.mapas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  imagem_path text not null,
  largura int not null check (largura > 0),
  altura int not null check (altura > 0),
  ativo boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create unique index mapas_um_ativo on public.mapas (ativo) where ativo;
create trigger mapas_atualizado before update on public.mapas
  for each row execute function public.tocar_atualizado_em();

-- MARCADORES: posição VISUAL na ilustração (x e y entre 0 e 1)
create table public.marcadores (
  id uuid primary key default gen_random_uuid(),
  mapa_id uuid not null references public.mapas (id) on delete cascade,
  local_id uuid not null references public.locais (id) on delete cascade,
  x numeric(6, 5) not null check (x between 0 and 1),
  y numeric(6, 5) not null check (y between 0 and 1),
  tamanho numeric(6, 5) not null default 0.04 check (tamanho > 0 and tamanho <= 0.2),
  ativo boolean not null default true,
  atualizado_em timestamptz not null default now(),
  unique (mapa_id, local_id)
);
create trigger marcadores_atualizado before update on public.marcadores
  for each row execute function public.tocar_atualizado_em();

-- EVENTOS
create table public.eventos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  inicio timestamptz not null,
  fim timestamptz,
  local_id uuid references public.locais (id) on delete set null,
  imagem_path text,
  status public.status_publicacao not null default 'rascunho',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (fim is null or fim >= inicio)
);
create trigger eventos_atualizado before update on public.eventos
  for each row execute function public.tocar_atualizado_em();

create table public.eventos_traducoes (
  evento_id uuid not null references public.eventos (id) on delete cascade,
  idioma public.idioma not null,
  titulo text not null,
  descricao text,
  local_texto text,
  revisado boolean not null default false,
  primary key (evento_id, idioma)
);

-- NOTÍCIAS
create table public.noticias (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  publicado_em timestamptz,
  imagem_path text,
  status public.status_publicacao not null default 'rascunho',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger noticias_atualizado before update on public.noticias
  for each row execute function public.tocar_atualizado_em();

create table public.noticias_traducoes (
  noticia_id uuid not null references public.noticias (id) on delete cascade,
  idioma public.idioma not null,
  titulo text not null,
  resumo text,
  conteudo text,
  revisado boolean not null default false,
  primary key (noticia_id, idioma)
);

-- PÁGINA INICIAL: banners e ordem/visibilidade das seções
create table public.banners (
  id uuid primary key default gen_random_uuid(),
  imagem_path text not null,
  link text,
  ordem int not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table public.banners_traducoes (
  banner_id uuid not null references public.banners (id) on delete cascade,
  idioma public.idioma not null,
  titulo text,
  subtitulo text,
  texto_botao text,
  primary key (banner_id, idioma)
);

create table public.secoes_inicio (
  chave text primary key,          -- ex.: 'categorias', 'destaques', 'eventos'
  ordem int not null default 0,
  visivel boolean not null default true
);

-- HISTÓRICO de alterações (preenchido automaticamente por gatilhos)
create table public.historico (
  id bigint generated always as identity primary key,
  tabela text not null,
  registro_id text,
  acao text not null check (acao in ('INSERT', 'UPDATE', 'DELETE')),
  usuario_id uuid,
  antes jsonb,
  depois jsonb,
  criado_em timestamptz not null default now()
);
create index historico_tabela_idx on public.historico (tabela, criado_em desc);
