// Lista de locais em cartões: logo, nome, categoria, etiquetas, avisos de pendência e ações.
// Clicar em qualquer parte do cartão abre a edição. O interruptor publica ou tira do ar.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, urlImagem } from '../../lib/supabase.js';
import { nomeCategoria, normalizarTexto } from '../../lib/locais.js';
import { indicesDeLocais, pendenciasDoLocal } from '../../lib/pendencias.js';
import { mensagemAmigavel } from '../../lib/erros.js';
import { inicial } from '../../lib/utils.js';

const ROTULO_STATUS = { rascunho: 'Rascunho', publicado: 'Publicado', inativo: 'Inativo' };

export default function Locais() {
  const [locais, setLocais] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [indices, setIndices] = useState({ comFoto: new Set(), noMapa: new Set() });
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState(null);
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [mudando, setMudando] = useState(null); // id do local cujo interruptor está sendo salvo

  async function carregar() {
    const [{ data, error }, { data: cats }, { data: fotos }, { data: marcadores }] = await Promise.all([
      supabase
        .from('locais')
        .select('id, slug, nome, tipo, status, whatsapp, latitude, longitude, logo_path, eh_demonstracao, categoria_id, categorias ( id, categorias_traducoes ( nome, idioma ) )')
        .order('criado_em', { ascending: false }),
      supabase.from('categorias').select('id, categorias_traducoes ( nome, idioma )').order('ordem'),
      supabase.from('fotos').select('local_id'),
      supabase.from('marcadores').select('local_id, ativo'),
    ]);
    if (error) setErro(mensagemAmigavel(error, 'carregar os locais'));
    setLocais(data || []);
    setCategorias(cats || []);
    setIndices(indicesDeLocais(fotos, marcadores));
  }

  useEffect(() => {
    carregar();
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

  // Liga e desliga a publicação. Tirar do ar pede confirmação.
  async function alternarPublicado(local) {
    const estaNoAr = local.status === 'publicado';
    if (estaNoAr) {
      if (!window.confirm(`"${local.nome}" vai sair do site. Deseja continuar?`)) return;
    } else if (local.latitude == null || local.longitude == null) {
      setAviso({ tipo: 'erro', texto: `Para publicar "${local.nome}", falta a localização. Clique em Editar e preencha a latitude e a longitude.` });
      return;
    }
    const novo = estaNoAr ? 'rascunho' : 'publicado';
    setMudando(local.id);
    setAviso(null);
    // Mostra a mudança na hora; se der erro, volta
    setLocais((lista) => lista.map((l) => (l.id === local.id ? { ...l, status: novo } : l)));
    const { error } = await supabase.from('locais').update({ status: novo }).eq('id', local.id);
    setMudando(null);
    if (error) {
      setLocais((lista) => lista.map((l) => (l.id === local.id ? { ...l, status: local.status } : l)));
      setAviso({ tipo: 'erro', texto: mensagemAmigavel(error, 'mudar a publicação') });
      return;
    }
    setAviso({
      tipo: 'ok',
      texto: novo === 'publicado'
        ? `Salvo! "${local.nome}" está no ar.`
        : `Salvo! "${local.nome}" saiu do ar e voltou para rascunho.`,
    });
  }

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <h1 className="titulo-pacifico" style={{ fontSize: 34 }}>Locais</h1>
          <p className="texto-apoio">Clique em um cartão para editar. Use o interruptor para publicar ou tirar do ar.</p>
        </div>
        <Link to="/admin/locais/novo" className="btn btn-azul">+ Cadastrar local</Link>
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
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} aria-label="Filtrar por situação">
          <option value="">Todas as situações</option>
          <option value="publicado">No ar (publicados)</option>
          <option value="rascunho">Rascunhos</option>
          <option value="inativo">Inativos</option>
          <option value="demo">Demonstração</option>
        </select>
      </div>

      {aviso ? <div className={`aviso ${aviso.tipo === 'erro' ? 'aviso-erro' : 'aviso-ok'}`} role="status">{aviso.texto}</div> : null}
      {erro ? <div className="aviso aviso-erro">{erro}</div> : null}
      {locais === null ? <p style={{ color: '#4A6380' }}>Carregando…</p> : null}
      {locais && locais.length === 0 ? (
        <div className="aviso aviso-info">Nenhum local cadastrado ainda. Clique em "Cadastrar local" para começar.</div>
      ) : null}
      {locais && locais.length > 0 && visiveis.length === 0 ? (
        <p className="aviso aviso-info">Nenhum local com esse filtro. Limpe a busca ou troque os filtros.</p>
      ) : null}

      <div className="grade-cartoes-locais">
        {visiveis.map((l) => {
          const noAr = l.status === 'publicado';
          const avisos = pendenciasDoLocal(l, { temFoto: indices.comFoto.has(l.id), noMapa: indices.noMapa.has(l.id) });
          const cat = nomeCategoria(l);
          return (
            <article key={l.id} className="cartao-local-admin">
              {/* O link do nome cobre o cartão inteiro (CSS "cartao-stretch"); os botões ficam por cima */}
              <div className="cartao-local-admin-topo">
                  {l.logo_path ? (
                    <img src={urlImagem(l.logo_path)} alt="" className="cartao-logo" />
                  ) : (
                    <span className="cartao-logo cartao-logo-inicial">{inicial(l.nome)}</span>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <h2 className="cartao-nome">
                      <Link to={`/admin/locais/${l.id}`} className="cartao-stretch">{l.nome}</Link>
                    </h2>
                    <p className="cartao-categoria">{cat || (l.tipo === 'ponto_turistico' ? 'Ponto turístico' : 'Estabelecimento')}</p>
                  </div>
                </div>
                <div className="cartao-etiquetas">
                  <span className={`etiqueta-status etiqueta-${l.status}`}>{ROTULO_STATUS[l.status] || l.status}</span>
                  {l.eh_demonstracao ? <span className="etiqueta-status etiqueta-demo-lista">Demonstração</span> : null}
                </div>
                {avisos.length > 0 ? (
                  <div className="cartao-avisos">
                    <span className="cartao-avisos-titulo">Falta:</span>
                    {avisos.map((a) => <span key={a} className="etiqueta-status etiqueta-rascunho">{a}</span>)}
                  </div>
                ) : (
                  <div className="cartao-avisos cartao-avisos-ok">Tudo preenchido</div>
                )}

              <div className="cartao-acoes">
                <Link to={`/admin/locais/${l.id}`} className="btn btn-contorno cartao-botao">Editar</Link>
                {noAr ? (
                  <a href={`/pt/locais/${l.slug}`} target="_blank" rel="noopener" className="btn btn-contorno cartao-botao">Ver no site</a>
                ) : (
                  <span className="btn btn-contorno cartao-botao cartao-desativado" title="Só aparece no site quando estiver publicado">Ver no site</span>
                )}
                <button
                  type="button"
                  role="switch"
                  aria-checked={noAr}
                  aria-label={noAr ? `Tirar "${l.nome}" do ar` : `Publicar "${l.nome}"`}
                  disabled={mudando === l.id}
                  onClick={() => alternarPublicado(l)}
                  className={`interruptor${noAr ? ' ligado' : ''}`}
                >
                  <span className="interruptor-bola" />
                  <span className="interruptor-rotulo">{noAr ? 'Publicado' : 'Rascunho'}</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
