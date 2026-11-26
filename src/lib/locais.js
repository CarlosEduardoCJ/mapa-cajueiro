// Funções compartilhadas para ler locais (estabelecimentos e pontos turísticos).

// Nome da categoria em português (os outros idiomas entram na Entrega 3)
export function nomeCategoria(local) {
  const traducoes = local?.categorias?.categorias_traducoes || [];
  return traducoes.find((t) => t.idioma === 'pt')?.nome || '';
}

// Texto em português de um local (descrição, serviços)
export function traducaoPt(traducoes) {
  return (traducoes || []).find((t) => t.idioma === 'pt') || null;
}

// Colunas que o site público pede do banco ao listar locais
export const COLUNAS_LOCAL_PUBLICO = `
  id, slug, tipo, nome, logo_path, whatsapp, telefone, instagram, site,
  endereco, latitude, longitude, horario_funcionamento, eh_demonstracao,
  categorias ( slug, categorias_traducoes ( nome, idioma ) )
`;

// Grupos do menu de filtros (como no protótipo). Cada grupo junta categorias do banco pelo slug.
export const GRUPOS = [
  { chave: 'hosp', rotulo: 'Hospedagem', slugs: ['pousadas', 'hoteis'] },
  { chave: 'gastro', rotulo: 'Gastronomia', slugs: ['restaurantes', 'bares', 'padarias', 'cafes'] },
  { chave: 'comercio', rotulo: 'Comércio', slugs: ['mercantis', 'lojas', 'servicos', 'outros'] },
  { chave: 'saude', rotulo: 'Farmácias', slugs: ['farmacias'] },
  { chave: 'turismo', rotulo: 'Pontos turísticos', tipo: 'ponto_turistico' },
];

// Descobre a qual grupo um local pertence (ou null)
export function grupoDoLocal(local) {
  const slug = local?.categorias?.slug;
  return (
    GRUPOS.find((g) => (g.tipo ? local?.tipo === g.tipo : g.slugs.includes(slug))) || null
  );
}

// Deixa o texto minúsculo e sem acentos, para comparar na busca
export function normalizarTexto(texto) {
  return (texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}
