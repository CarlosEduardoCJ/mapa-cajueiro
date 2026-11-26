// Página inicial: topo com o desenho do pôr do sol, e a lista de locais publicados.
import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import HeroFundo from '../components/HeroFundo.jsx';
import { IconeSeta, IconeWhatsApp } from '../components/Icones.jsx';
import { supabase, urlImagem } from '../lib/supabase.js';
import { nomeCategoria } from '../lib/locais.js';
import { inicial, linkWhatsApp } from '../lib/utils.js';

export default function Inicio() {
  const { numeroSuporte } = useOutletContext() || {};
  const [locais, setLocais] = useState([]);
  const [mapaPublicado, setMapaPublicado] = useState(null);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from('locais')
      .select('id, nome, logo_path, eh_demonstracao, categorias ( categorias_traducoes ( nome, idioma ) )')
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

      <section style={{ maxWidth: 1240, margin: '0 auto', padding: '48px 20px 8px' }}>
        <h2 className="titulo-pacifico">No mapa</h2>
        <p style={{ margin: '4px 0 20px', color: '#4A6380', fontSize: 16 }}>Toque em um local para ver no mapa.</p>

        {locais.length === 0 ? (
          <p className="aviso aviso-info" style={{ maxWidth: 560 }}>
            Nenhum local publicado ainda. Os locais publicados pela equipe aparecem aqui.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            {locais.map((l) => (
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
                  <span style={{ fontSize: 13, color: '#4A6380' }}>{nomeCategoria(l)}</span>
                  {l.eh_demonstracao ? <span className="etiqueta-demo">Demonstração</span> : null}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
