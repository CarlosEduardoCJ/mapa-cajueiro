// Ícones circulares das categorias (SVG de traço, como no protótipo).
const CAMINHOS = {
  hosp: <path d="M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5" />,
  gastro: <path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M17 3c-2 2-3 5-3 8h3v10" />,
  comercio: <path d="M5 8h14l-1 13H6zM9 8a3 3 0 0 1 6 0" />,
  saude: <><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M12 8v8M8 12h8" /></>,
  turismo: <path d="M12 21v-9M12 12c-1-4-5-5-8-4 3-3 7-2 8 1 1-3 5-4 8-1-3-1-7 0-8 4zM4 21h16" />,
  eventos: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  noticias: <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M7 9h10M7 13h10M7 17h6" /></>,
};

export default function IconeCategoria({ tipo, tamanho = 26 }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {CAMINHOS[tipo]}
    </svg>
  );
}
