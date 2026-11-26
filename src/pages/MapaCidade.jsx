// Mapa da cidade (público): mapa ilustrado com marcadores lidos do banco.
// Clicar num marcador dá zoom, escurece o fundo e abre o modal com os dados do local.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { supabase, urlImagem } from '../lib/supabase.js';
import { COLUNAS_LOCAL_PUBLICO, nomeCategoria, traducaoPt } from '../lib/locais.js';
import { inicial, linkGoogleMaps, linkWaze, linkWhatsApp } from '../lib/utils.js';
import { IconeFechar, IconeLocal, IconeSeta, IconeWhatsApp } from '../components/Icones.jsx';

const FATOR_ZOOM = 2.4; // quanto o mapa aproxima ao clicar num marcador

// Calcula o transform CSS para aproximar o mapa num ponto (x, y entre 0 e 1)
function transformParaPonto(x, y) {
  const s = FATOR_ZOOM;
  const limitar = (v) => Math.max((1 - s) * 100, Math.min(0, v));
  return `translate(${limitar((0.5 - x * s) * 100)}%, ${limitar((0.5 - y * s) * 100)}%) scale(${s})`;
}

export default function MapaCidade() {
  const { numeroSuporte } = useOutletContext() || {};
  const [params, setParams] = useSearchParams();

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [mapa, setMapa] = useState(null);
  const [marcadores, setMarcadores] = useState([]); // { id, x, y, tamanho, local: {...} }

  const [selecionadoId, setSelecionadoId] = useState(null);
  const [zoom, setZoom] = useState(false);
  const [modal, setModal] = useState(false);
  const [detalhe, setDetalhe] = useState(null); // { local, traducao, fotos }
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);

  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  function depois(fn, ms) {
    timers.current.push(setTimeout(fn, ms));
  }

  // Carrega o mapa ativo e os marcadores publicados
  useEffect(() => {
    if (!supabase) {
      setErro('Site sem configuração do banco de dados.');
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
        setErro('Não foi possível carregar o mapa. Tente de novo em instantes.');
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
        setMarcadores(publicados.map((m) => ({ id: m.id, x: Number(m.x), y: Number(m.y), tamanho: Number(m.tamanho) || 0.05, local: m.locais })));
      }
      setCarregando(false);
    })();
  }, []);

  // Se a página abriu com ?local=ID, já mostra esse local
  useEffect(() => {
    const idUrl = params.get('local');
    if (idUrl && marcadores.some((m) => m.local.id === idUrl)) {
      escolher(idUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marcadores]);

  const marcadorSelecionado = useMemo(
    () => marcadores.find((m) => m.local.id === selecionadoId) || null,
    [marcadores, selecionadoId],
  );

  // Ao clicar: zoom primeiro, depois o modal (como no protótipo)
  async function escolher(localId) {
    setSelecionadoId(localId);
    setZoom(true);
    setModal(false);
    setParams({ local: localId }, { replace: true });
    setCarregandoDetalhe(true);
    setDetalhe(null);
    const [{ data: local }, { data: trad }, { data: fotos }] = await Promise.all([
      supabase.from('locais').select(COLUNAS_LOCAL_PUBLICO).eq('id', localId).maybeSingle(),
      supabase.from('locais_traducoes').select('descricao, servicos, informacoes_uteis').eq('local_id', localId),
      supabase.from('fotos').select('path, legenda').eq('local_id', localId).order('ordem').limit(3),
    ]);
    setDetalhe({ local: local || marcadorSelecionadoLocal(localId), traducao: traducaoPt(trad), fotos: fotos || [] });
    setCarregandoDetalhe(false);
    depois(() => setModal(true), 700);
  }

  // Dados básicos já conhecidos do marcador (usados enquanto o detalhe carrega)
  function marcadorSelecionadoLocal(localId) {
    return marcadores.find((m) => m.local.id === localId)?.local || null;
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
    return <p style={{ textAlign: 'center', padding: 48, color: '#4A6380' }}>Carregando o mapa…</p>;
  }
  if (erro) {
    return <div className="aviso aviso-erro" style={{ margin: 24 }}>{erro}</div>;
  }
  if (!mapa) {
    return (
      <section style={{ maxWidth: 800, margin: '0 auto', padding: '48px 20px', textAlign: 'center' }}>
        <h1 className="titulo-pacifico" style={{ fontSize: 40 }}>Mapa da Cidade</h1>
        <p style={{ color: '#4A6380' }}>O mapa ainda não foi publicado. Volte em breve.</p>
      </section>
    );
  }

  const proporcao = mapa.largura && mapa.altura ? `${mapa.largura} / ${mapa.altura}` : '3 / 2';

  return (
    <section style={{ maxWidth: 1320, margin: '0 auto', padding: '28px 20px 8px' }}>
      <h1 className="titulo-pacifico" style={{ textAlign: 'center', fontSize: 40 }}>Mapa da Cidade</h1>
      <p style={{ margin: '2px 0 18px', textAlign: 'center', color: '#4A6380', fontSize: 16 }}>
        Explore Cajueiro da Praia! Toque em um logo.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'flex-start' }}>
        <div className="mapa-area" style={{ flex: '999 1 600px', minWidth: 0, aspectRatio: proporcao }}>
          <div className="mapa-imagem" style={{ transform: mapaT }}>
            <img src={urlImagem(mapa.imagem_path)} alt="Mapa ilustrado de Cajueiro da Praia" />
            {marcadores.map((m) => {
              const pulsa = m.local.id === selecionadoId ? '' : ' pulsa';
              return (
                <button
                  key={m.id}
                  className={`marcador${pulsa}`}
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
              Voltar ao mapa inteiro
            </button>
          ) : null}
        </div>

        <aside className="cartao" style={{ flex: '1 1 280px', minWidth: 0, padding: 16 }}>
          <p style={{ margin: '0 0 8px 6px', fontWeight: 800, color: '#4A6380', fontSize: 13 }}>
            {marcadores.length} locais no mapa
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 560, overflow: 'auto' }}>
            {marcadores.length === 0 ? (
              <p style={{ margin: 8, color: '#4A6380' }}>Nenhum local publicado no mapa ainda.</p>
            ) : null}
            {marcadores.map((m) => (
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
                  <span style={{ fontSize: 13, color: '#4A6380' }}>{nomeCategoria(m.local)}</span>
                </span>
              </button>
            ))}
          </div>
        </aside>
      </div>

      {modal && detalhe ? (
        <ModalLocal
          detalhe={detalhe}
          carregando={carregandoDetalhe}
          numeroSuporte={numeroSuporte}
          aoFechar={fechar}
        />
      ) : null}
    </section>
  );
}

// Janela com os dados do local (modal central; no celular ocupa quase tudo)
function ModalLocal({ detalhe, numeroSuporte, aoFechar }) {
  const { local, traducao, fotos } = detalhe;
  const temCoordenadas = local.latitude != null && local.longitude != null;
  const linkWa = linkWhatsApp(local.whatsapp, `Olá! Vim pelo Mapa Cajueiro e quero falar com ${local.nome}.`);
  const linkAtualizar = linkWhatsApp(
    numeroSuporte,
    `Olá! Vim pelo Mapa Cajueiro e quero atualizar as informações de: ${local.nome}`,
  );
  const instagram = local.instagram
    ? local.instagram.startsWith('http')
      ? local.instagram
      : `https://instagram.com/${local.instagram.replace('@', '')}`
    : '';

  return (
    <div className="modal-fundo" role="presentation">
      <button className="modal-fundo-botao" onClick={aoFechar} aria-label="Fechar" />
      <div className="modal" role="dialog" aria-modal="true" aria-label={local.nome}>
        <button className="modal-fechar" onClick={aoFechar} aria-label="Fechar">
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
              <span style={{ fontSize: 14, color: '#1A5FB4', fontWeight: 700 }}>{nomeCategoria(local)}</span>
              {local.eh_demonstracao ? <span className="etiqueta-demo">Demonstração</span> : null}
            </div>
          </div>
        </div>

        {fotos.length > 0 ? (
          <div className="lista-galeria">
            {fotos.map((f, i) => (
              <img key={f.path} src={urlImagem(f.path)} alt={f.legenda || `Foto ${i + 1} de ${local.nome}`} />
            ))}
          </div>
        ) : null}

        <p style={{ margin: 0, lineHeight: 1.55, color: '#3A4E66' }}>
          {traducao?.descricao || 'Descrição ainda não cadastrada.'}
        </p>

        {traducao?.servicos?.length ? (
          <div>
            <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 800 }}>Serviços</h3>
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
            <strong>{local.endereco || 'Endereço a confirmar'}</strong>
            {local.horario_funcionamento ? <><br />Horário: {local.horario_funcionamento}</> : null}
          </span>
        </div>

        {local.telefone ? <p style={{ margin: 0, fontSize: 14 }}>Telefone: {local.telefone}</p> : null}
        {instagram ? <p style={{ margin: 0, fontSize: 14 }}>Instagram: <a href={instagram} target="_blank" rel="noopener">{local.instagram}</a></p> : null}
        {local.site ? <p style={{ margin: 0, fontSize: 14 }}>Site: <a href={local.site} target="_blank" rel="noopener">{local.site}</a></p> : null}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {linkWa ? (
            <a href={linkWa} target="_blank" rel="noopener" className="btn btn-verde">
              <IconeWhatsApp size={20} /> WhatsApp
            </a>
          ) : (
            <span className="btn" style={{ background: '#EDEFF2', color: '#5A6573', cursor: 'default', fontSize: 14 }}>
              WhatsApp do local não cadastrado
            </span>
          )}
          {temCoordenadas ? (
            <>
              <a href={linkGoogleMaps(local.latitude, local.longitude)} target="_blank" rel="noopener" className="btn btn-azul">
                Como chegar · Google Maps <IconeSeta size={18} />
              </a>
              <a href={linkWaze(local.latitude, local.longitude)} target="_blank" rel="noopener" className="btn btn-contorno">
                Waze
              </a>
            </>
          ) : null}
        </div>

        <a href={linkAtualizar} target="_blank" rel="noopener" className="btn" style={{ background: '#E6F6EA', color: '#155F2A' }}>
          Atualizar informações deste local
        </a>
      </div>
    </div>
  );
}
