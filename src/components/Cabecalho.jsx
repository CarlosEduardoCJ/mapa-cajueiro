// Cabeçalho do site. Computador: menu na linha de cima, com submenu do Turismo.
// Celular (abaixo de 900px): botão de 3 linhas que abre um painel com todos os links, idiomas e suporte.
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useIdioma, salvarIdioma } from '../i18n/IdiomaContext.jsx';
import { IDIOMAS } from '../i18n/textos.js';
import { linkWhatsApp } from '../lib/utils.js';
import { IconeWhatsApp } from './Icones.jsx';
import { itensMenu } from './itensMenu.js';

export default function Cabecalho() {
  const { lang, t, caminho, numeroSuporte } = useIdioma();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const [menuAberto, setMenuAberto] = useState(false); // painel do celular
  const [turismoAberto, setTurismoAberto] = useState(false); // submenu do Turismo
  const linkSuporte = linkWhatsApp(numeroSuporte, t.msgSuporte);
  const itens = itensMenu(t);

  // Fecha os menus ao trocar de página
  useEffect(() => {
    setMenuAberto(false);
    setTurismoAberto(false);
  }, [pathname]);

  // Com o painel do celular aberto, a página de trás não rola
  useEffect(() => {
    document.body.style.overflow = menuAberto ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuAberto]);

  // Diz se a página atual é esta (ou está dentro dela): fica sublinhada em amarelo
  function ativo(rota) {
    const alvo = caminho(rota);
    if (rota === '/') return pathname === caminho('/');
    return pathname === alvo || pathname.startsWith(`${alvo}/`);
  }

  // Troca o idioma mantendo a mesma página: /pt/mapa -> /en/mapa
  function trocarIdioma(novo) {
    salvarIdioma(novo);
    const resto = pathname.replace(new RegExp(`^/${lang}`), '') || '';
    navigate(`/${novo}${resto}${search}`);
  }

  // Botão de idioma (PT / EN / ES), usado no cabeçalho e no painel do celular
  function botoesIdioma() {
    return IDIOMAS.map((l) => (
      <button key={l} onClick={() => trocarIdioma(l)} aria-pressed={lang === l} className={`lp${lang === l ? ' sel' : ''}`} lang={l}>
        {l.toUpperCase()}
      </button>
    ));
  }

  return (
    <header className="cabecalho">
      <div className="cabecalho-interno">
        <button className="cabecalho-logo" onClick={() => navigate(caminho('/'))} aria-label="Mapa Cajueiro">
          <img src="/imagens/logo.png" alt="Mapa Cajueiro" />
        </button>

        {/* Menu do computador */}
        <nav className="menu" aria-label={t.navMapa}>
          {itens.map((item) =>
            item.grupo ? (
              <div
                key={item.rotulo}
                className={`submenu${turismoAberto ? ' aberto' : ''}`}
                onPointerEnter={(e) => e.pointerType === 'mouse' && setTurismoAberto(true)}
                onPointerLeave={(e) => e.pointerType === 'mouse' && setTurismoAberto(false)}
              >
                <button
                  className={`menu-botao${item.grupo.some((g) => ativo(g.rota)) ? ' ativo' : ''}`}
                  aria-expanded={turismoAberto}
                  onClick={() => setTurismoAberto((v) => !v)}
                >
                  {item.rotulo} <span aria-hidden="true">▾</span>
                </button>
                <div className="submenu-lista">
                  {item.grupo.map((g) => (
                    <Link key={g.rota} to={caminho(g.rota)} className={ativo(g.rota) ? 'ativo' : ''}>
                      {g.rotulo}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link key={item.rota} to={caminho(item.rota)} className={ativo(item.rota) ? 'ativo' : ''}>
                {item.rotulo}
              </Link>
            ),
          )}
        </nav>

        <div className="cabecalho-acoes" role="group" aria-label={t.navMapa}>
          {botoesIdioma()}
          {linkSuporte ? (
            <a href={linkSuporte} target="_blank" rel="noopener" className="btn btn-verde cabecalho-suporte">
              <IconeWhatsApp size={22} />
              {t.suporte}
            </a>
          ) : null}
        </div>

        {/* Botão de 3 linhas: só aparece no celular */}
        <button
          className="menu-hamburguer"
          aria-label={menuAberto ? t.navFecharMenu : t.navAbrirMenu}
          aria-expanded={menuAberto}
          onClick={() => setMenuAberto((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {/* Painel do celular: todos os links em letra grande */}
      {menuAberto ? (
        <div className="menu-celular">
          {itens.map((item) =>
            item.grupo ? (
              <div key={item.rotulo} className="menu-celular-grupo">
                <span className="menu-celular-titulo">{item.rotulo}</span>
                {item.grupo.map((g) => (
                  <Link key={g.rota} to={caminho(g.rota)} className={`subitem${ativo(g.rota) ? ' ativo' : ''}`} onClick={() => setMenuAberto(false)}>
                    {g.rotulo}
                  </Link>
                ))}
              </div>
            ) : (
              <Link key={item.rota} to={caminho(item.rota)} className={ativo(item.rota) ? 'ativo' : ''} onClick={() => setMenuAberto(false)}>
                {item.rotulo}
              </Link>
            ),
          )}
          <div className="menu-celular-idiomas" role="group" aria-label={t.navMapa}>
            {botoesIdioma()}
          </div>
          {linkSuporte ? (
            <a href={linkSuporte} target="_blank" rel="noopener" className="btn btn-verde" style={{ minHeight: 54, fontSize: 18 }}>
              <IconeWhatsApp size={22} />
              {t.suporte}
            </a>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
