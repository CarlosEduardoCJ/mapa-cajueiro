// Contato: o único canal oficial de atendimento é o WhatsApp (sem formulário).
import { useOutletContext } from 'react-router-dom';
import { IconeWhatsApp } from '../components/Icones.jsx';
import { linkWhatsApp } from '../lib/utils.js';

export default function Contato() {
  const { numeroSuporte } = useOutletContext() || {};
  const linkGeral = linkWhatsApp(numeroSuporte, 'Olá! Vim pelo site Mapa Cajueiro e preciso de ajuda.');
  const linkComerciante = linkWhatsApp(
    numeroSuporte,
    'Olá! Tenho um estabelecimento em Cajueiro da Praia e quero aparecer no Mapa Cajueiro.',
  );

  return (
    <section style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 20px 8px' }}>
      <h1 className="titulo-pacifico" style={{ fontSize: 42 }}>Fale com a gente</h1>
      <p style={{ margin: '6px 0 24px', color: '#4A6380', fontSize: 17 }}>
        O único canal oficial de atendimento é o WhatsApp.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
        <div className="cartao" style={{ flex: '1 1 380px', minWidth: 0, padding: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span style={{ width: 60, height: 60, borderRadius: '50%', background: '#E6F6EA', color: '#1A7A35', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconeWhatsApp size={30} />
          </span>
          {numeroSuporte ? (
            <>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 22 }}>+{numeroSuporte}</p>
              <a href={linkGeral} target="_blank" rel="noopener" className="btn btn-verde" style={{ minHeight: 54, fontSize: 17 }}>
                Abrir WhatsApp
              </a>
            </>
          ) : (
            <p className="aviso aviso-info">O número de atendimento ainda não está disponível.</p>
          )}
        </div>

        <div style={{ flex: '1 1 380px', minWidth: 0, background: '#FFF8DF', borderRadius: 24, padding: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 className="titulo-pacifico" style={{ fontSize: 28 }}>É comerciante?</h2>
          <p style={{ margin: 0, lineHeight: 1.55, color: '#3A4E66' }}>
            Peça a inclusão do seu estabelecimento ou a atualização dos dados pelo WhatsApp. A equipe faz a alteração pelo painel.
          </p>
          {linkComerciante ? (
            <a href={linkComerciante} target="_blank" rel="noopener" className="btn btn-azul" style={{ alignSelf: 'flex-start' }}>
              Pedir inclusão ou atualização
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
