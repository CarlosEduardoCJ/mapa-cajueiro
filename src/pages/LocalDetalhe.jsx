// Página própria de um local (endereço: /pt/locais/nome-do-local). Mesmo conteúdo da janela do mapa.
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import FichaLocal from '../components/FichaLocal.jsx';
import { useIdioma } from '../i18n/IdiomaContext.jsx';
import { carregarFichaLocal } from '../lib/locais.js';
import { useTitulo } from '../lib/seo.js';

export default function LocalDetalhe() {
  const { slug } = useParams();
  const { lang, t, caminho } = useIdioma();
  const [detalhe, setDetalhe] = useState(null);
  const [carregado, setCarregado] = useState(false);
  useTitulo(detalhe ? `${detalhe.local.nome} — Mapa Cajueiro` : `${t.fichaLocal} — Mapa Cajueiro`);

  useEffect(() => {
    setCarregado(false);
    carregarFichaLocal({ slug }, lang).then((ficha) => {
      setDetalhe(ficha);
      setCarregado(true);
    });
  }, [slug, lang]);

  if (!carregado) return <p style={{ padding: 48, textAlign: 'center', color: '#4A6380' }}>{t.carregando}</p>;
  if (!detalhe) {
    return (
      <section style={{ maxWidth: 640, margin: '0 auto', padding: '64px 20px', textAlign: 'center' }}>
        <p style={{ color: '#4A6380' }}>{t.naoEncontradoItem}</p>
        <a href={caminho('/mapa')} className="btn btn-azul">{t.navMapa}</a>
      </section>
    );
  }

  return (
    <section style={{ maxWidth: 760, margin: '0 auto', padding: '32px 20px 8px' }}>
      <div className="cartao" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FichaLocal detalhe={detalhe} mostrarVerNoMapa />
      </div>
    </section>
  );
}
