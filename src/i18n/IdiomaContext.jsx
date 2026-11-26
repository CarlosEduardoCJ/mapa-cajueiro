// Idioma atual do site público. Vem do endereço (/pt, /en, /es) e é compartilhado com todas as telas.
import { createContext, useContext, useEffect } from 'react';
import { CHAVE_IDIOMA, IDIOMA_PADRAO, IDIOMAS, TEXTOS } from './textos.js';

const IdiomaContext = createContext(null);

// Guarda a escolha do visitante no navegador (se o navegador bloquear, o site segue normal)
export function salvarIdioma(idioma) {
  try {
    window.localStorage.setItem(CHAVE_IDIOMA, idioma);
  } catch (e) {
    /* navegador sem armazenamento: ignora */
  }
}
export function idiomaSalvo() {
  try {
    const v = window.localStorage.getItem(CHAVE_IDIOMA);
    return IDIOMAS.includes(v) ? v : null;
  } catch (e) {
    return null;
  }
}

export function IdiomaProvider({ idioma, numeroSuporte, children }) {
  const lang = IDIOMAS.includes(idioma) ? idioma : IDIOMA_PADRAO;
  const t = TEXTOS[lang];

  // Avisa o navegador e o Google qual é o idioma da página
  useEffect(() => {
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : lang;
  }, [lang]);

  // Monta um endereço dentro do idioma atual: caminho('/mapa') -> '/en/mapa'
  function caminho(rota = '/') {
    return rota === '/' ? `/${lang}` : `/${lang}${rota}`;
  }

  return (
    <IdiomaContext.Provider value={{ lang, t, caminho, numeroSuporte: numeroSuporte || '' }}>
      {children}
    </IdiomaContext.Provider>
  );
}

export function useIdioma() {
  return useContext(IdiomaContext);
}
