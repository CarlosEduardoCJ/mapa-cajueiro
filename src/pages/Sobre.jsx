// Página Sobre: o texto é editado pela equipe no painel (tabela configuracoes, chave "sobre").
// Não há texto histórico inventado aqui.
import { useEffect, useState } from 'react';
import { useIdioma } from '../i18n/IdiomaContext.jsx';
import { supabase } from '../lib/supabase.js';
import { useTitulo } from '../lib/seo.js';

export default function Sobre() {
  const { lang, t } = useIdioma();
  const [textos, setTextos] = useState(undefined); // undefined = carregando
  useTitulo(`${t.sobreTitulo} — Mapa Cajueiro`);

  useEffect(() => {
    if (!supabase) return setTextos({});
    supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'sobre')
      .maybeSingle()
      .then(({ data }) => setTextos(data?.valor && typeof data.valor === 'object' ? data.valor : {}));
  }, []);

  if (textos === undefined) return <p style={{ padding: 48, textAlign: 'center', color: '#4A6380' }}>{t.carregando}</p>;

  // Usa o texto do idioma; se estiver vazio, mostra o português com aviso
  const texto = textos[lang] || '';
  const textoPt = textos.pt || '';
  const usarPt = !texto && lang !== 'pt';
  const exibir = texto || textoPt;

  return (
    <section style={{ maxWidth: 800, margin: '0 auto', padding: '36px 20px 8px' }}>
      <h1 className="titulo-pacifico" style={{ fontSize: 40 }}>{t.sobreTitulo}</h1>
      {usarPt ? <div className="aviso aviso-info" style={{ margin: '14px 0' }}>{t.semTraducao}</div> : null}
      {exibir ? (
        <div style={{ lineHeight: 1.75, color: '#3A4E66', whiteSpace: 'pre-line', fontSize: 17, marginTop: 14 }}>{exibir}</div>
      ) : (
        <p className="aviso aviso-info" style={{ marginTop: 14 }}>{t.sobreVazio}</p>
      )}
    </section>
  );
}
