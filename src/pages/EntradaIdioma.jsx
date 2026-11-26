// Tela de escolha de idioma (endereço "/"). Se o visitante já escolheu antes, vai direto para o idioma dele.
import { Navigate, useNavigate } from 'react-router-dom';
import { idiomaSalvo, salvarIdioma } from '../i18n/IdiomaContext.jsx';

const OPCOES = [
  { codigo: 'pt', rotulo: 'Português' },
  { codigo: 'en', rotulo: 'English' },
  { codigo: 'es', rotulo: 'Español' },
];

export default function EntradaIdioma() {
  const navigate = useNavigate();
  const salvo = idiomaSalvo();

  if (salvo) {
    return <Navigate to={`/${salvo}`} replace />;
  }

  function escolher(codigo) {
    salvarIdioma(codigo);
    navigate(`/${codigo}`);
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, boxSizing: 'border-box', background: '#DDEEFC' }}>
      <div style={{ width: '100%', maxWidth: 560, background: '#fff', borderRadius: 28, boxShadow: '0 20px 60px rgba(26,95,180,.18)', padding: '36px 28px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, textAlign: 'center' }}>
        <img src="/imagens/logo.png" alt="Descubra Cajueiro da Praia — Mapa Turístico" style={{ width: '100%', maxWidth: 380, height: 'auto' }} />
        <h1 style={{ margin: 0, font: '400 30px Pacifico, cursive', color: '#1A5FB4' }}>Idioma · Language · Idioma</h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
          {OPCOES.map((o) => (
            <button
              key={o.codigo}
              onClick={() => escolher(o.codigo)}
              className="opcao-idioma"
              lang={o.codigo}
            >
              <span className="opcao-idioma-sigla">{o.codigo.toUpperCase()}</span>
              {o.rotulo}
            </button>
          ))}
        </div>

        <p style={{ margin: 0, fontSize: 14, color: '#4A6380' }}>
          A escolha fica salva neste navegador · Saved in this browser · Se guarda en este navegador
        </p>
      </div>
    </div>
  );
}
