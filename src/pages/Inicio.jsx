// Página inicial: as seções aparecem na ordem e com a visibilidade definidas no painel ("Página inicial").
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import HeroFundo from '../components/HeroFundo.jsx';
import IconeCategoria from '../components/IconeCategoria.jsx';
import { IconeSeta, IconeWhatsApp } from '../components/Icones.jsx';
import { useIdioma } from '../i18n/IdiomaContext.jsx';
import { supabase, urlImagem } from '../lib/supabase.js';
import { grupoDoLocal, nomeCategoria } from '../lib/locais.js';
import { escolherIdioma, formatarData } from '../lib/conteudo.js';
import { useTitulo } from '../lib/seo.js';
import { inicial, linkWhatsApp } from '../lib/utils.js';

// Botões de categoria da faixa: hospedagem, gastronomia e turismo têm página própria
const CATEGORIAS_TOPO = ['hosp', 'gastro', 'comercio', 'saude', 'turismo'];
const DESTINO_CATEGORIA = {
  hosp: '/hospedagem',
  gastro: '/gastronomia',
  turismo: '/turismo',
  comercio: '/mapa?grupo=comercio',
  saude: '/mapa?grupo=saude',
};

// Ordem padrão, caso o banco não tenha a lista de seções
const SECOES_PADRAO = [
  { chave: 'banner', ordem: 1, visivel: true },
  { chave: 'categorias', ordem: 2, visivel: true },
  { chave: 'mapa', ordem: 3, visivel: true },
  { chave: 'destaques', ordem: 4, visivel: true },
  { chave: 'pontos_turisticos', ordem: 5, visivel: true },
  { chave: 'hospedagem', ordem: 6, visivel: true },
  { chave: 'gastronomia', ordem: 7, visivel: true },
  { chave: 'eventos', ordem: 8, visivel: true },
  { chave: 'noticias', ordem: 9, visivel: true },
  { chave: 'contato', ordem: 10, visivel: true },
];

export default function Inicio() {
  const { lang, t, caminho, numeroSuporte } = useIdioma();
  const [dados, setDados] = useState(null); // { locais, banner, secoes, eventos, noticias, mapa }
  useTitulo(`Mapa Cajueiro — ${t.navInicio}`);

  useEffect(() => {
    if (!supabase) return setDados({ locais: [], secoes: SECOES_PADRAO });
    (async () => {
      const [locais, banners, secoes, mapa, eventos, noticias] = await Promise.all([
        supabase
          .from('locais')
          .select('id, slug, nome, tipo, logo_path, destaque, eh_demonstracao, categorias ( slug, categorias_traducoes ( nome, idioma ) )')
          .eq('status', 'publicado')
          .order('nome'),
        supabase
          .from('banners')
          .select('id, imagem_path, link, banners_traducoes ( idioma, titulo, subtitulo, texto_botao )')
          .eq('ativo', true)
          .order('ordem')
          .limit(1),
        supabase.from('secoes_inicio').select('chave, ordem, visivel').order('ordem'),
        supabase.from('mapas').select('imagem_path').eq('ativo', true).maybeSingle(),
        supabase
          .from('eventos')
          .select('id, slug, inicio, fim, eventos_traducoes ( idioma, titulo )')
          .eq('status', 'publicado')
          .order('inicio', { ascending: true })
          .limit(12),
        supabase
          .from('noticias')
          .select('id, slug, publicado_em, noticias_traducoes ( idioma, titulo, resumo )')
          .eq('status', 'publicado')
          .order('publicado_em', { ascending: false })
          .limit(3),
      ]);
      const agora = new Date();
      const proximos = (eventos.data || []).filter((e) => new Date(e.fim || e.inicio) >= agora).slice(0, 3);
      setDados({
        locais: locais.data || [],
        banner: banners.data?.[0] || null,
        secoes: secoes.data?.length ? secoes.data : SECOES_PADRAO,
        mapa: mapa.data,
        eventos: proximos,
        noticias: noticias.data || [],
      });
    })();
  }, []);

  if (!dados) return <p style={{ padding: 48, textAlign: 'center', color: '#4A6380' }}>{t.carregando}</p>;

  const visivel = (chave) => dados.secoes.find((s) => s.chave === chave)?.visivel !== false;
  const linkWa = linkWhatsApp(numeroSuporte, t.msgSuporte);

  // Cada seção vira um bloco; a ordem vem do painel
  const blocos = {
    categorias: <SecaoCategorias key="categorias" />,
    mapa: <SecaoLocais key="mapa" titulo={t.noMapa} texto={t.toqueLocal} locais={dados.locais} />,
    destaques: <SecaoLocais key="destaques" titulo={t.destaquesTitulo} texto={t.destaquesTexto} locais={dados.locais.filter((l) => l.destaque)} />,
    pontos_turisticos: <SecaoLocais key="pontos_turisticos" titulo={t.turismoTitulo} texto={t.turismoTexto} locais={dados.locais.filter((l) => grupoDoLocal(l)?.chave === 'turismo')} verMais="/turismo" />,
    hospedagem: <SecaoLocais key="hospedagem" titulo={t.hospTitulo} texto={t.hospTexto} locais={dados.locais.filter((l) => grupoDoLocal(l)?.chave === 'hosp')} verMais="/hospedagem" />,
    gastronomia: <SecaoLocais key="gastronomia" titulo={t.gastroTitulo} texto={t.gastroTexto} locais={dados.locais.filter((l) => grupoDoLocal(l)?.chave === 'gastro')} verMais="/gastronomia" />,
    eventos: <SecaoEventos key="eventos" eventos={dados.eventos} />,
    noticias: <SecaoNoticias key="noticias" noticias={dados.noticias} />,
    contato: <SecaoContato key="contato" linkWa={linkWa} />,
  };

  return (
    <>
      {visivel('banner') ? <Topo banner={dados.banner} mapaImagem={dados.mapa?.imagem_path} linkWa={linkWa} /> : null}
      {dados.secoes
        .filter((s) => s.chave !== 'banner' && s.visivel !== false)
        .sort((a, b) => a.ordem - b.ordem)
        .map((s) => blocos[s.chave] || null)}
    </>
  );
}

// Topo com a imagem do banner (ou o desenho do pôr do sol) e os botões principais
function Topo({ banner, mapaImagem, linkWa }) {
  const { lang, t, caminho } = useIdioma();
  const { traducao } = escolherIdioma(banner?.banners_traducoes, lang, 'titulo');
  const fotoBanner = banner?.imagem_path ? urlImagem(banner.imagem_path) : '';
  const imagemMapa = mapaImagem ? urlImagem(mapaImagem) : '/demo/mapa.jpg';

  return (
    <section className="hero">
      {fotoBanner ? (
        <img src={fotoBanner} alt="" className="hero-fundo" style={{ objectFit: 'cover' }} />
      ) : (
        <HeroFundo />
      )}
      <div className="hero-interno">
        <div className="hero-texto">
          <p className="hero-descubra">{t.heroDescubra}</p>
          <h1 className="hero-titulo">Cajueiro da Praia</h1>
          <p className="hero-frase">{traducao?.subtitulo || t.heroFrase}</p>
          <div className="hero-botoes">
            <Link to={caminho('/mapa')} className="btn btn-amarelo" style={{ minHeight: 64, padding: '0 34px', fontSize: 20, boxShadow: '0 8px 20px rgba(0,0,0,.25)' }}>
              {traducao?.texto_botao || t.explorarMapa} <IconeSeta />
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
                {t.falarWhatsApp}
              </a>
            ) : null}
          </div>
        </div>

        <div className="hero-mapa">
          <Link to={caminho('/mapa')} aria-label={t.explorarMapa}>
            <img src={imagemMapa} alt="" style={{ width: '100%', height: 'auto' }} loading="eager" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// Faixa de categorias, levemente sobreposta ao topo
function SecaoCategorias() {
  const { t, caminho } = useIdioma();
  return (
    <section style={{ maxWidth: 1240, margin: '-28px auto 0', padding: '0 20px', position: 'relative' }}>
      <div className="cartao" style={{ padding: '18px 12px' }}>
        <h2 style={{ margin: '0 0 6px', textAlign: 'center', fontSize: 15, fontWeight: 800, color: '#4A6380', letterSpacing: '.04em', textTransform: 'uppercase' }}>
          {t.oQueProcura}
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 4 }}>
          {CATEGORIAS_TOPO.map((chave) => (
            <Link key={chave} to={caminho(DESTINO_CATEGORIA[chave])} className="catb">
              <span className="catb-icone"><IconeCategoria tipo={chave} /></span>
              {t.grupos[chave]}
            </Link>
          ))}
          <Link to={caminho('/eventos')} className="catb">
            <span className="catb-icone"><IconeCategoria tipo="eventos" /></span>
            {t.eventos}
          </Link>
          <Link to={caminho('/noticias')} className="catb">
            <span className="catb-icone"><IconeCategoria tipo="noticias" /></span>
            {t.noticias}
          </Link>
        </div>
      </div>
    </section>
  );
}

// Bloco com cartões de locais (usado para mapa, destaques, turismo, hospedagem e gastronomia)
function SecaoLocais({ titulo, texto, locais, verMais }) {
  const { lang, t, caminho } = useIdioma();
  return (
    <section style={{ maxWidth: 1240, margin: '0 auto', padding: '44px 20px 8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 className="titulo-pacifico">{titulo}</h2>
          <p style={{ margin: '4px 0 18px', color: '#4A6380', fontSize: 16 }}>{texto}</p>
        </div>
        {verMais ? <Link to={caminho(verMais)} className="btn btn-contorno" style={{ minHeight: 40 }}>{t.verTodos}</Link> : null}
      </div>

      {locais.length === 0 ? (
        <p className="aviso aviso-info" style={{ maxWidth: 560 }}>{t.nenhumPublicado}</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {locais.map((l) => (
            <Link
              key={l.id}
              to={caminho(`/locais/${l.slug}`)}
              className="cartao-local"
              style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', color: '#18324F', background: '#fff', borderRadius: 20, padding: 14, boxShadow: '0 6px 20px rgba(26,95,180,.10)' }}
            >
              {l.logo_path ? (
                <img src={urlImagem(l.logo_path)} alt="" loading="lazy" style={{ width: 56, height: 56, borderRadius: '50%', flex: 'none', objectFit: 'cover' }} />
              ) : (
                <span style={{ width: 56, height: 56, borderRadius: '50%', flex: 'none', background: '#1A5FB4', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20 }}>
                  {inicial(l.nome)}
                </span>
              )}
              <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                <span style={{ fontWeight: 800, fontSize: 16 }}>{l.nome}</span>
                <span style={{ fontSize: 13, color: '#4A6380' }}>{nomeCategoria(l, lang)}</span>
                {l.eh_demonstracao ? <span className="etiqueta-demo">{t.demonstracao}</span> : null}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function SecaoEventos({ eventos }) {
  const { lang, t, caminho } = useIdioma();
  return (
    <section style={{ maxWidth: 1240, margin: '0 auto', padding: '40px 20px 8px' }} id="eventos">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <h2 className="titulo-pacifico">{t.eventos}</h2>
        <Link to={caminho('/eventos')} className="btn btn-contorno" style={{ minHeight: 40 }}>{t.verTodos}</Link>
      </div>
      {eventos.length === 0 ? (
        <p className="aviso aviso-info">{t.nenhumEvento}</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {eventos.map((e) => {
            const { traducao } = escolherIdioma(e.eventos_traducoes, lang, 'titulo');
            return (
              <Link key={e.id} to={caminho(`/eventos/${e.slug}`)} className="cartao" style={{ padding: 16, textDecoration: 'none', color: '#18324F', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 13, color: '#4A6380' }}>{formatarData(e.inicio, lang)}</span>
                <strong>{traducao?.titulo || e.slug}</strong>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SecaoNoticias({ noticias }) {
  const { lang, t, caminho } = useIdioma();
  return (
    <section style={{ maxWidth: 1240, margin: '0 auto', padding: '40px 20px 8px' }} id="noticias">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <h2 className="titulo-pacifico">{t.noticias}</h2>
        <Link to={caminho('/noticias')} className="btn btn-contorno" style={{ minHeight: 40 }}>{t.verTodos}</Link>
      </div>
      {noticias.length === 0 ? (
        <p className="aviso aviso-info">{t.nenhumaNoticia}</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {noticias.map((n) => {
            const { traducao } = escolherIdioma(n.noticias_traducoes, lang, 'titulo');
            return (
              <Link key={n.id} to={caminho(`/noticias/${n.slug}`)} className="cartao" style={{ padding: 16, textDecoration: 'none', color: '#18324F', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 13, color: '#4A6380' }}>{formatarData(n.publicado_em, lang, false)}</span>
                <strong>{traducao?.titulo || n.slug}</strong>
                {traducao?.resumo ? <span style={{ fontSize: 14, color: '#3A4E66' }}>{traducao.resumo}</span> : null}
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SecaoContato({ linkWa }) {
  const { t, caminho } = useIdioma();
  return (
    <section style={{ maxWidth: 1240, margin: '40px auto 0', padding: '0 20px' }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: 24, boxShadow: '0 6px 20px rgba(26,95,180,.08)', display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 className="titulo-pacifico" style={{ fontSize: 30 }}>{t.contatoTitulo}</h2>
          <p style={{ margin: '4px 0 0', color: '#4A6380' }}>{t.contatoSub}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {linkWa ? (
            <a href={linkWa} target="_blank" rel="noopener" className="btn btn-verde">
              <IconeWhatsApp size={20} /> {t.abrirWhatsApp}
            </a>
          ) : null}
          <Link to={caminho('/contato')} className="btn btn-contorno">{t.navContato}</Link>
        </div>
      </div>
    </section>
  );
}
