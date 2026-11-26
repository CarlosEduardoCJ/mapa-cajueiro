// Início do painel: números, lista "Precisa de atenção" (locais com pendências) e atalhos.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../lib/AuthContext.jsx';
import { indicesDeLocais, pendenciasDoLocal } from '../../lib/pendencias.js';
import { mensagemAmigavel } from '../../lib/erros.js';

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
  const [atencao, setAtencao] = useState(null); // locais com pendências
  const [erro, setErro] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [publicados, rascunhos, inativos, demo, eventos, noticias] = await Promise.all([
          contar('locais', (c) => c.eq('status', 'publicado')),
          contar('locais', (c) => c.eq('status', 'rascunho')),
          contar('locais', (c) => c.eq('status', 'inativo')),
          contar('locais', (c) => c.eq('eh_demonstracao', true)),
          contar('eventos', (c) => c.eq('status', 'publicado')),
          contar('noticias', (c) => c.eq('status', 'publicado')),
        ]);
        setNumeros({ publicados, rascunhos, inativos, demo, eventos, noticias });

        // Lista de atenção: locais com algum aviso (sem WhatsApp, sem coordenadas, sem fotos, fora do mapa, demonstração)
        const [{ data: locais }, { data: fotos }, { data: marcadores }] = await Promise.all([
          supabase.from('locais').select('id, nome, status, whatsapp, latitude, longitude, eh_demonstracao'),
          supabase.from('fotos').select('local_id'),
          supabase.from('marcadores').select('local_id, ativo'),
        ]);
        const { comFoto, noMapa } = indicesDeLocais(fotos, marcadores);
        const lista = (locais || [])
          .filter((l) => l.status !== 'inativo')
          .map((l) => ({
            ...l,
            avisos: [
              ...pendenciasDoLocal(l, { temFoto: comFoto.has(l.id), noMapa: noMapa.has(l.id) }),
              ...(l.eh_demonstracao ? ['demonstração'] : []),
            ],
          }))
          .filter((l) => l.avisos.length > 0);
        setAtencao(lista);
      } catch (e) {
        setErro(mensagemAmigavel(e, 'carregar o início'));
      }
    })();
  }, []);

  const cartoes = numeros
    ? [
        { rotulo: 'publicados no site', valor: numeros.publicados, cor: '#25A244' },
        { rotulo: 'rascunhos (ainda não aparecem)', valor: numeros.rascunhos, cor: '#B7791F' },
        { rotulo: 'inativos', valor: numeros.inativos, cor: '#6B7785' },
        { rotulo: 'dados de demonstração', valor: numeros.demo, cor: '#7A4FB8' },
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

      <h2 className="admin-subtitulo">Ações rápidas</h2>
      <div className="admin-atalhos">
        {podeUsar('locais') ? (
          <Link to="/admin/locais/novo" className="admin-atalho">
            <strong>+ Cadastrar local</strong>
            <span>Um novo restaurante, loja, pousada ou ponto turístico</span>
          </Link>
        ) : null}
        {podeUsar('mapa') ? (
          <Link to="/admin/mapa" className="admin-atalho">
            <strong>Mapa</strong>
            <span>Colocar os locais no mapa da cidade</span>
          </Link>
        ) : null}
        {podeUsar('eventos') ? (
          <Link to="/admin/eventos/novo" className="admin-atalho">
            <strong>+ Evento</strong>
            <span>Divulgar uma festa ou evento</span>
          </Link>
        ) : null}
        {podeUsar('noticias') ? (
          <Link to="/admin/noticias/novo" className="admin-atalho">
            <strong>+ Notícia</strong>
            <span>Publicar uma novidade</span>
          </Link>
        ) : null}
      </div>

      <h2 className="admin-subtitulo">Precisa de atenção</h2>
      {atencao === null && !erro ? <p style={{ color: '#4A6380' }}>Verificando os locais…</p> : null}
      {atencao && atencao.length === 0 ? (
        <p className="aviso aviso-ok">Tudo em ordem! Nenhum local com pendência.</p>
      ) : null}
      {atencao && atencao.length > 0 ? (
        <div className="admin-lista-atencao">
          {atencao.slice(0, 12).map((l) => (
            <Link key={l.id} to={`/admin/locais/${l.id}`} className="admin-item-atencao">
              <span className="admin-item-nome">{l.nome}</span>
              <span className="admin-item-avisos">
                {l.avisos.map((a) => (
                  <span key={a} className="etiqueta-status etiqueta-rascunho">{a}</span>
                ))}
              </span>
              <span className="admin-item-seta" aria-hidden="true">Editar ›</span>
            </Link>
          ))}
          {atencao.length > 12 ? (
            <Link to="/admin/locais" className="btn btn-contorno" style={{ alignSelf: 'flex-start' }}>
              Ver todos os {atencao.length} locais com pendência
            </Link>
          ) : null}
        </div>
      ) : null}

      <h2 className="admin-subtitulo">Números</h2>
      <div className="grade-numeros">
        {!numeros && !erro ? <p style={{ color: '#4A6380' }}>Carregando números…</p> : null}
        {cartoes.map((c) => (
          <div key={c.rotulo} className="cartao numero-cartao" style={{ borderLeft: `6px solid ${c.cor}` }}>
            <strong style={{ fontSize: 30, color: c.cor }}>{c.valor}</strong>
            <span style={{ color: '#4A6380', fontSize: 14 }}>{c.rotulo}</span>
          </div>
        ))}
      </div>
    </>
  );
}
