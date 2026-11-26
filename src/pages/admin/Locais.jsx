// Lista de locais no painel: busca, filtros por categoria e status, etiquetas coloridas e "Ver no site".
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';
import { nomeCategoria, normalizarTexto } from '../../lib/locais.js';
import { mensagemAmigavel } from '../../lib/erros.js';

const ROTULO_STATUS = { rascunho: 'Rascunho', publicado: 'Publicado', inativo: 'Inativo' };

export default function Locais() {
  const [locais, setLocais] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');

  useEffect(() => {
    (async () => {
      const [{ data, error }, { data: cats }] = await Promise.all([
        supabase
          .from('locais')
          .select('id, slug, nome, tipo, status, eh_demonstracao, categoria_id, categorias ( id, categorias_traducoes ( nome, idioma ) )')
          .order('criado_em', { ascending: false }),
        supabase.from('categorias').select('id, categorias_traducoes ( nome, idioma )').order('ordem'),
      ]);
      if (error) setErro(mensagemAmigavel(error, 'carregar os locais'));
      setLocais(data || []);
      setCategorias(cats || []);
    })();
  }, []);

  // Aplica busca e filtros sem ir ao banco de novo
  const visiveis = useMemo(() => {
    const termo = normalizarTexto(busca);
    return (locais || []).filter((l) => {
      if (termo && !normalizarTexto(l.nome).includes(termo)) return false;
      if (filtroCategoria && l.categoria_id !== filtroCategoria) return false;
      if (filtroStatus === 'demo') return l.eh_demonstracao;
      if (filtroStatus && l.status !== filtroStatus) return false;
      return true;
    });
  }, [locais, busca, filtroCategoria, filtroStatus]);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1 className="titulo-pacifico" style={{ fontSize: 34 }}>Locais</h1>
        <Link to="/admin/locais/novo" className="btn btn-azul">Cadastrar novo local</Link>
      </div>

      <div className="barra-filtros">
        <input
          className="campo-busca"
          placeholder="Buscar pelo nome…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          aria-label="Buscar pelo nome"
        />
        <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} aria-label="Filtrar por categoria">
          <option value="">Todas as categorias</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.categorias_traducoes.find((t) => t.idioma === 'pt')?.nome || c.id}</option>
          ))}
        </select>
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} aria-label="Filtrar por status">
          <option value="">Todos os status</option>
          <option value="publicado">Publicados</option>
          <option value="rascunho">Rascunhos</option>
          <option value="inativo">Inativos</option>
          <option value="demo">Demonstração</option>
        </select>
      </div>

      {erro ? <div className="aviso aviso-erro">{erro}</div> : null}
      {locais === null ? <p style={{ color: '#4A6380' }}>Carregando…</p> : null}
      {locais && locais.length === 0 ? <p className="aviso aviso-info">Nenhum local cadastrado ainda.</p> : null}
      {locais && locais.length > 0 && visiveis.length === 0 ? (
        <p className="aviso aviso-info">Nenhum local com esse filtro. Limpe a busca ou troque os filtros.</p>
      ) : null}

      {visiveis.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table className="tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Categoria</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((l) => (
                <tr key={l.id}>
                  <td>{l.nome}</td>
                  <td>{l.tipo === 'ponto_turistico' ? 'Ponto turístico' : 'Estabelecimento'}</td>
                  <td>{nomeCategoria(l) || '—'}</td>
                  <td>
                    <span className={`etiqueta-status etiqueta-${l.status}`}>{ROTULO_STATUS[l.status] || l.status}</span>
                    {l.eh_demonstracao ? <span className="etiqueta-status etiqueta-demo-lista">Demonstração</span> : null}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <Link to={`/admin/locais/${l.id}`}>Editar</Link>
                    {l.status === 'publicado' ? (
                      <>
                        {' · '}
                        <a href={`/pt/locais/${l.slug}`} target="_blank" rel="noopener">Ver no site</a>
                      </>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}
