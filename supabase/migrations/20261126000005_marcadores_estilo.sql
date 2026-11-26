-- Estilo do marcador no mapa.
-- 'logo' = mostra o logo do local sobre o mapa (padrão).
-- 'area' = círculo invisível sobre um logo que já está desenhado na imagem do mapa;
--          mostra anel amarelo e o nome ao passar o mouse, focar ou tocar.
--
-- REGISTRO: esta mudança JÁ FOI APLICADA no projeto. O arquivo existe só como documentação.
-- Não precisa ser aplicada de novo.
alter table public.marcadores
  add column estilo text not null default 'logo' check (estilo in ('logo','area'));
