// Mapa da cidade (público): mapa ilustrado com marcadores lidos do banco.
// Clicar num marcador dá zoom, escurece o fundo e abre o modal com os dados do local.
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IconeFechar, IconeLocal, IconeSeta, IconeWhatsApp } from '../components/Icones.jsx';
import { useIdioma } from '../i18n/IdiomaContext.jsx';
import { supabase, urlImagem } from '../lib/supabase.js';
import {
  COLUNAS_LOCAL_PUBLICO,
  GRUPOS,
  escolherTraducao,
  grupoDoLocal,
  nomeCategoria,
  normalizarTexto,
} from '../lib/locais.js';
import { useTitulo } from '../lib/seo.js';
import { inicial, linkGoogleMaps, linkWaze, linkWhatsApp } from '../lib/utils.js';

const FATOR_ZOOM = 2.4; // quanto o mapa aproxima ao clicar num marcador

// Calcula o transform CSS para aproximar o mapa num ponto (x, y entre 0 e 1)
function transformParaPonto(x, y) {
  const s = FATOR_ZOOM;
  const limitar = (v) => Math.max((1 - s) * 100, Math.min(0, v));
  return `translate(${limitar((0.5 - x * s) * 100)}%, ${limitar((0.5 - y * s) * 100)}%) scale(${s})`;
}

export default function MapaCidade() {
  const { lang, t, caminho, numeroSuporte } = useIdioma();
  const [params, setParams] = useSearchParams();
  useTitulo(`${t.mapaTitulo} — Mapa Cajueiro`);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [mapa, setMapa] = useState(null);
  const [marcadores, setMarcadores] = useState([]); // { id, x, y, tamanho, local }

  const [selecionadoId, setSelecionadoId] = useState(null);
  const [zoom, setZoom] = useState(false);
  const [modal, setModal] = useState(false);
  const [detalhe, setDetalhe] = useState(null); // { local, traducao, usouPortugues, fotos }
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);

  // Filtros: grupo (ex.: hospedagem) e texto da busca
  const [grupo, setGrupo] = useState(() => params.get('grupo') || 'todos');
  const [busca, setBusca] = useState('');

  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  function depois(fn, ms) {
    timers.current.push(setTimeout(fn, ms));
  }

  // Carrega o mapa ativo e os marcadores publicados
  useEffect(() => {
    if (!supabase) {
      setErro(t.erroMapa);
      setCarregando(false);
      return;
    }
    (async () => {
      const { data: mapaAtivo, error: erroMapa } = await supabase
        .from('mapas')
        .select('id, imagem_path, largura, altura')
        .eq('ativo', true)
        .maybeSingle();
      if (erroMapa) {
        setErro(t.erroMapa);
        setCarregando(false);
        return;
      }
      setMapa(mapaAtivo);
      if (mapaAtivo) {
        const { data: marc } = await supabase
          .from('marcadores')
          .select(`id, x, y, tamanho, locais ( ${COLUNAS_LOCAL_PUBLICO}, status )`)
          .eq('mapa_id', mapaAtivo.id)
          .eq('ativo', true);
        // Só mostra locais publicados (o banco também garante isso)
        const publicados = (marc || []).filter((m) => m.locais && m.locais.status === 'publicado');
        setMarcadores(
          publicados.map((m) => ({ id: m.id, x: Number(m.x), y: Number(m.y), tamanho: Number(m.tamanho) || 0.05, local: m.locais })),
        );
      }
      setCarregando(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Se a página abriu com ?local=ID, já mostra esse local
  useEffect(() => {
    const idUrl = params.get('local');
    if (idUrl && marcadores.some((m) => m.local.id === idUrl)) {
      escolher(idUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marcadores]);

  // Diz se um local passa pelos filtros de grupo e de busca
  const termo = normalizarTexto(busca);
  function passaFiltro(local) {
    const dentroDoGrupo = grupo === 'todos' || grupoDoLocal(local)?.chave === grupo;
    const textoDoLocal = normalizarTexto(`${local.nome} ${nomeCategoria(local, lang)}`);
    return dentroDoGrupo && (!termo || textoDoLocal.includes(termo));
  }
  const filtroAtivo = grupo !== 'todos' || termo !== '';
  const visiveis = marcadores.filter((m) => passaFiltro(m.local));

  const marcadorSelecionado = marcadores.find((m) => m.local.id === selecionadoId) || null;

  // Ao clicar: zoom primeiro, depois o modal (como no protótipo)
  async function escolher(localId) {
    setSelecionadoId(localId);
    setZoom(true);
    setModal(false);
    setParams({ local: localId }, { replace: true });
    setCarregandoDetalhe(true);
    setDetalhe(null);
    const [{ data: local }, { data: trads }, { data: fotos }] = await Promise.all([
      supabase.from('locais').select(COLUNAS_LOCAL_PUBLICO).eq('id', localId).maybeSingle(),
      supabase.from('locais_traducoes').select('idioma, descricao, servicos').eq('local_id', localId),
      supabase.from('fotos').select('path, legenda').eq('local_id', localId).order('ordem').limit(3),
    ]);
    const { traducao, usouPortugues } = escolherTraducao(trads, lang);
    const base = local || marcadores.find((m) => m.local.id === localId)?.local || null;
    setDetalhe({ local: base, traducao, usouPortugues, fotos: fotos || [] });
    setCarregandoDetalhe(false);
    depois(() => setModal(true), 700);
  }

  function fechar() {
    setModal(false);
    depois(() => {
      setZoom(false);
      setSelecionadoId(null);
      setParams({}, { replace: true });
    }, 120);
  }

  function voltarMapaInteiro() {
    setZoom(false);
    setSelecionadoId(null);
    setModal(false);
    setParams({}, { replace: true });
  }

  const mapaT = zoom && marcadorSelecionado ? transformParaPonto(marcadorSelecionado.x, marcadorSelecionado.y) : 'translate(0%, 0%) scale(1)';

  if (carregando) {
    return (
      <section style={{ maxWidth: 1320, margin: '0 auto', padding: '28px 20px 8px', textAlign: 'center' }}>
        <h1 className="titulo-pacifico" style={{ fontSize: 40 }}>{t.mapaTitulo}</h1>
        <p style={{ color: '#4A6380' }}>{t.carregandoMapa}</p>
      </section>
    );
  }
  if (erro) {
    return <div className="aviso aviso-erro" style={{ margin: 24 }}>{erro}</div>;
  }
  if (!mapa) {
    return (
      <section style={{ maxWidth: 800, margin: '0 auto', padding: '48px 20px', textAlign: 'center' }}>
        <h1 className="titulo-pacifico" style={{ fontSize: 40 }}>{t.mapaTitulo}</h1>
        <p style={{ color: '#4A6380' }}>{t.mapaNaoPublicado}</p>
      </section>
    );
  }

  const proporcao = mapa.largura && mapa.altura ? `${mapa.largura} / ${mapa.altura}` : '3 / 2';

  return (
    <section style={{ maxWidth: 1320, margin: '0 auto', padding: '28px 20px 8px' }}>
      <h1 className="titulo-pacifico" style={{ textAlign: 'center', fontSize: 40 }}>{t.mapaTitulo}</h1>
      <p style={{ margin: '2px 0 18px', textAlign: 'center', color: '#4A6380', fontSize: 16 }}>{t.mapaSub}</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 14 }}>
        <label style={{ position: 'relative', flex: '1 1 260px', display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1.5px solid #CFE0F5', borderRadius: 999, padding: '0 16px', minHeight: 44 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4A6380" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </svg>
          <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>{t.buscar}</span>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={t.buscar}
            style={{ flex: 1, border: 0, outline: 'none', font: '600 15px Nunito, sans-serif', background: 'transparent', color: '#18324F', minWidth: 0 }}
          />
        </label>
        <button className={`chip${grupo === 'todos' ? ' sel' : ''}`} onClick={() => setGrupo('todos')}>{t.todos}</button>
        {GRUPOS.map((g) => (
          <button key={g.chave} className={`chip${grupo === g.chave ? ' sel' : ''}`} onClick={() => setGrupo(g.chave)}>
            {t.grupos[g.chave]}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'flex-start' }}>
        <div className="mapa-area" style={{ flex: '999 1 600px', minWidth: 0, aspectRatio: proporcao }}>
          <div className="mapa-imagem" style={{ transform: mapaT }}>
            <img src={urlImagem(mapa.imagem_path)} alt={t.mapaTitulo} />
            {marcadores.map((m) => {
              const casa = passaFiltro(m.local);
              const pulsa = filtroAtivo && casa && m.local.id !== selecionadoId ? ' pulsa' : '';
              const fora = casa ? '' : ' fora';
              return (
                <button
                  key={m.id}
                  className={`marcador${pulsa}${fora}`}
                  tabIndex={casa ? 0 : -1}
                  onClick={() => escolher(m.local.id)}
                  aria-label={m.local.nome}
                  title={m.local.nome}
                  style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%`, width: `${m.tamanho * 100}%` }}
                >
                  {m.local.logo_path ? (
                    <img
                      src={urlImagem(m.local.logo_path)}
                      alt=""
                      style={{ width: '100%', height: '100%', borderRadius: '50%', border: '3px solid #fff', boxSizing: 'border-box', background: '#fff', objectFit: 'cover' }}
                    />
                  ) : (
                    <span className="marcador-pino">{inicial(m.local.nome)}</span>
                  )}
                </button>
              );
            })}
          </div>

          {zoom ? (
            <button
              className="btn btn-contorno"
              onClick={voltarMapaInteiro}
              style={{ position: 'absolute', left: 14, bottom: 14, background: '#fff', boxShadow: '0 4px 14px rgba(0,0,0,.18)' }}
            >
              {t.voltarMapa}
            </button>
          ) : null}
        </div>

        <aside className="cartao" style={{ flex: '1 1 280px', minWidth: 0, padding: 16 }}>
          <p style={{ margin: '0 0 8px 6px', fontWeight: 800, color: '#4A6380', fontSize: 13 }}>
            {t.locaisNoMapa(visiveis.length)}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 560, overflow: 'auto' }}>
            {marcadores.length === 0 ? <p style={{ margin: 8, color: '#4A6380' }}>{t.nenhumNoMapa}</p> : null}
            {marcadores.length > 0 && visiveis.length === 0 ? (
              <p style={{ margin: 8, color: '#4A6380' }}>{t.nenhumEncontrado}</p>
            ) : null}
            {visiveis.map((m) => (
              <button
                key={m.id}
                onClick={() => escolher(m.local.id)}
                className="linha-lista"
                style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', background: 'none', border: 0, borderRadius: 14, padding: 8, cursor: 'pointer', minHeight: 56 }}
              >
                {m.local.logo_path ? (
                  <img src={urlImagem(m.local.logo_path)} alt="" style={{ width: 42, height: 42, borderRadius: '50%', flex: 'none', objectFit: 'cover' }} />
                ) : (
                  <span style={{ width: 42, height: 42, borderRadius: '50%', flex: 'none', background: '#1A5FB4', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                    {inicial(m.local.nome)}
                  </span>
                )}
                <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontWeight: 800, color: '#18324F', fontSize: 15 }}>{m.local.nome}</span>
                  <span style={{ fontSize: 13, color: '#4A6380' }}>{nomeCategoria(m.local, lang)}</span>
                </span>
              </button>
            ))}
          </div>
        </aside>
      </div>

      {modal && detalhe ? (
        <ModalLocal detalhe={detalhe} carregando={carregandoDetalhe} aoFechar={fechar} />
      ) : null}
    </section>
  );
}

// Janela com os dados do local (modal central; no celular ocupa quase tudo)
function ModalLocal({ detalhe, aoFechar }) {
  const { lang, t, numeroSuporte } = useIdioma();
  const { local, traducao, usouPortugues, fotos } = detalhe;
  if (!local) return null;

  const temCoordenadas = local.latitude != null && local.longitude != null;
  const linkWa = linkWhatsApp(local.whatsapp, t.msgFalarLocal(local.nome));
  const linkAtualizar = linkWhatsApp(numeroSuporte, t.msgAtualizar(local.nome));
  const instagram = local.instagram
    ? local.instagram.startsWith('http')
      ? local.instagram
      : `https://instagram.com/${local.instagram.replace('@', '')}`
    : '';

  return (
    <div className="modal-fundo" role="presentation">
      <button className="modal-fundo-botao" onClick={aoFechar} aria-label={t.fechar} />
      <div className="modal" role="dialog" aria-modal="true" aria-label={local.nome}>
        <button className="modal-fechar" onClick={aoFechar} aria-label={t.fechar}>
          <IconeFechar />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingRight: 48 }}>
          {local.logo_path ? (
            <img src={urlImagem(local.logo_path)} alt="" style={{ width: 72, height: 72, borderRadius: '50%', flex: 'none', objectFit: 'cover', boxShadow: '0 4px 12px rgba(0,0,0,.12)' }} />
          ) : (
            <span style={{ width: 72, height: 72, borderRadius: '50%', flex: 'none', background: '#1A5FB4', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 26 }}>
              {inicial(local.nome)}
            </span>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#18324F' }}>{local.nome}</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 14, color: '#1A5FB4', fontWeight: 700 }}>{nomeCategoria(local, lang)}</span>
              {local.eh_demonstracao ? <span className="etiqueta-demo">{t.demonstracao}</span> : null}
            </div>
          </div>
        </div>

        {usouPortugues ? <div className="aviso aviso-info">{t.semTraducao}</div> : null}

        {fotos.length > 0 ? (
          <div className="lista-galeria">
            {fotos.map((f, i) => (
              <img key={f.path} src={urlImagem(f.path)} alt={f.legenda || `${t.foto} ${i + 1} — ${local.nome}`} />
            ))}
          </div>
        ) : null}

        <p style={{ margin: 0, lineHeight: 1.55, color: '#3A4E66' }}>
          {traducao?.descricao || t.descricaoVazia}
        </p>

        {traducao?.servicos?.length ? (
          <div>
            <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 800 }}>{t.servicos}</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {traducao.servicos.map((s) => (
                <span key={s} className="chip-servico">{s}</span>
              ))}
            </div>
          </div>
        ) : null}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: '#3A4E66' }}>
          <IconeLocal />
          <span>
            <strong>{local.endereco || t.enderecoAFazer}</strong>
            {local.horario_funcionamento ? <><br />{t.horario}: {local.horario_funcionamento}</> : null}
          </span>
        </div>

        {local.telefone ? <p style={{ margin: 0, fontSize: 14 }}>{t.telefone}: {local.telefone}</p> : null}
        {instagram ? (
          <p style={{ margin: 0, fontSize: 14 }}>
            {t.instagram}: <a href={instagram} target="_blank" rel="noopener">{local.instagram}</a>
          </p>
        ) : null}
        {local.site ? (
          <p style={{ margin: 0, fontSize: 14 }}>
            {t.site}: <a href={local.site} target="_blank" rel="noopener">{local.site}</a>
          </p>
        ) : null}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {linkWa ? (
            <a href={linkWa} target="_blank" rel="noopener" className="btn btn-verde">
              <IconeWhatsApp size={20} /> WhatsApp
            </a>
          ) : (
            <span className="btn" style={{ background: '#EDEFF2', color: '#5A6573', cursor: 'default', fontSize: 14 }}>
              {t.waNaoCadastrado}
            </span>
          )}
          {temCoordenadas ? (
            <>
              <a href={linkGoogleMaps(local.latitude, local.longitude)} target="_blank" rel="noopener" className="btn btn-azul">
                {t.comoChegar} · Google Maps <IconeSeta size={18} />
              </a>
              <a href={linkWaze(local.latitude, local.longitude)} target="_blank" rel="noopener" className="btn btn-contorno">
                Waze
              </a>
            </>
          ) : null}
        </div>

        <a href={linkAtualizar} target="_blank" rel="noopener" className="btn" style={{ background: '#E6F6EA', color: '#155F2A' }}>
          {t.atualizar}
        </a>
      </div>
    </div>
  );
}
