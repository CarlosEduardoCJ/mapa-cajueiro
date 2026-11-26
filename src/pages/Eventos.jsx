// Eventos: lista da agenda (próximos e passados) e página de cada evento.
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useIdioma } from '../i18n/IdiomaContext.jsx';
import { supabase, urlImagem } from '../lib/supabase.js';
import { escolherIdioma, formatarData } from '../lib/conteudo.js';
import { useTitulo } from '../lib/seo.js';
import { Link } from 'react-router-dom';

const COLUNAS = 'id, slug, inicio, fim, imagem_path, local_id, eventos_traducoes ( idioma, titulo, descricao, local_texto ), locais ( nome, slug )';

// Separa os eventos em próximos e passados pela data de fim (ou de início, se não houver fim)
function ehPassado(evento) {
  const referencia = evento.fim || evento.inicio;
  return referencia ? new Date(referencia) < new Date() : false;
}

export function EventosLista() {
  const { lang, t, caminho } = useIdioma();
  const [eventos, setEventos] = useState(null);
  useTitulo(`${t.eventosTitulo} — Mapa Cajueiro`);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from('eventos')
      .select(COLUNAS)
      .eq('status', 'publicado')
      .order('inicio', { ascending: true })
      .then(({ data }) => setEventos(data || []));
  }, []);

  const proximos = (eventos || []).filter((e) => !ehPassado(e));
  const passados = (eventos || []).filter((e) => ehPassado(e)).reverse();

  return (
    <section style={{ maxWidth: 1000, margin: '0 auto', padding: '36px 20px 8px' }}>
      <h1 className="titulo-pacifico" style={{ fontSize: 40 }}>{t.eventosTitulo}</h1>
      <p style={{ margin: '4px 0 22px', color: '#4A6380', fontSize: 16 }}>{t.eventosTexto}</p>

      {eventos === null ? <p style={{ color: '#4A6380' }}>{t.carregando}</p> : null}
      {eventos && eventos.length === 0 ? <p className="aviso aviso-info">{t.nenhumEvento}</p> : null}

      {proximos.length > 0 ? <h2 style={{ fontSize: 18 }}>{t.eventosProximos}</h2> : null}
      <ListaCartoes itens={proximos} lang={lang} t={t} caminho={caminho} rota="eventos" />

      {passados.length > 0 ? <h2 style={{ fontSize: 18, marginTop: 28 }}>{t.eventosPassados}</h2> : null}
      <ListaCartoes itens={passados} lang={lang} t={t} caminho={caminho} rota="eventos" />
    </section>
  );
}

function ListaCartoes({ itens, lang, t, caminho, rota }) {
  if (!itens.length) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 12 }}>
      {itens.map((e) => {
        const { traducao } = escolherIdioma(e.eventos_traducoes, lang, 'titulo');
        return (
          <Link key={e.id} to={caminho(`/${rota}/${e.slug}`)} className="cartao" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16, textDecoration: 'none', color: '#18324F' }}>
            {e.imagem_path ? <img src={urlImagem(e.imagem_path)} alt="" style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 14 }} /> : null}
            <strong style={{ fontSize: 17 }}>{traducao?.titulo || e.slug}</strong>
            <span style={{ fontSize: 14, color: '#4A6380' }}>{formatarData(e.inicio, lang)}</span>
          </Link>
        );
      })}
    </div>
  );
}

// Página de um evento
export function EventoDetalhe() {
  const { slug } = useParams();
  const { lang, t, caminho } = useIdioma();
  const [evento, setEvento] = useState(undefined); // undefined = carregando; null = não existe
  useTitulo(evento?.titulo ? `${evento.titulo} — Mapa Cajueiro` : `${t.eventosTitulo} — Mapa Cajueiro`);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from('eventos')
      .select(COLUNAS)
      .eq('slug', slug)
      .eq('status', 'publicado')
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return setEvento(null);
        const { traducao, usouPortugues } = escolherIdioma(data.eventos_traducoes, lang, 'titulo');
        setEvento({ ...data, titulo: traducao?.titulo, descricao: traducao?.descricao, local_texto: traducao?.local_texto, usouPortugues });
      });
  }, [slug, lang]);

  if (evento === undefined) return <p style={{ padding: 48, textAlign: 'center', color: '#4A6380' }}>{t.carregando}</p>;
  if (evento === null) {
    return <section style={{ maxWidth: 640, margin: '0 auto', padding: '64px 20px', textAlign: 'center' }}><p>{t.naoEncontradoItem}</p><Link to={caminho('/eventos')}>{t.voltar}</Link></section>;
  }

  return (
    <article style={{ maxWidth: 760, margin: '0 auto', padding: '32px 20px 8px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Link to={caminho('/eventos')}>← {t.voltar}</Link>
      <h1 className="titulo-pacifico" style={{ fontSize: 40 }}>{evento.titulo}</h1>
      {evento.usouPortugues ? <div className="aviso aviso-info">{t.semTraducao}</div> : null}
      {evento.imagem_path ? <img src={urlImagem(evento.imagem_path)} alt="" style={{ width: '100%', borderRadius: 20 }} /> : null}
      <p style={{ margin: 0, fontWeight: 700 }}>{t.quando}: {formatarData(evento.inicio, lang)}{evento.fim ? ` — ${formatarData(evento.fim, lang)}` : ''}</p>
      {evento.locais ? (
        <p style={{ margin: 0 }}>
          {t.local}: <Link to={caminho(`/locais/${evento.locais.slug}`)}>{evento.locais.nome}</Link>
        </p>
      ) : evento.local_texto ? <p style={{ margin: 0 }}>{t.local}: {evento.local_texto}</p> : null}
      {evento.descricao ? <p style={{ margin: 0, lineHeight: 1.6, color: '#3A4E66' }}>{evento.descricao}</p> : null}
    </article>
  );
}
