// Funções compartilhadas para ler locais (estabelecimentos e pontos turísticos).

// Nome da categoria no idioma pedido; se não existir, usa o português
export function nomeCategoria(local, idioma = 'pt') {
  const traducoes = local?.categorias?.categorias_traducoes || [];
  return (
    traducoes.find((t) => t.idioma === idioma)?.nome ||
    traducoes.find((t) => t.idioma === 'pt')?.nome ||
    ''
  );
}

// Texto de um local no idioma pedido (descrição, serviços).
// Devolve também se foi preciso cair no português (para mostrar o aviso ao visitante).
export function escolherTraducao(traducoes, idioma = 'pt') {
  const lista = traducoes || [];
  const escolhida = lista.find((t) => t.idioma === idioma);
  if (escolhida && (escolhida.descricao || (escolhida.servicos || []).length)) {
    return { traducao: escolhida, usouPortugues: false };
  }
  const pt = lista.find((t) => t.idioma === 'pt') || null;
  return { traducao: pt, usouPortugues: idioma !== 'pt' };
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
