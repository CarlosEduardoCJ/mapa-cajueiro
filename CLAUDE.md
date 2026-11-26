# MAPA CAJUEIRO — instruções para o Claude Code

Leia este arquivo inteiro antes de escrever código. Ele resume o contexto do projeto e as decisões já tomadas (atualizado em 26/11/2026).

---

## 1. O que é o projeto

Guia turístico digital de **Cajueiro da Praia (Piauí, Brasil)** para turistas e moradores. Não é um site institucional simples.

O coração do produto:
- **Mapa turístico ilustrado e interativo**: logos de estabelecimentos e pontos turísticos sobre uma ilustração da cidade.
- Hospedagem, gastronomia, pontos turísticos, eventos, notícias, busca e filtros.
- **Três idiomas**: português, inglês e espanhol.
- **Painel administrativo (`/admin`)** onde a equipe altera praticamente tudo sem mexer em código.
- **Celular é o dispositivo principal**: carregamento rápido, botões grandes, textos legíveis.

O site público não exige login. Comerciantes **não** têm conta: eles pedem alterações pelo WhatsApp e a equipe faz pelo painel.

## 2. Como trabalhar com o responsável

O responsável (Eduardo) e a Ana Júlia (front-end) estão **aprendendo**. Eles não têm experiência prévia com programação.

- Explique as decisões em português simples, sem jargão desnecessário.
- Trabalhe em etapas pequenas; ao fim de cada etapa diga **como testar** e **o que deveria aparecer**.
- Teste de verdade antes de dizer que algo funciona (rode o build e abra no navegador).
- Não invente que algo foi implementado.
- Mostre riscos e questione premissas frágeis; não concorde automaticamente.
- Antes de mudar uma decisão deste arquivo, explique benefícios, custos, riscos e retrabalho.
- Faça uma pergunta direta quando faltar informação essencial; não faça muitas de uma vez.
- Comente o código em português nos trechos importantes.

## 3. Decisões tomadas

| Item | Decisão |
|---|---|
| Front-end | **React + Vite**, em **JavaScript** (JSX), com CSS próprio usando variáveis. Sem TypeScript por enquanto, para facilitar o aprendizado |
| Rotas | `react-router-dom` |
| Back-end | **Supabase** (PostgreSQL, Auth, Storage, RLS). **Sem servidor próprio** |
| Hospedagem | **Vercel** (gratuita), publicada a partir do GitHub |
| Código | GitHub da equipe |
| Lovable | **Descartado** (não aproveitava o design e não há plano pago). Não sugerir de volta |
| Emergent | Não faz parte da arquitetura |

Não manter dois back-ends. Tudo passa pelo Supabase.

## 4. Supabase (já criado e configurado)

- Projeto: `mapa-cajueiro` — id `ltptfodjglcidxpsiada` — região São Paulo (`sa-east-1`) — plano gratuito.
- URL e chave pública ficam em `.env.local` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`). `.env.local` **não** vai para o GitHub.
- **Nunca** use a chave `service_role` (ou secret) no front-end nem a coloque no código.

### O banco já existe — não recrie

As 4 migrações em `supabase/migrations/` **já foram aplicadas** no projeto. Elas estão aqui como registro e documentação. Qualquer mudança nova no banco deve ser uma **nova migração** (novo arquivo com data maior), explicada ao responsável antes de aplicar. Nunca apague tabelas ou dados sem pedir.

### Tabelas (schema `public`)

| Tabela | Para quê |
|---|---|
| `perfis` | Pessoas do `/admin` (id = `auth.users.id`), `papel` = `admin` ou `editor`, `ativo` |
| `permissoes_editor` | Módulos liberados para cada editor: `locais`, `mapa`, `categorias`, `eventos`, `noticias`, `inicio`, `midia`, `traducoes`, `configuracoes` |
| `configuracoes` | Chave/valor (`jsonb`). `publico = true` pode ser lido pelo site. Já tem `whatsapp_suporte = "5586999933162"` |
| `categorias` + `categorias_traducoes` | Categorias com `tipo` (`estabelecimento` / `ponto_turistico`), `ordem`, `ativo`. 15 já cadastradas, só em PT |
| `locais` | **Estabelecimentos e pontos turísticos juntos** (campo `tipo`). Contatos, endereço, `latitude`/`longitude` reais, `status` (`rascunho`/`publicado`/`inativo`), `destaque`, `eh_demonstracao`, `logo_path` |
| `locais_traducoes` | Por idioma: `descricao`, `servicos` (array), `informacoes_uteis`, `revisado` |
| `fotos` | Galeria de cada local (`path`, `ordem`) |
| `mapas` | Imagem do mapa ilustrado (`imagem_path`, `largura`, `altura`). **Só um `ativo` por vez** |
| `marcadores` | Posição **visual** do local no mapa: `x`, `y` entre 0 e 1, `tamanho` (fração da largura), `ativo` |
| `eventos` + `eventos_traducoes` | Agenda |
| `noticias` + `noticias_traducoes` | Notícias |
| `banners` + `banners_traducoes` | Banners da página inicial |
| `secoes_inicio` | Ordem e visibilidade das seções da página inicial |
| `historico` | Preenchido **automaticamente** por gatilhos em todas as tabelas acima (quem, o quê, antes, depois) |

Gatilhos automáticos: `atualizado_em` em todas; `criado_por`/`atualizado_por` em `locais`.

### Segurança (RLS ligada em todas as tabelas)

- Visitante (`anon`) lê **apenas** o que está publicado/ativo (locais publicados, marcadores ativos de locais publicados no mapa ativo, categorias ativas, configurações públicas etc.).
- Logado (`authenticated`) só altera os módulos permitidos, conferido por `public.eh_admin()` e `public.pode('<modulo>')`. Admin pode tudo.
- `historico` só o admin lê; ninguém escreve direto.
- A interface pode esconder botões conforme a permissão (chamando `eh_admin` / `pode` via RPC), mas **a proteção real é o banco**. Nunca confie só na tela.

### Storage

- Bucket **`midia`**, público para leitura. Envio/alteração/remoção só pela equipe logada com permissão.
- Limite de 5 MB por arquivo; apenas `image/jpeg`, `image/png`, `image/webp` (SVG proibido).
- **Comprimir e redimensionar no navegador antes do envio** (ex.: `browser-image-compression`, máx. ~1600 px, WebP). O plano gratuito tem só 1 GB.
- Organizar caminhos: `locais/<id>/logo.webp`, `locais/<id>/fotos/<uuid>.webp`, `mapas/<id>.webp`, `banners/<id>.webp`, `eventos/<id>.webp`, `noticias/<id>.webp`.

### Primeiro administrador

A conta `karlloseduardo80@gmail.com` deve ser criada pelo painel do Supabase (Authentication → Users → convite) — a senha **nunca** passa pelo chat. Depois de aceita, o perfil admin é criado com:

```sql
insert into public.perfis (id, nome, papel)
select id, 'Administrador', 'admin' from auth.users where email = 'karlloseduardo80@gmail.com';
```

### Limites do plano gratuito

500 MB de banco, 1 GB de arquivos, projeto **pausa após 1 semana sem uso**, **sem backup automático** (criar rotina de exportação na entrega 5).

## 5. Identidade visual

Referências em `docs/referencias/`:
- `pagina-inicial-aprovada.png` — **topo da página inicial aprovado** (seguir fielmente).
- `colagem-15-telas.png` — referência das ~15 telas.
- `logo.png` / `logo.pdf` — logo oficial "Descubra Cajueiro da Praia".
- `mapa-ilustrado-rascunho.jpg` — mapa ilustrado de teste (a versão final ainda será feita).
- `logos-mapa/` — recortes dos logos que aparecem no rascunho (só referência visual).

Protótipo navegável aprovado: https://claude.ai/artifact/1wwyMuGJQM4ZMwPYLrnr3h

Tokens:
- Azul oceano `#1A5FB4` (escuro `#1550A8`, texto `#18324F`), amarelo sol `#F7C21A`, verde WhatsApp `#25A244`, fundo claro `#F4F9FF`, cartões brancos.
- Fontes (Google Fonts): **Damion** ("Descubra"), **Lily Script One** ("Cajueiro da Praia" no topo, com contorno branco), **Pacifico** (títulos de seção), **Nunito** (textos e botões).
- Cantos arredondados, sombras suaves, ícones circulares para categorias, botões em pílula com altura mínima de 44 px.
- Cabeçalho: logo, links Início / Mapa da cidade / Contato (ativo sublinhado em amarelo), botões redondos PT/EN/ES, botão verde "Suporte" com ícone do WhatsApp.
- Topo da home: foto de pôr do sol na praia ao fundo (virá de `banners`), "Descubra" + "Cajueiro da Praia", frase curta, botões "Explorar o mapa" (amarelo) e "Falar no WhatsApp" (branco com borda verde), mapa ilustrado inclinado com moldura branca à direita.
- Ícones em SVG de traço (sem emoji).

## 6. O mapa interativo (funcionalidade principal)

Dois tipos de coordenada — **não confundir**:
1. `marcadores.x`, `marcadores.y` (0–1): posição na **imagem**.
2. `locais.latitude`, `locais.longitude`: posição **real**, usada no "Como chegar".

Ao clicar num marcador:
1. O mapa faz **zoom suave** até o ponto (transform CSS com transição; não sair da borda da imagem).
2. O fundo escurece e desfoca.
3. Abre um **modal central** (no computador não ocupa a tela toda; no celular se adapta).
4. Ao fechar, o mapa volta suavemente ao enquadramento anterior.

Modal: logo, nome, categoria, galeria, descrição, serviços, WhatsApp, telefone, Instagram e site (só se existirem), endereço, botões **Google Maps** (`https://www.google.com/maps/dir/?api=1&destination=LAT,LNG`) e **Waze** (`https://waze.com/ul?ll=LAT,LNG&navigate=yes`), e "Atualizar informações deste local" (WhatsApp oficial com mensagem pré-preenchida com o nome do local).

No `/admin`, o **editor do mapa** deve permitir: trocar a imagem do mapa, clicar na imagem para posicionar um local, arrastar para mover, mudar o tamanho, ativar/desativar e remover marcadores. Ao trocar a imagem, avisar que as posições precisam ser conferidas.

O mapa deve funcionar bem no celular (pinça/arrasto ou zoom por botões).

## 7. Páginas e rotas

Públicas, com prefixo de idioma: `/pt`, `/en`, `/es` (ex.: `/pt/mapa`, `/en/mapa`).
- Início, Mapa da cidade, Sobre, Turismo, Pontos turísticos, Hospedagem, Gastronomia, Eventos, Notícias, Contato, e páginas de detalhe de locais/eventos/notícias.
- Primeira visita: tela de escolha de idioma (3 botões grandes) salva no navegador; seletor também no cabeçalho. A tela de idioma não pode impedir a indexação (links compartilhados abrem direto no idioma da URL).
- Se faltar tradução, mostrar o português com um aviso curto no idioma escolhido.
- SEO: título, descrição e metadados por página.

Administrativas: `/admin` (login), com Dashboard, Locais, Mapa e marcadores, Categorias, Eventos, Notícias, Página inicial e banners, Imagens, Traduções, Usuários e permissões, Histórico, Configurações. Rotas privadas protegidas; menus conforme permissão.

## 8. Regras do conteúdo

- **Não inventar** avaliações, estrelas, estatísticas, endereços, telefones, eventos ou informações comerciais.
- Dados de teste devem ter `eh_demonstracao = true` e aparecer identificados como demonstração.
- Os nomes do mapa de rascunho (Óptica Lu, Mercantil, CL, Mix Utilidades, Consult Farma, Diva, padaria) **não** são estabelecimentos confirmados.
- Suporte **só por WhatsApp** (`+55 86 99993-3162`, `https://wa.me/5586999933162`). **Não criar formulário** de contato/suporte nem mensagens internas. O número vem de `configuracoes`, nunca fixo no código.
- Traduções EN/ES precisam de revisão humana (campo `revisado`); não apresentar tradução automática como oficial.
- Não inventar fatos históricos sobre a cidade na página Sobre: deixar o texto editável pelo painel.

## 9. Ordem das entregas

Cada entrega precisa funcionar de ponta a ponta antes da próxima.

1. **Base + fluxo completo de um local**
   - Projeto Vite + React, Supabase client, rotas, layout com cabeçalho/rodapé.
   - `/admin` com login (Supabase Auth) e proteção de rota.
   - Cadastro de local: nome, tipo, categoria, descrição, contatos, endereço, lat/lng, logo, 2–3 fotos, status.
   - Editor do mapa: subir a imagem do mapa e posicionar o marcador clicando.
   - Mapa público lendo do banco, com zoom + modal + Google Maps/Waze + WhatsApp.
   - **Teste de aceitação** (só aprovar com dados reais do banco, não estáticos): admin entra → cadastra uma pousada de demonstração com logo e fotos → informa lat/lng → posiciona o marcador → publica → a pousada aparece no site → clicar no marcador aproxima o mapa e abre o modal com os dados corretos → WhatsApp e navegação externa abrem → fechar volta ao enquadramento.
   - Publicar na Vercel.
2. Página inicial igual ao protótipo, com dados do banco; busca e filtros reais; Contato.
3. Três idiomas, URLs por idioma, tela de escolha, fallback para PT.
4. Hospedagem, Gastronomia, Turismo, Pontos turísticos, Eventos, Notícias, Sobre (páginas + cadastros).
5. Usuários e permissões de editor, histórico, banners e seções da home, configurações, rotina de backup, revisão de segurança (`get_advisors`) e desempenho.

## 10. Ainda não definido (não inventar respostas)

Domínio oficial; lista de estabelecimentos participantes e seus dados; imagem final do mapa e posições; responsáveis pelas traduções (com o 3º GT); editores e permissões; divisão de funções entre as quatro pessoas; política de backup; data de lançamento; perfil oficial do Instagram.

## 11. Manutenção

Quatro pessoas mantêm o projeto após a formatura. Por isso:
- Documentar em `README.md` como rodar, publicar e onde ficam os acessos (sem senhas).
- Mais de um dono no GitHub, no Supabase e na Vercel.
- Nada de credenciais no repositório.

## 12. Comandos

```bash
npm install        # instala as dependências
npm run dev        # roda o site em http://localhost:5173
npm run build      # gera a versão de produção (rode antes de dizer que terminou)
```
