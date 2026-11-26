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
