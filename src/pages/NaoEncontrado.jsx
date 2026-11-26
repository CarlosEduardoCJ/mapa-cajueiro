// Página mostrada quando o endereço não existe (no idioma atual, se houver).
import { Link } from 'react-router-dom';
import { useIdioma } from '../i18n/IdiomaContext.jsx';
import { TEXTOS } from '../i18n/textos.js';

export default function NaoEncontrado() {
  const contexto = useIdioma();
  const t = contexto ? contexto.t : TEXTOS.pt;
  const inicio = contexto ? contexto.caminho('/') : '/';

  return (
    <section style={{ maxWidth: 640, margin: '0 auto', padding: '64px 20px', textAlign: 'center' }}>
      <h1 className="titulo-pacifico" style={{ fontSize: 40 }}>{t.naoEncontradoTitulo}</h1>
      <p style={{ color: '#4A6380' }}>{t.naoEncontradoTexto}</p>
      <Link to={inicio} className="btn btn-azul">{t.voltarInicio}</Link>
    </section>
  );
}
