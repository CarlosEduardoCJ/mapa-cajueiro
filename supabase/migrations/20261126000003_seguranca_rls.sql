-- =====================================================================
-- Parte 3: segurança (Row Level Security)
-- Sem RLS, a chave pública do site poderia ler e alterar tudo.
-- Com RLS, cada tabela só deixa passar o que uma "policy" permitir:
--   * visitante (anon): lê apenas conteúdo publicado/ativo;
--   * admin/editor logado (authenticated): lê e altera só os módulos
--     que tem permissão, conferido pelas funções eh_admin() e pode().
-- =====================================================================

alter table public.perfis              enable row level security;
alter table public.permissoes_editor   enable row level security;
alter table public.configuracoes       enable row level security;
alter table public.categorias          enable row level security;
alter table public.categorias_traducoes enable row level security;
alter table public.locais              enable row level security;
alter table public.locais_traducoes    enable row level security;
alter table public.fotos               enable row level security;
alter table public.mapas               enable row level security;
alter table public.marcadores          enable row level security;
alter table public.eventos             enable row level security;
alter table public.eventos_traducoes   enable row level security;
alter table public.noticias            enable row level security;
alter table public.noticias_traducoes  enable row level security;
alter table public.banners             enable row level security;
alter table public.banners_traducoes   enable row level security;
alter table public.secoes_inicio       enable row level security;
alter table public.historico           enable row level security;

-- ---------- Perfis e permissões: só o admin gerencia ----------
create policy "ver o próprio perfil ou admin vê todos" on public.perfis
  for select to authenticated using (id = (select auth.uid()) or public.eh_admin());
create policy "admin gerencia perfis" on public.perfis
  for all to authenticated using (public.eh_admin()) with check (public.eh_admin());

create policy "ver as próprias permissões ou admin" on public.permissoes_editor
  for select to authenticated using (perfil_id = (select auth.uid()) or public.eh_admin());
create policy "admin gerencia permissões" on public.permissoes_editor
  for all to authenticated using (public.eh_admin()) with check (public.eh_admin());

-- ---------- Configurações ----------
create policy "público lê configurações públicas" on public.configuracoes
  for select to anon, authenticated using (publico);
create policy "equipe gerencia configurações" on public.configuracoes
  for all to authenticated using (public.pode('configuracoes')) with check (public.pode('configuracoes'));

-- ---------- Categorias ----------
create policy "público lê categorias ativas" on public.categorias
  for select to anon, authenticated using (ativo);
create policy "equipe gerencia categorias" on public.categorias
  for all to authenticated using (public.pode('categorias')) with check (public.pode('categorias'));

create policy "público lê traduções de categorias ativas" on public.categorias_traducoes
  for select to anon, authenticated
  using (exists (select 1 from public.categorias c where c.id = categoria_id and c.ativo));
create policy "equipe gerencia traduções de categorias" on public.categorias_traducoes
  for all to authenticated
  using (public.pode('categorias') or public.pode('traducoes'))
  with check (public.pode('categorias') or public.pode('traducoes'));

-- ---------- Locais ----------
create policy "público lê locais publicados" on public.locais
  for select to anon, authenticated using (status = 'publicado');
create policy "equipe gerencia locais" on public.locais
  for all to authenticated using (public.pode('locais')) with check (public.pode('locais'));

create policy "público lê traduções de locais publicados" on public.locais_traducoes
  for select to anon, authenticated
  using (exists (select 1 from public.locais l where l.id = local_id and l.status = 'publicado'));
create policy "equipe gerencia traduções de locais" on public.locais_traducoes
  for all to authenticated
  using (public.pode('locais') or public.pode('traducoes'))
  with check (public.pode('locais') or public.pode('traducoes'));

create policy "público lê fotos de locais publicados" on public.fotos
  for select to anon, authenticated
  using (exists (select 1 from public.locais l where l.id = local_id and l.status = 'publicado'));
create policy "equipe gerencia fotos" on public.fotos
  for all to authenticated using (public.pode('locais')) with check (public.pode('locais'));

-- ---------- Mapa e marcadores ----------
create policy "público lê o mapa ativo" on public.mapas
  for select to anon, authenticated using (ativo);
create policy "equipe gerencia mapas" on public.mapas
  for all to authenticated using (public.pode('mapa')) with check (public.pode('mapa'));

create policy "público lê marcadores visíveis" on public.marcadores
  for select to anon, authenticated
  using (
    ativo
    and exists (select 1 from public.mapas m where m.id = mapa_id and m.ativo)
    and exists (select 1 from public.locais l where l.id = local_id and l.status = 'publicado')
  );
create policy "equipe gerencia marcadores" on public.marcadores
  for all to authenticated using (public.pode('mapa')) with check (public.pode('mapa'));

-- ---------- Eventos ----------
create policy "público lê eventos publicados" on public.eventos
  for select to anon, authenticated using (status = 'publicado');
create policy "equipe gerencia eventos" on public.eventos
  for all to authenticated using (public.pode('eventos')) with check (public.pode('eventos'));

create policy "público lê traduções de eventos publicados" on public.eventos_traducoes
  for select to anon, authenticated
  using (exists (select 1 from public.eventos e where e.id = evento_id and e.status = 'publicado'));
create policy "equipe gerencia traduções de eventos" on public.eventos_traducoes
  for all to authenticated
  using (public.pode('eventos') or public.pode('traducoes'))
  with check (public.pode('eventos') or public.pode('traducoes'));

-- ---------- Notícias ----------
create policy "público lê notícias publicadas" on public.noticias
  for select to anon, authenticated using (status = 'publicado');
create policy "equipe gerencia notícias" on public.noticias
  for all to authenticated using (public.pode('noticias')) with check (public.pode('noticias'));

create policy "público lê traduções de notícias publicadas" on public.noticias_traducoes
  for select to anon, authenticated
  using (exists (select 1 from public.noticias n where n.id = noticia_id and n.status = 'publicado'));
create policy "equipe gerencia traduções de notícias" on public.noticias_traducoes
  for all to authenticated
  using (public.pode('noticias') or public.pode('traducoes'))
  with check (public.pode('noticias') or public.pode('traducoes'));

-- ---------- Página inicial ----------
create policy "público lê banners ativos" on public.banners
  for select to anon, authenticated using (ativo);
create policy "equipe gerencia banners" on public.banners
  for all to authenticated using (public.pode('inicio')) with check (public.pode('inicio'));

create policy "público lê traduções de banners ativos" on public.banners_traducoes
  for select to anon, authenticated
  using (exists (select 1 from public.banners b where b.id = banner_id and b.ativo));
create policy "equipe gerencia traduções de banners" on public.banners_traducoes
  for all to authenticated
  using (public.pode('inicio') or public.pode('traducoes'))
  with check (public.pode('inicio') or public.pode('traducoes'));

create policy "público lê seções da página inicial" on public.secoes_inicio
  for select to anon, authenticated using (true);
create policy "equipe gerencia seções" on public.secoes_inicio
  for all to authenticated using (public.pode('inicio')) with check (public.pode('inicio'));

-- ---------- Histórico: só admin lê; ninguém escreve direto ----------
create policy "admin lê histórico" on public.historico
  for select to authenticated using (public.eh_admin());
