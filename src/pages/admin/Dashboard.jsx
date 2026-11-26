// Início do painel: resumo rápido dos locais.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';

export default function Dashboard() {
  const [contagem, setContagem] = useState({ publicados: 0, rascunhos: 0, total: 0 });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('locais').select('status');
      const lista = data || [];
      setContagem({
        total: lista.length,
        publicados: lista.filter((l) => l.status === 'publicado').length,
        rascunhos: lista.filter((l) => l.status === 'rascunho').length,
      });
    })();
  }, []);

  return (
    <>
      <h1 className="titulo-pacifico" style={{ fontSize: 34 }}>Início</h1>
      <div className="grade-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="cartao"><strong>{contagem.publicados}</strong><div style={{ color: '#4A6380' }}>publicados no site</div></div>
        <div className="cartao"><strong>{contagem.rascunhos}</strong><div style={{ color: '#4A6380' }}>rascunhos</div></div>
        <div className="cartao"><strong>{contagem.total}</strong><div style={{ color: '#4A6380' }}>locais no total</div></div>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link to="/admin/locais/novo" className="btn btn-azul">Cadastrar novo local</Link>
        <Link to="/admin/mapa" className="btn btn-contorno">Editar o mapa</Link>
      </div>
    </>
  );
}
