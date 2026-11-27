// Mapa da cidade (público): mapa ilustrado com zoom e arrasto, marcadores lidos do banco.
// Clicar num logo aproxima, escurece o fundo e abre a ficha. Ao fechar, volta ao enquadramento de antes.
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import FichaLocal from '../components/FichaLocal.jsx';
import MapaInterativo from '../components/MapaInterativo.jsx';
import MarcadorMapa from '../components/MarcadorMapa.jsx';
import { IconeFechar } from '../components/Icones.jsx';
import { useIdioma } from '../i18n/IdiomaContext.jsx';
import { supabase, urlImagem } from '../lib/supabase.js';
import {
  COLUNAS_LOCAL_PUBLICO,
  GRUPOS,
  carregarFichaLocal,
  grupoDoLocal,
  nomeCategoria,
  normalizarTexto,
} from '../lib/locais.js';
import { useTitulo } from '../lib/seo.js';
import { inicial } from '../lib/utils.js';

const ESCALA_AO_CLICAR = 2.4; // quanto o mapa aproxima ao clicar num logo

export default function MapaCidade() {
  const { lang, t } = useIdioma();
  const [params, setParams] = useSearchParams();
  useTitulo(`${t.mapaTitulo} — Mapa Cajueiro`);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [mapa, setMapa] = useState(null);
  const [marcadores, setMarcadores] = useState([]); // { id, x, y, tamanho, local }

  const [selecionadoId, setSelecionadoId] = useState(null);
  const [modal, setModal] = useState(false);
  const [detalhe, setDetalhe] = useState(null); // ficha do local (FichaLocal)

  // Referência para o mapa (zoom programático) e o enquadramento de antes do clique
  const mapaRef = useRef(null);
  const vistaAntesRef = useRef(null);

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
          .select(`id, x, y, tamanho, estilo, locais ( ${COLUNAS_LOCAL_PUBLICO}, status )`)
          .eq('mapa_id', mapaAtivo.id)
          .eq('ativo', true);
        // Só mostra locais publicados (o banco também garante isso)
        const publicados = (marc || []).filter((m) => m.locais && m.locais.status === 'publicado');
        setMarcadores(
          publicados.map((m) => ({ id: m.id, x: Number(m.x), y: Number(m.y), tamanho: Number(m.tamanho) || 0.05, estilo: m.estilo === 'area' ? 'area' : 'logo', local: m.locais })),
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

  // Clique num logo: guarda o enquadramento atual, aproxima e abre a ficha
  async function escolher(localId) {
    const marcador = marcadores.find((m) => m.local.id === localId);
    if (!marcador) return;
    if (!vistaAntesRef.current && mapaRef.current) {
      vistaAntesRef.current = mapaRef.current.obterVista();
    }
    setSelecionadoId(localId);
    setModal(false);
    setParams({ local: localId }, { replace: true });
    mapaRef.current?.focarEm(marcador.x, marcador.y, ESCALA_AO_CLICAR);
    setDetalhe(null);
    const ficha = await carregarFichaLocal({ id: localId }, lang);
    if (ficha) setDetalhe(ficha);
    depois(() => setModal(true), 600);
  }

  // Fechar: esconde a ficha e volta ao enquadramento de antes do clique
  function fechar() {
    setModal(false);
    depois(() => {
      if (vistaAntesRef.current) {
        mapaRef.current?.restaurarVista(vistaAntesRef.current);
        vistaAntesRef.current = null;
      }
      setSelecionadoId(null);
      setParams({}, { replace: true });
    }, 120);
  }

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
        <div style={{ flex: '999 1 600px', minWidth: 0 }}>
          <MapaInterativo
            className="mapa-publico"
            ref={mapaRef}
            src={urlImagem(mapa.imagem_path)}
            alt={t.mapaTitulo}
            proporcao={proporcao}
            marcadores={() =>
              marcadores.map((m) => {
                const casa = passaFiltro(m.local);
                const pulsa = filtroAtivo && casa && m.local.id !== selecionadoId ? ' pulsa' : '';
                const fora = casa ? '' : ' fora';
                return (
                  <MarcadorMapa
                    key={m.id}
                    nome={m.local.nome}
                    logoPath={m.local.logo_path}
                    estilo={m.estilo}
                    className={`${pulsa}${fora}`.trim()}
                    tabIndex={casa ? 0 : -1}
                    onClick={() => escolher(m.local.id)}
                    title={m.local.nome}
                    // --tam guarda o tamanho salvo no banco; no celular o CSS aplica um mínimo sem mudar esse valor
                    style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%`, width: `${m.tamanho * 100}%`, '--tam': `${m.tamanho * 100}%` }}
                  />
                );
              })
            }
          />
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

      {modal && detalhe ? <ModalLocal detalhe={detalhe} aoFechar={fechar} /> : null}
    </section>
  );
}

// Janela central com a ficha do local (no celular ocupa quase tudo)
function ModalLocal({ detalhe, aoFechar }) {
  const { t } = useIdioma();
  return (
    <div className="modal-fundo" role="presentation">
      <button className="modal-fundo-botao" onClick={aoFechar} aria-label={t.fechar} />
      <div className="modal" role="dialog" aria-modal="true" aria-label={detalhe.local.nome}>
        <button className="modal-fechar" onClick={aoFechar} aria-label={t.fechar}>
          <IconeFechar />
        </button>
        <FichaLocal detalhe={detalhe} />
      </div>
    </div>
  );
}
