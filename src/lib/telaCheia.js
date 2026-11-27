// Tela cheia do mapa público. Três modos:
//  - "normal": o mapa na página, como sempre.
//  - "nativo": tela cheia de verdade do navegador (computador e Android). O Esc do navegador também sai.
//  - "site": "tela cheia do site", para onde o navegador não oferece a API (iPhone): o mapa cobre a tela inteira
//            por cima da página. Se o aparelho estiver em pé, o mapa é girado em 90° para ficar na horizontal.
import { useEffect, useState } from 'react';

const elementoEmTelaCheia = () => document.fullscreenElement || document.webkitFullscreenElement || null;

// Tenta travar a tela na horizontal (Android). Em aparelhos que não suportam, ignora o erro.
function tentarTravarPaisagem() {
  try {
    if (window.matchMedia('(pointer: coarse)').matches && screen.orientation?.lock) {
      screen.orientation.lock('landscape').catch(() => {});
    }
  } catch (e) {
    /* sem suporte: segue sem travar */
  }
}
function liberarOrientacao() {
  try {
    screen.orientation?.unlock?.();
  } catch (e) {
    /* ignora */
  }
}

export function useTelaCheia(palcoRef) {
  const [modo, setModo] = useState('normal'); // 'normal' | 'nativo' | 'site'
  const [emPe, setEmPe] = useState(false); // aparelho em pé (retrato)?

  // Tela cheia nativa: acompanha o navegador (inclusive quando a pessoa aperta Esc)
  useEffect(() => {
    function aoMudar() {
      const el = elementoEmTelaCheia();
      if (el && el === palcoRef.current) {
        setModo('nativo');
      } else {
        setModo((m) => (m === 'nativo' ? 'normal' : m));
        if (!el) liberarOrientacao();
      }
    }
    document.addEventListener('fullscreenchange', aoMudar);
    document.addEventListener('webkitfullscreenchange', aoMudar);
    return () => {
      document.removeEventListener('fullscreenchange', aoMudar);
      document.removeEventListener('webkitfullscreenchange', aoMudar);
    };
  }, [palcoRef]);

  // Orientação do aparelho (importa no modo "site", para girar o mapa)
  useEffect(() => {
    const consulta = window.matchMedia('(orientation: portrait)');
    const atualizar = () => setEmPe(consulta.matches);
    atualizar();
    consulta.addEventListener?.('change', atualizar);
    return () => consulta.removeEventListener?.('change', atualizar);
  }, []);

  // Modo "site": trava a rolagem da página e deixa o Esc sair
  useEffect(() => {
    if (modo !== 'site') return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function aoTeclar(e) {
      if (e.key === 'Escape') setModo('normal');
    }
    window.addEventListener('keydown', aoTeclar);
    return () => {
      document.body.style.overflow = antes;
      window.removeEventListener('keydown', aoTeclar);
    };
  }, [modo]);

  async function entrar() {
    const el = palcoRef.current;
    if (!el) return;
    const pedir = el.requestFullscreen || el.webkitRequestFullscreen;
    const permitido = document.fullscreenEnabled ?? document.webkitFullscreenEnabled;
    if (pedir && permitido !== false) {
      try {
        await pedir.call(el);
        setModo('nativo');
        tentarTravarPaisagem();
        return;
      } catch (e) {
        /* o navegador recusou: cai para a tela cheia do site */
      }
    }
    setModo('site');
  }

  async function sair() {
    if (modo === 'nativo' || elementoEmTelaCheia()) {
      try {
        await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      } catch (e) {
        /* ignora */
      }
      liberarOrientacao();
    }
    setModo('normal');
  }

  return { modo, emPe, alternar: () => (modo === 'normal' ? entrar() : sair()) };
}
