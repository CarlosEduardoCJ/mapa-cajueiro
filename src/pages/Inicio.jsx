// Página inicial: topo com o desenho do pôr do sol, categorias, locais publicados, eventos e notícias.
import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import HeroFundo from '../components/HeroFundo.jsx';
import IconeCategoria from '../components/IconeCategoria.jsx';
import { IconeSeta, IconeWhatsApp } from '../components/Icones.jsx';
import { supabase, urlImagem } from '../lib/supabase.js';
import { GRUPOS, grupoDoLocal, nomeCategoria } from '../lib/locais.js';
import { inicial, linkWhatsApp } from '../lib/utils.js';

// Botões de categoria da faixa (abrem o mapa já filtrado)
const CATEGORIAS_TOPO = [
  { chave: 'hosp', tipo: 'hosp' },
  { chave: 'gastro', tipo: 'gastro' },
  { chave: 'comercio', tipo: 'comercio' },
  { chave: 'saude', tipo: 'saude' },
  { chave: 'turismo', tipo: 'turismo' },
];

export default function Inicio() {
  const { numeroSuporte } = useOutletContext() || {};
  const [locais, setLocais] = useState([]);
  const [mapaPublicado, setMapaPublicado] = useState(null);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from('locais')
      .select('id, nome, tipo, logo_path, eh_demonstracao, categorias ( slug, categorias_traducoes ( nome, idioma ) )')
      .eq('status', 'publicado')
      .order('nome')
      .then(({ data }) => setLocais(data || []));
    supabase
      .from('mapas')
      .select('imagem_path')
      .eq('ativo', true)
      .maybeSingle()
      .then(({ data }) => setMapaPublicado(data));
  }, []);

  const linkWa = linkWhatsApp(numeroSuporte, 'Olá! Vim pelo site Mapa Cajueiro e preciso de ajuda.');
  // Imagem do mapa usada na moldura inclinada ao lado do texto
  const imagemMapa = mapaPublicado?.imagem_path ? urlImagem(mapaPublicado.imagem_path) : '/imagens/mapa-ilustrado.jpg';
  const rotuloGrupo = Object.fromEntries(GRUPOS.map((g) => [g.chave, g.rotulo]));

  return (
    <>
      <section className="hero">
        <HeroFundo />
        <div className="hero-interno">
          <div className="hero-texto">
            <p className="hero-descubra">Descubra</p>
            <h1 className="hero-titulo">Cajueiro da Praia</h1>
            <p className="hero-frase">Praia, natureza e gente acolhedora no litoral do Piauí.</p>
            <div className="hero-botoes">
              <Link to="/mapa" className="btn btn-amarelo" style={{ minHeight: 64, padding: '0 34px', fontSize: 20, boxShadow: '0 8px 20px rgba(0,0,0,.25)' }}>
                Explorar o mapa <IconeSeta />
              </Link>
              {linkWa ? (
                <a
                  href={linkWa}
                  target="_blank"
                  rel="noopener"
                  className="btn"
                  style={{ background: '#fff', color: '#1A7A35', minHeight: 64, padding: '0 30px', fontSize: 20, border: '3px solid #25A244', boxShadow: '0 8px 20px rgba(0,0,0,.25)' }}
                >
                  <IconeWhatsApp size={26} />
                  Falar no WhatsApp
                </a>
              ) : null}
            </div>
          </div>

          <div className="hero-mapa">
            <Link to="/mapa" aria-label="Explorar o mapa">
              <img src={imagemMapa} alt="" style={{ width: '100%', height: 'auto' }} />
            </Link>
          </div>
        </div>
      </section>

      {/* Faixa de categorias, levemente sobreposta ao topo */}
      <section style={{ maxWidth: 1240, margin: '-28px auto 0', padding: '0 20px', position: 'relative' }}>
        <div className="cartao" style={{ padding: '18px 12px' }}>
          <h2 style={{ margin: '0 0 6px', textAlign: 'center', fontSize: 15, fontWeight: 800, color: '#4A6380', letterSpacing: '.04em', textTransform: 'uppercase' }}>
            O que você procura?
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 4 }}>
            {CATEGORIAS_TOPO.map((c) => (
              <Link key={c.chave} to={`/mapa?grupo=${c.chave}`} className="catb">
                <span className="catb-icone">
                  <IconeCategoria tipo={c.tipo} />
                </span>
                {rotuloGrupo[c.chave]}
              </Link>
            ))}
            <a href="#eventos" className="catb">
              <span className="catb-icone"><IconeCategoria tipo="eventos" /></span>
              Eventos
            </a>
            <a href="#noticias" className="catb">
              <span className="catb-icone"><IconeCategoria tipo="noticias" /></span>
              Notícias
            </a>
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 1240, margin: '0 auto', padding: '48px 20px 8px' }}>
        <h2 className="titulo-pacifico">No mapa</h2>
        <p style={{ margin: '4px 0 20px', color: '#4A6380', fontSize: 16 }}>Toque em um local para ver no mapa.</p>

        {locais.length === 0 ? (
          <p className="aviso aviso-info" style={{ maxWidth: 560 }}>
            Nenhum local publicado ainda. Os locais publicados pela equipe aparecem aqui.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            {locais.map((l) => {
              const grupo = grupoDoLocal(l);
              return (
                <Link
                  key={l.id}
                  to={`/mapa?local=${l.id}`}
                  className="cartao-local"
                  style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', color: '#18324F', background: '#fff', borderRadius: 20, padding: 14, boxShadow: '0 6px 20px rgba(26,95,180,.10)' }}
                >
                  {l.logo_path ? (
                    <img src={urlImagem(l.logo_path)} alt="" style={{ width: 56, height: 56, borderRadius: '50%', flex: 'none', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ width: 56, height: 56, borderRadius: '50%', flex: 'none', background: '#1A5FB4', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20 }}>
                      {inicial(l.nome)}
                    </span>
                  )}
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                    <span style={{ fontWeight: 800, fontSize: 16 }}>{l.nome}</span>
                    <span style={{ fontSize: 13, color: '#4A6380' }}>{nomeCategoria(l) || (grupo ? grupo.rotulo : '')}</span>
                    {l.eh_demonstracao ? <span className="etiqueta-demo">Demonstração</span> : null}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section style={{ maxWidth: 1240, margin: '0 auto', padding: '40px 20px 8px', display: 'flex', flexWrap: 'wrap', gap: 20 }}>
        <div id="eventos" className="cartao" style={{ flex: '1 1 360px', minWidth: 0, padding: 24, boxShadow: '0 6px 20px rgba(26,95,180,.08)' }}>
          <h2 className="titulo-pacifico" style={{ marginBottom: 10, fontSize: 30 }}>Eventos</h2>
          <p style={{ margin: 0, color: '#4A6380', lineHeight: 1.5, border: '2px dashed #CFE0F5', borderRadius: 16, padding: 18 }}>
            Nenhum evento publicado ainda. Os eventos cadastrados no painel aparecem aqui.
          </p>
        </div>
        <div id="noticias" className="cartao" style={{ flex: '1 1 360px', minWidth: 0, padding: 24, boxShadow: '0 6px 20px rgba(26,95,180,.08)' }}>
          <h2 className="titulo-pacifico" style={{ marginBottom: 10, fontSize: 30 }}>Notícias</h2>
          <p style={{ margin: 0, color: '#4A6380', lineHeight: 1.5, border: '2px dashed #CFE0F5', borderRadius: 16, padding: 18 }}>
            Nenhuma notícia publicada ainda. As notícias cadastradas no painel aparecem aqui.
          </p>
        </div>
      </section>
    </>
  );
}
