// Início do painel: números reais do banco e atalhos para as ações mais comuns.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../lib/AuthContext.jsx';

// Conta linhas de uma tabela, com filtro opcional (usa "count" do banco, sem trazer os dados)
async function contar(tabela, filtro = null) {
  let consulta = supabase.from(tabela).select('*', { count: 'exact', head: true });
  if (filtro) consulta = filtro(consulta);
  const { count, error } = await consulta;
  if (error) throw error;
  return count || 0;
}

export default function Dashboard() {
  const { perfil, podeUsar } = useAuth();
  const [numeros, setNumeros] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [publicados, rascunhos, inativos, demo, marcadores, eventos, noticias] = await Promise.all([
          contar('locais', (c) => c.eq('status', 'publicado')),
          contar('locais', (c) => c.eq('status', 'rascunho')),
          contar('locais', (c) => c.eq('status', 'inativo')),
          contar('locais', (c) => c.eq('eh_demonstracao', true)),
          contar('marcadores', (c) => c.eq('ativo', true)),
          contar('eventos', (c) => c.eq('status', 'publicado')),
          contar('noticias', (c) => c.eq('status', 'publicado')),
        ]);
        setNumeros({ publicados, rascunhos, inativos, demo, marcadores, eventos, noticias });
      } catch (e) {
        setErro('Não foi possível carregar os números agora. Atualize a página em instantes.');
      }
    })();
  }, []);

  const cartoes = numeros
    ? [
        { rotulo: 'locais publicados', valor: numeros.publicados, cor: '#25A244' },
        { rotulo: 'rascunhos (ainda não aparecem)', valor: numeros.rascunhos, cor: '#B7791F' },
        { rotulo: 'inativos', valor: numeros.inativos, cor: '#6B7785' },
        { rotulo: 'dados de demonstração', valor: numeros.demo, cor: '#7A4FB8' },
        { rotulo: 'marcadores no mapa', valor: numeros.marcadores, cor: '#1A5FB4' },
        { rotulo: 'eventos publicados', valor: numeros.eventos, cor: '#1A5FB4' },
        { rotulo: 'notícias publicadas', valor: numeros.noticias, cor: '#1A5FB4' },
      ]
    : [];

  return (
    <>
      <h1 className="titulo-pacifico" style={{ fontSize: 34 }}>
        Olá{perfil?.nome ? `, ${perfil.nome.split(' ')[0]}` : ''}!
      </h1>

      {erro ? <div className="aviso aviso-erro">{erro}</div> : null}

      <div className="grade-numeros">
        {!numeros && !erro ? <p style={{ color: '#4A6380' }}>Carregando números…</p> : null}
        {cartoes.map((c) => (
          <div key={c.rotulo} className="cartao numero-cartao" style={{ borderLeft: `6px solid ${c.cor}` }}>
            <strong style={{ fontSize: 30, color: c.cor }}>{c.valor}</strong>
            <span style={{ color: '#4A6380', fontSize: 14 }}>{c.rotulo}</span>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 18, margin: '8px 0 0' }}>O que você quer fazer?</h2>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {podeUsar('locais') ? (
          <>
            <Link to="/admin/locais/novo" className="btn btn-azul">Cadastrar novo local</Link>
            <Link to="/admin/locais" className="btn btn-contorno">Ver todos os locais</Link>
          </>
        ) : null}
        {podeUsar('mapa') ? <Link to="/admin/mapa" className="btn btn-contorno">Posicionar no mapa</Link> : null}
        {podeUsar('eventos') ? <Link to="/admin/eventos/novo" className="btn btn-contorno">Novo evento</Link> : null}
        {podeUsar('noticias') ? <Link to="/admin/noticias/novo" className="btn btn-contorno">Nova notícia</Link> : null}
      </div>
    </>
  );
}
