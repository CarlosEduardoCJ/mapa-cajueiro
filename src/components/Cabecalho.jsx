// Cabeçalho do site: logo, menu, e botão verde de suporte pelo WhatsApp.
import { NavLink, useNavigate } from 'react-router-dom';
import { linkWhatsApp } from '../lib/utils.js';
import { IconeWhatsApp } from './Icones.jsx';

export default function Cabecalho({ numeroSuporte }) {
  const navigate = useNavigate();
  const linkSuporte = linkWhatsApp(
    numeroSuporte,
    'Olá! Vim pelo site Mapa Cajueiro e preciso de ajuda.',
  );

  return (
    <header className="cabecalho">
      <div className="cabecalho-interno">
        <button className="cabecalho-logo" onClick={() => navigate('/')} aria-label="Mapa Cajueiro — início">
          <img src="/imagens/logo.png" alt="Mapa Cajueiro" />
        </button>

        <nav className="menu" aria-label="Menu principal">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'ativo' : '')}>
            Início
          </NavLink>
          <NavLink to="/mapa" className={({ isActive }) => (isActive ? 'ativo' : '')}>
            Mapa da cidade
          </NavLink>
          <NavLink to="/contato" className={({ isActive }) => (isActive ? 'ativo' : '')}>
            Contato
          </NavLink>
        </nav>

        {linkSuporte ? (
          <a
            href={linkSuporte}
            target="_blank"
            rel="noopener"
            className="btn btn-verde"
            style={{ minHeight: 54, padding: '0 24px', fontSize: 17 }}
          >
            <IconeWhatsApp size={22} />
            Suporte
          </a>
        ) : null}
      </div>
    </header>
  );
}
