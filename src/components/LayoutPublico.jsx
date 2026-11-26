// Moldura do site público: lê o idioma do endereço (/pt, /en, /es), mostra cabeçalho, página e rodapé.
import { Outlet, useParams } from 'react-router-dom';
import Cabecalho from './Cabecalho.jsx';
import Rodape from './Rodape.jsx';
import NaoEncontrado from '../pages/NaoEncontrado.jsx';
import { useWhatsAppSuporte } from '../lib/config.js';
import { IdiomaProvider } from '../i18n/IdiomaContext.jsx';
import { IDIOMAS } from '../i18n/textos.js';

export default function LayoutPublico() {
  const { lang } = useParams();
  const numeroSuporte = useWhatsAppSuporte();

  // Endereço com idioma que não existe (ex.: /fr) vira "página não encontrada"
  if (!IDIOMAS.includes(lang)) {
    return <NaoEncontrado />;
  }

  return (
    <IdiomaProvider idioma={lang} numeroSuporte={numeroSuporte}>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Cabecalho />
        <main style={{ flex: '1 0 auto' }}>
          <Outlet />
        </main>
        <Rodape />
      </div>
    </IdiomaProvider>
  );
}
