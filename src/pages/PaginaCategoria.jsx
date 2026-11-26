// Página de categoria (hospedagem, gastronomia, turismo): lista os locais publicados daquele grupo.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useIdioma } from '../i18n/IdiomaContext.jsx';
import { grupoDoLocal, listarLocaisPublicados, nomeCategoria } from '../lib/locais.js';
import { urlImagem } from '../lib/supabase.js';
import { useTitulo } from '../lib/seo.js';
import { inicial } from '../lib/utils.js';

// Textos de cada página de categoria, por chave do grupo
const TEXTOS_PAGINA = {
  hosp: { titulo: 'hospTitulo', texto: 'hospTexto' },
  gastro: { titulo: 'gastroTitulo', texto: 'gastroTexto' },
  turismo: { titulo: 'turismoTitulo', texto: 'turismoTexto' },
};

export default function PaginaCategoria({ grupo }) {
  const { lang, t, caminho } = useIdioma();
  const [locais, setLocais] = useState(null);
  const chaves = TEXTOS_PAGINA[grupo];
  useTitulo(`${t[chaves.titulo]} — Mapa Cajueiro`);

  useEffect(() => {
    listarLocaisPublicados().then((lista) => {
      setLocais(lista.filter((l) => grupoDoLocal(l)?.chave === grupo));
    });
  }, [grupo]);

  return (
    <section style={{ maxWidth: 1240, margin: '0 auto', padding: '36px 20px 8px' }}>
      <h1 className="titulo-pacifico" style={{ fontSize: 40 }}>{t[chaves.titulo]}</h1>
      <p style={{ margin: '4px 0 22px', color: '#4A6380', fontSize: 16 }}>{t[chaves.texto]}</p>

      {locais === null ? <p style={{ color: '#4A6380' }}>{t.carregando}</p> : null}
      {locais && locais.length === 0 ? <p className="aviso aviso-info">{t.nenhumNaCategoria}</p> : null}

      {locais && locais.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {locais.map((l) => (
            <div key={l.id} className="cartao" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 18 }}>
              <Link to={caminho(`/locais/${l.slug}`)} style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', color: '#18324F' }}>
                {l.logo_path ? (
                  <img src={urlImagem(l.logo_path)} alt="" style={{ width: 60, height: 60, borderRadius: '50%', flex: 'none', objectFit: 'cover' }} />
                ) : (
                  <span style={{ width: 60, height: 60, borderRadius: '50%', flex: 'none', background: '#1A5FB4', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 22 }}>
                    {inicial(l.nome)}
                  </span>
                )}
                <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                  <strong style={{ fontSize: 17 }}>{l.nome}</strong>
                  <span style={{ fontSize: 13, color: '#4A6380' }}>{nomeCategoria(l, lang)}</span>
                  {l.eh_demonstracao ? <span className="etiqueta-demo">{t.demonstracao}</span> : null}
                </span>
              </Link>
              <Link to={caminho(`/mapa?local=${l.id}`)} className="btn btn-contorno" style={{ minHeight: 40, alignSelf: 'flex-start' }}>
                {t.verNoMapa}
              </Link>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
