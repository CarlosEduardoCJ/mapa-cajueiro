# Mapa Cajueiro

Guia turístico digital de Cajueiro da Praia (Piauí): mapa ilustrado interativo, locais, eventos, notícias e painel `/admin` para a equipe.

## Como rodar no seu computador

1. Instale o Node.js (versão 20 ou mais nova).
2. Na pasta do projeto, copie `.env.example` para `.env.local` e preencha as duas variáveis (os valores estão no painel do Supabase, em Project Settings → API).
3. Instale as dependências e rode o site:

```bash
npm install
npm run dev
```

Abra http://localhost:5173 no navegador.

## Como publicar (Vercel)

- O projeto é publicado a partir do GitHub (`main`).
- No projeto da Vercel, em Settings → Environment Variables, cadastre `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` com os mesmos valores do `.env.local`.
- Sem essas variáveis, o site publicado não consegue ler o banco.

## Acessos (sem senhas aqui)

- **Banco e login:** Supabase, projeto `mapa-cajueiro` (região São Paulo). Novos administradores são convidados pelo painel do Supabase (Authentication → Users).
- **Nunca** coloque a chave `service_role` ou senhas neste repositório.

## Estrutura

- `src/pages/` — telas do site público (`Inicio`, `MapaCidade`, `Contato`) e do painel (`src/pages/admin/`).
- `src/lib/` — conexão com o Supabase, upload de imagens, login.
- `supabase/migrations/` — registro das migrações já aplicadas no banco. Mudanças novas no banco entram como nova migração.
- `docs/referencias/` — logo, protótipo aprovado e imagens de referência.

Regras de trabalho e decisões do projeto estão em `CLAUDE.md`.
