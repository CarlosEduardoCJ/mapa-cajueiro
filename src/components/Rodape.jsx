// Rodapé do site público.
import { Link, useNavigate } from 'react-router-dom';
import { useIdioma, salvarIdioma } from '../i18n/IdiomaContext.jsx';
import { CHAVE_IDIOMA } from '../i18n/textos.js';
import { linkWhatsApp } from '../lib/utils.js';
import { IconeWhatsApp } from './Icones.jsx';
import { itensMenu } from './itensMenu.js';

export default function Rodape() {
  const { t, caminho, numeroSuporte } = useIdioma();
  const navigate = useNavigate();
  const linkSuporte = linkWhatsApp(numeroSuporte, t.msgSuporte);
  // Mesmos links do cabeçalho, em lista simples (Turismo aparece com seus três itens)
  const linksMenu = itensMenu(t).flatMap((item) => (item.grupo ? item.grupo : [item]));

  // Mostra de novo a tela de escolha de idioma (apaga a escolha salva)
  function reverIdioma() {
    try {
      window.localStorage.removeItem(CHAVE_IDIOMA);
    } catch (e) {
      /* ignora */
    }
    navigate('/');
  }

  return (
    <footer className="rodape">
      <div className="rodape-interno">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ font: '400 26px Pacifico, cursive' }}>Mapa Cajueiro</span>
          <small>{t.rodape}</small>
        </div>
        <nav className="rodape-menu" aria-label={t.navMapa}>
          {linksMenu.map((l) => (
            <Link key={l.rota} to={caminho(l.rota)}>{l.rotulo}</Link>
          ))}
        </nav>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {linkSuporte ? (
            <a href={linkSuporte} target="_blank" rel="noopener" className="btn btn-verde">
              <IconeWhatsApp size={20} /> WhatsApp
            </a>
          ) : null}
          <button onClick={reverIdioma} className="btn" style={{ background: 'transparent', color: '#fff', border: '2px solid rgba(255,255,255,.6)' }}>
            {t.rever}
          </button>
          <Link to="/admin/login" className="btn" style={{ background: 'transparent', color: '#fff', border: '2px solid rgba(255,255,255,.6)' }}>
            {t.areaEquipe}
          </Link>
        </div>
      </div>
      <p className="rodape-credito">{t.desenvolvidoPor}</p>
    </footer>
  );
}
