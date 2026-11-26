// Moldura do site público: cabeçalho em cima, rodapé embaixo, e a página no meio.
import { Outlet } from 'react-router-dom';
import Cabecalho from './Cabecalho.jsx';
import Rodape from './Rodape.jsx';
import { useWhatsAppSuporte } from '../lib/config.js';

export default function LayoutPublico() {
  const numeroSuporte = useWhatsAppSuporte();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Cabecalho numeroSuporte={numeroSuporte} />
      <main style={{ flex: '1 0 auto' }}>
        <Outlet context={{ numeroSuporte }} />
      </main>
      <Rodape numeroSuporte={numeroSuporte} />
    </div>
  );
}
