// Página mostrada quando o endereço não existe.
import { Link } from 'react-router-dom';

export default function NaoEncontrado() {
  return (
    <section style={{ maxWidth: 640, margin: '0 auto', padding: '64px 20px', textAlign: 'center' }}>
      <h1 className="titulo-pacifico" style={{ fontSize: 40 }}>Página não encontrada</h1>
      <p style={{ color: '#4A6380' }}>O endereço que você abriu não existe.</p>
      <Link to="/" className="btn btn-azul">Voltar ao início</Link>
    </section>
  );
}
