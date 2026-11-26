// Ajudantes para eventos, notícias e textos "Sobre": idioma, datas e fallback para português.

const LOCALES = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' };

// Data e hora no formato do idioma (ex.: "10 de dezembro de 2026, 18:00")
export function formatarData(iso, lang = 'pt', comHora = true) {
  if (!iso) return '';
  const opcoes = comHora ? { dateStyle: 'long', timeStyle: 'short' } : { dateStyle: 'long' };
  return new Date(iso).toLocaleString(LOCALES[lang] || 'pt-BR', opcoes);
}

// Escolhe a tradução do idioma pedido; se o campo principal estiver vazio, cai no português.
// Devolve também se foi preciso usar o português (para mostrar o aviso).
export function escolherIdioma(traducoes, lang, campoPrincipal = 'titulo') {
  const lista = traducoes || [];
  const pedida = lista.find((t) => t.idioma === lang);
  if (pedida && pedida[campoPrincipal]) return { traducao: pedida, usouPortugues: false };
  const pt = lista.find((t) => t.idioma === 'pt') || null;
  return { traducao: pt, usouPortugues: lang !== 'pt' };
}
