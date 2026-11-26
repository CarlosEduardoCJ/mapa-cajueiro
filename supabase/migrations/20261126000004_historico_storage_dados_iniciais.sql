-- =====================================================================
-- Parte 4: histórico automático, armazenamento de imagens e dados iniciais
-- =====================================================================

-- Gatilho que grava quem mudou o quê, com o "antes" e o "depois"
create or replace function public.registrar_historico()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_antes jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_depois jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
begin
  insert into public.historico (tabela, registro_id, acao, usuario_id, antes, depois)
  values (
    tg_table_name,
    coalesce(v_depois ->> 'id', v_antes ->> 'id',
             v_depois ->> 'local_id', v_antes ->> 'local_id',
             v_depois ->> 'chave', v_antes ->> 'chave'),
    tg_op,
    (select auth.uid()),
    v_antes,
    v_depois
  );
  return coalesce(new, old);
end $$;
revoke execute on function public.registrar_historico() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'perfis', 'permissoes_editor', 'configuracoes', 'categorias', 'categorias_traducoes',
    'locais', 'locais_traducoes', 'fotos', 'mapas', 'marcadores',
    'eventos', 'eventos_traducoes', 'noticias', 'noticias_traducoes',
    'banners', 'banners_traducoes', 'secoes_inicio'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I
         for each row execute function public.registrar_historico()',
      t || '_historico', t);
  end loop;
end $$;

-- Preenche automaticamente quem criou/alterou cada local
create or replace function public.marcar_autor_local()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then new.criado_por := (select auth.uid()); end if;
  new.atualizado_por := (select auth.uid());
  return new;
end $$;
create trigger locais_autor before insert or update on public.locais
  for each row execute function public.marcar_autor_local();

-- ---------------------------------------------------------------------
-- STORAGE: pasta "midia" para logos, fotos, banners e a imagem do mapa.
-- Leitura pública (as imagens aparecem no site); envio só pela equipe.
-- Limite de 5 MB por arquivo; apenas JPG, PNG e WebP (SVG fica de fora
-- porque pode carregar código).
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('midia', 'midia', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

create policy "equipe envia imagens" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'midia' and (public.pode('midia') or public.pode('locais')
    or public.pode('mapa') or public.pode('eventos') or public.pode('noticias') or public.pode('inicio')));

create policy "equipe altera imagens" on storage.objects
  for update to authenticated
  using (bucket_id = 'midia' and (public.pode('midia') or public.pode('locais')
    or public.pode('mapa') or public.pode('eventos') or public.pode('noticias') or public.pode('inicio')));

create policy "equipe apaga imagens" on storage.objects
  for delete to authenticated
  using (bucket_id = 'midia' and (public.pode('midia') or public.pode('locais')
    or public.pode('mapa') or public.pode('eventos') or public.pode('noticias') or public.pode('inicio')));

create policy "equipe lista imagens" on storage.objects
  for select to authenticated
  using (bucket_id = 'midia' and (public.pode('midia') or public.pode('locais')
    or public.pode('mapa') or public.pode('eventos') or public.pode('noticias') or public.pode('inicio')));

-- ---------------------------------------------------------------------
-- DADOS INICIAIS (decisões já registradas no contexto do projeto)
-- ---------------------------------------------------------------------
insert into public.configuracoes (chave, valor, publico, descricao) values
  ('whatsapp_suporte', '"5586999933162"', true, 'Número oficial de suporte (só dígitos, com DDI)');

-- Categorias iniciais sugeridas no contexto. Só em português por enquanto:
-- inglês e espanhol entram depois da revisão das traduções.
with novas (slug, tipo, ordem, nome) as (values
  ('pousadas', 'estabelecimento', 1, 'Pousadas'),
  ('hoteis', 'estabelecimento', 2, 'Hotéis'),
  ('restaurantes', 'estabelecimento', 3, 'Restaurantes'),
  ('bares', 'estabelecimento', 4, 'Bares'),
  ('padarias', 'estabelecimento', 5, 'Padarias'),
  ('cafes', 'estabelecimento', 6, 'Cafés'),
  ('mercantis', 'estabelecimento', 7, 'Mercantis'),
  ('lojas', 'estabelecimento', 8, 'Lojas'),
  ('farmacias', 'estabelecimento', 9, 'Farmácias'),
  ('servicos', 'estabelecimento', 10, 'Serviços'),
  ('outros', 'estabelecimento', 11, 'Outros'),
  ('praias', 'ponto_turistico', 20, 'Praias'),
  ('natureza', 'ponto_turistico', 21, 'Natureza'),
  ('cultura', 'ponto_turistico', 22, 'Cultura'),
  ('passeios', 'ponto_turistico', 23, 'Passeios')
), inseridas as (
  insert into public.categorias (slug, tipo, ordem)
  select slug, tipo::public.tipo_local, ordem from novas
  returning id, slug
)
insert into public.categorias_traducoes (categoria_id, idioma, nome)
select i.id, 'pt', n.nome from inseridas i join novas n using (slug);

insert into public.secoes_inicio (chave, ordem) values
  ('banner', 1), ('categorias', 2), ('mapa', 3), ('destaques', 4),
  ('pontos_turisticos', 5), ('hospedagem', 6), ('gastronomia', 7),
  ('eventos', 8), ('noticias', 9), ('contato', 10);
