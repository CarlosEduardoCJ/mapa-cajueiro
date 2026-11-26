// Notícias: lista (mais recentes primeiro) e página de cada notícia.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useIdioma } from '../i18n/IdiomaContext.jsx';
import { supabase, urlImagem } from '../lib/supabase.js';
import { escolherIdioma, formatarData } from '../lib/conteudo.js';
import { useTitulo } from '../lib/seo.js';

const COLUNAS = 'id, slug, publicado_em, imagem_path, noticias_traducoes ( idioma, titulo, resumo, conteudo )';

export function NoticiasLista() {
  const { lang, t, caminho } = useIdioma();
  const [noticias, setNoticias] = useState(null);
  useTitulo(`${t.noticiasTitulo} — Mapa Cajueiro`);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from('noticias')
      .select(COLUNAS)
      .eq('status', 'publicado')
      .order('publicado_em', { ascending: false })
      .then(({ data }) => setNoticias(data || []));
  }, []);

  return (
    <section style={{ maxWidth: 1000, margin: '0 auto', padding: '36px 20px 8px' }}>
      <h1 className="titulo-pacifico" style={{ fontSize: 40 }}>{t.noticiasTitulo}</h1>
      <p style={{ margin: '4px 0 22px', color: '#4A6380', fontSize: 16 }}>{t.noticiasTexto}</p>

      {noticias === null ? <p style={{ color: '#4A6380' }}>{t.carregando}</p> : null}
      {noticias && noticias.length === 0 ? <p className="aviso aviso-info">{t.nenhumaNoticia}</p> : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {(noticias || []).map((n) => {
          const { traducao } = escolherIdioma(n.noticias_traducoes, lang, 'titulo');
          return (
            <Link key={n.id} to={caminho(`/noticias/${n.slug}`)} className="cartao" style={{ display: 'flex', gap: 16, alignItems: 'center', padding: 16, textDecoration: 'none', color: '#18324F' }}>
              {n.imagem_path ? <img src={urlImagem(n.imagem_path)} alt="" style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 14, flex: 'none' }} /> : null}
              <span style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                <span style={{ fontSize: 13, color: '#4A6380' }}>{formatarData(n.publicado_em, lang, false)}</span>
                <strong style={{ fontSize: 18 }}>{traducao?.titulo || n.slug}</strong>
                {traducao?.resumo ? <span style={{ color: '#3A4E66', fontSize: 15 }}>{traducao.resumo}</span> : null}
                <span style={{ color: '#1A5FB4', fontWeight: 700, fontSize: 14 }}>{t.lerMais} →</span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function NoticiaDetalhe() {
  const { slug } = useParams();
  const { lang, t, caminho } = useIdioma();
  const [noticia, setNoticia] = useState(undefined);
  useTitulo(noticia?.titulo ? `${noticia.titulo} — Mapa Cajueiro` : `${t.noticiasTitulo} — Mapa Cajueiro`);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from('noticias')
      .select(COLUNAS)
      .eq('slug', slug)
      .eq('status', 'publicado')
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return setNoticia(null);
        const { traducao, usouPortugues } = escolherIdioma(data.noticias_traducoes, lang, 'titulo');
        setNoticia({ ...data, titulo: traducao?.titulo, resumo: traducao?.resumo, conteudo: traducao?.conteudo, usouPortugues });
      });
  }, [slug, lang]);

  if (noticia === undefined) return <p style={{ padding: 48, textAlign: 'center', color: '#4A6380' }}>{t.carregando}</p>;
  if (noticia === null) {
    return <section style={{ maxWidth: 640, margin: '0 auto', padding: '64px 20px', textAlign: 'center' }}><p>{t.naoEncontradoItem}</p><Link to={caminho('/noticias')}>{t.voltar}</Link></section>;
  }

  return (
    <article style={{ maxWidth: 760, margin: '0 auto', padding: '32px 20px 8px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Link to={caminho('/noticias')}>← {t.voltar}</Link>
      <span style={{ fontSize: 14, color: '#4A6380' }}>{formatarData(noticia.publicado_em, lang, false)}</span>
      <h1 className="titulo-pacifico" style={{ fontSize: 40 }}>{noticia.titulo}</h1>
      {noticia.usouPortugues ? <div className="aviso aviso-info">{t.semTraducao}</div> : null}
      {noticia.imagem_path ? <img src={urlImagem(noticia.imagem_path)} alt="" style={{ width: '100%', borderRadius: 20 }} /> : null}
      {noticia.resumo ? <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1A3E6E' }}>{noticia.resumo}</p> : null}
      {noticia.conteudo ? <div style={{ lineHeight: 1.7, color: '#3A4E66', whiteSpace: 'pre-line' }}>{noticia.conteudo}</div> : null}
    </article>
  );
}
