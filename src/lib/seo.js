// Define o título da aba do navegador (e o que aparece nos buscadores) para cada página.
import { useEffect } from 'react';

export function useTitulo(titulo) {
  useEffect(() => {
    if (titulo) document.title = titulo;
  }, [titulo]);
}
