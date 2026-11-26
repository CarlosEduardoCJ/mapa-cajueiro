// Cabeçalho do site: logo, menu, troca de idioma (PT / EN / ES) e botão verde de suporte.
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useIdioma, salvarIdioma } from '../i18n/IdiomaContext.jsx';
import { IDIOMAS } from '../i18n/textos.js';
import { linkWhatsApp } from '../lib/utils.js';
import { IconeWhatsApp } from './Icones.jsx';

export default function Cabecalho() {
  const { lang, t, caminho, numeroSuporte } = useIdioma();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const linkSuporte = linkWhatsApp(numeroSuporte, t.msgSuporte);

  // Troca o idioma mantendo a mesma página: /pt/mapa -> /en/mapa
  function trocarIdioma(novo) {
    salvarIdioma(novo);
    const resto = pathname.replace(new RegExp(`^/${lang}`), '') || '';
    navigate(`/${novo}${resto}${search}`);
  }

  return (
    <header className="cabecalho">
      <div className="cabecalho-interno">
        <button className="cabecalho-logo" onClick={() => navigate(caminho('/'))} aria-label="Mapa Cajueiro">
          <img src="/imagens/logo.png" alt="Mapa Cajueiro" />
        </button>

        <nav className="menu" aria-label="Menu principal">
          <NavLink to={caminho('/')} end className={({ isActive }) => (isActive ? 'ativo' : '')}>
            {t.navInicio}
          </NavLink>
          <NavLink to={caminho('/mapa')} className={({ isActive }) => (isActive ? 'ativo' : '')}>
            {t.navMapa}
          </NavLink>
          <NavLink to={caminho('/contato')} className={({ isActive }) => (isActive ? 'ativo' : '')}>
            {t.navContato}
          </NavLink>
        </nav>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }} role="group" aria-label="Idioma">
          {IDIOMAS.map((l) => (
            <button
              key={l}
              onClick={() => trocarIdioma(l)}
              aria-pressed={lang === l}
              className={`lp${lang === l ? ' sel' : ''}`}
              lang={l}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {linkSuporte ? (
          <a
            href={linkSuporte}
            target="_blank"
            rel="noopener"
            className="btn btn-verde"
            style={{ minHeight: 54, padding: '0 24px', fontSize: 17 }}
          >
            <IconeWhatsApp size={22} />
            {t.suporte}
          </a>
        ) : null}
      </div>
    </header>
  );
}
