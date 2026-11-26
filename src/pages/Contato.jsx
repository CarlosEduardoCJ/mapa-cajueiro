// Contato: o único canal oficial de atendimento é o WhatsApp (sem formulário).
import { IconeWhatsApp } from '../components/Icones.jsx';
import { useIdioma } from '../i18n/IdiomaContext.jsx';
import { linkWhatsApp } from '../lib/utils.js';
import { useTitulo } from '../lib/seo.js';

export default function Contato() {
  const { t, numeroSuporte } = useIdioma();
  useTitulo(`${t.navContato} — Mapa Cajueiro`);
  const linkGeral = linkWhatsApp(numeroSuporte, t.msgSuporte);
  const linkComerciante = linkWhatsApp(numeroSuporte, t.msgComerciante);

  return (
    <section style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 20px 8px' }}>
      <h1 className="titulo-pacifico" style={{ fontSize: 42 }}>{t.contatoTitulo}</h1>
      <p style={{ margin: '6px 0 24px', color: '#4A6380', fontSize: 17 }}>{t.contatoSub}</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
        <div className="cartao" style={{ flex: '1 1 380px', minWidth: 0, padding: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span style={{ width: 60, height: 60, borderRadius: '50%', background: '#E6F6EA', color: '#1A7A35', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconeWhatsApp size={30} />
          </span>
          {numeroSuporte ? (
            <>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 22 }}>+{numeroSuporte}</p>
              <a href={linkGeral} target="_blank" rel="noopener" className="btn btn-verde" style={{ minHeight: 54, fontSize: 17 }}>
                {t.abrirWhatsApp}
              </a>
            </>
          ) : (
            <p className="aviso aviso-info">{t.numeroIndisponivel}</p>
          )}
        </div>

        <div style={{ flex: '1 1 380px', minWidth: 0, background: '#FFF8DF', borderRadius: 24, padding: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 className="titulo-pacifico" style={{ fontSize: 28 }}>{t.comercianteTitulo}</h2>
          <p style={{ margin: 0, lineHeight: 1.55, color: '#3A4E66' }}>{t.comercianteTexto}</p>
          {linkComerciante ? (
            <a href={linkComerciante} target="_blank" rel="noopener" className="btn btn-azul" style={{ alignSelf: 'flex-start' }}>
              {t.comercianteBotao}
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
