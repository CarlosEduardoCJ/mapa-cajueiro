// Rodapé do site público.
import { Link } from 'react-router-dom';
import { linkWhatsApp } from '../lib/utils.js';
import { IconeWhatsApp } from './Icones.jsx';

export default function Rodape({ numeroSuporte }) {
  const linkSuporte = linkWhatsApp(numeroSuporte, 'Olá! Vim pelo site Mapa Cajueiro e preciso de ajuda.');
  return (
    <footer className="rodape">
      <div className="rodape-interno">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ font: '400 26px Pacifico, cursive' }}>Mapa Cajueiro</span>
          <small>Mapa Turístico de Cajueiro da Praia – PI</small>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {linkSuporte ? (
            <a href={linkSuporte} target="_blank" rel="noopener" className="btn btn-verde">
              <IconeWhatsApp size={20} /> WhatsApp
            </a>
          ) : null}
          <Link to="/admin/login" className="btn" style={{ background: 'transparent', color: '#fff', border: '2px solid rgba(255,255,255,.6)' }}>
            Área da equipe
          </Link>
        </div>
      </div>
    </footer>
  );
}
