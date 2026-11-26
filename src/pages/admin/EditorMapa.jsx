// Editor do mapa: troca a imagem, posiciona os locais com zoom e arrasto (igual ao mapa público).
// - Clicar num marcador abre o painel lateral dele (ficha, tamanho, desativar, remover).
// - Lista "Fora do mapa": escolha um local e clique na imagem, ou arraste o nome até o mapa.
// As posições (x, y) são só da imagem; as coordenadas reais (lat/lng) ficam no cadastro do local.
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import MapaInterativo from '../../components/MapaInterativo.jsx';
import { supabase, BUCKET_MIDIA, urlImagem } from '../../lib/supabase.js';
import { comprimirImagem } from '../../lib/imagens.js';
import { inicial } from '../../lib/utils.js';
import { mensagemAmigavel } from '../../lib/erros.js';

const TAMANHO_PADRAO = 0.05;

// Descobre largura e altura reais de uma imagem no navegador
function dimensoesImagem(arquivo) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      resolve({ largura: img.naturalWidth, altura: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function EditorMapa() {
  const [params, setParams] = useSearchParams();
  const [mapa, setMapa] = useState(null);
  const [marcadores, setMarcadores] = useState([]); // { id, local_id, x, y, tamanho, ativo }
  const [locais, setLocais] = useState([]);
  const [escolhido, setEscolhido] = useState(params.get('local') || ''); // local que será posto ao clicar no mapa
  const [selecionado, setSelecionado] = useState(null); // id do marcador com painel aberto
  const [mensagem, setMensagem] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [carregado, setCarregado] = useState(false);
  const [arrastando, setArrastando] = useState(null); // { localId, nome, x, y } ao arrastar da lista
  const arrasteRef = useRef(null); // marcador sendo arrastado
  const ctxMapaRef = useRef(null); // funções do mapa (converter posição da tela para a imagem)
  const areaRef = useRef(null); // área do mapa (para saber se soltou em cima dele)

  async function carregar() {
    const [{ data: mapaAtivo }, { data: todos }] = await Promise.all([
      supabase.from('mapas').select('id, imagem_path, largura, altura').eq('ativo', true).maybeSingle(),
      supabase.from('locais').select('id, nome, status, logo_path, slug, eh_demonstracao').order('nome'),
    ]);
    setMapa(mapaAtivo || null);
    setLocais(todos || []);
    if (mapaAtivo) {
      const { data: marc } = await supabase.from('marcadores').select('id, local_id, x, y, tamanho, ativo').eq('mapa_id', mapaAtivo.id);
      setMarcadores((marc || []).map((m) => ({ ...m, x: Number(m.x), y: Number(m.y), tamanho: Number(m.tamanho) })));
    } else {
      setMarcadores([]);
    }
    setCarregado(true);
  }

  useEffect(() => {
    carregar();
  }, []);

  const nomeDoLocal = (localId) => locais.find((l) => l.id === localId);

  // Troca a imagem do mapa: cria um mapa novo, copia as posições e ativa o novo
  async function trocarImagem(e) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    if (marcadores.length && !window.confirm('Trocar a imagem mantém as posições antigas, mas elas precisarão ser conferidas. Continuar?')) return;
    setOcupado(true);
    setMensagem(null);
    try {
      const pronta = await comprimirImagem(arquivo);
      const { largura, altura } = await dimensoesImagem(pronta);
      const novoId = crypto.randomUUID();
      const caminho = `mapas/${novoId}.webp`;

      const { error: erroUp } = await supabase.storage.from(BUCKET_MIDIA).upload(caminho, pronta, { contentType: 'image/webp', upsert: true });
      if (erroUp) throw erroUp;
      const { error: erroInsert } = await supabase.from('mapas').insert({
        id: novoId,
        nome: `Mapa ${new Date().toLocaleDateString('pt-BR')}`,
        imagem_path: caminho,
        largura,
        altura,
        ativo: false,
      });
      if (erroInsert) throw erroInsert;

      if (mapa) {
        const copias = marcadores.map((m) => ({ mapa_id: novoId, local_id: m.local_id, x: m.x, y: m.y, tamanho: m.tamanho, ativo: m.ativo }));
        if (copias.length) {
          const { error } = await supabase.from('marcadores').insert(copias);
          if (error) throw error;
        }
        const { error: erroDesativa } = await supabase.from('mapas').update({ ativo: false }).eq('ativo', true);
        if (erroDesativa) throw erroDesativa;
      }
      const { error: erroAtivo } = await supabase.from('mapas').update({ ativo: true }).eq('id', novoId);
      if (erroAtivo) throw erroAtivo;

      setMensagem({ tipo: 'ok', texto: 'Salvo! A imagem do mapa foi trocada. Confira a posição de cada marcador.' });
      await carregar();
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: mensagemAmigavel(erro, 'trocar a imagem do mapa') });
    }
    setOcupado(false);
  }

  // Grava (cria ou atualiza) a posição de um local no mapa ativo
  async function gravarPosicao(localId, x, y) {
    if (!mapa) return;
    const existente = marcadores.find((m) => m.local_id === localId);
    if (existente) {
      const { error } = await supabase.from('marcadores').update({ x, y, ativo: true }).eq('id', existente.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('marcadores')
        .insert({ mapa_id: mapa.id, local_id: localId, x, y, tamanho: TAMANHO_PADRAO, ativo: true });
      if (error) throw error;
    }
    await carregar();
  }

  // Clique no fundo do mapa: põe o local escolhido nesse ponto
  async function clicarMapa({ x, y }) {
    if (!escolhido) {
      setMensagem({ tipo: 'erro', texto: 'Antes, escolha um local na lista "Fora do mapa". Depois clique no mapa.' });
      return;
    }
    setMensagem(null);
    try {
      await gravarPosicao(escolhido, x, y);
      setMensagem({ tipo: 'ok', texto: `Salvo! "${nomeDoLocal(escolhido)?.nome}" foi posicionado.` });
      setEscolhido('');
      setParams({}, { replace: true });
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: mensagemAmigavel(erro, 'salvar a posição') });
    }
  }

  // Arrastar um marcador já existente: move enquanto o dedo/mouse se mexe e salva ao soltar
  function iniciarArraste(e, marcador, paraNormalizado) {
    e.stopPropagation();
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (erro) {
      /* sem captura: o arrasto segue enquanto o dedo estiver sobre o marcador */
    }
    arrasteRef.current = { id: marcador.id, moveu: false };

    function mover(ev) {
      const { x, y } = paraNormalizado(ev.clientX, ev.clientY);
      arrasteRef.current.moveu = true;
      setMarcadores((lista) => lista.map((m) => (m.id === marcador.id ? { ...m, x, y } : m)));
    }
    async function soltar(ev) {
      e.currentTarget.removeEventListener('pointermove', mover);
      e.currentTarget.removeEventListener('pointerup', soltar);
      const { x, y } = paraNormalizado(ev.clientX, ev.clientY);
      const moveu = arrasteRef.current?.moveu;
      arrasteRef.current = null;
      if (moveu) {
        try {
          const { error } = await supabase.from('marcadores').update({ x, y }).eq('id', marcador.id);
          if (error) throw error;
          setMensagem({ tipo: 'ok', texto: 'Salvo! Posição atualizada.' });
        } catch (erro) {
          setMensagem({ tipo: 'erro', texto: mensagemAmigavel(erro, 'salvar a posição') });
        }
        await carregar();
      }
    }
    e.currentTarget.addEventListener('pointermove', mover);
    e.currentTarget.addEventListener('pointerup', soltar);
  }

  // Arrastar um nome da lista "Fora do mapa" até a imagem
  function iniciarArrasteDaLista(e, local) {
    if (e.button !== undefined && e.button !== 0) return;
    setEscolhido(local.id);
    setArrastando({ localId: local.id, nome: local.nome, x: e.clientX, y: e.clientY });
    function mover(ev) {
      setArrastando((a) => (a ? { ...a, x: ev.clientX, y: ev.clientY } : a));
    }
    function soltar(ev) {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      setArrastando(null);
      const area = areaRef.current?.getBoundingClientRect();
      const dentro = area && ev.clientX >= area.left && ev.clientX <= area.right && ev.clientY >= area.top && ev.clientY <= area.bottom;
      if (dentro && ctxMapaRef.current) {
        const { x, y } = ctxMapaRef.current.paraNormalizado(ev.clientX, ev.clientY);
        gravarPosicao(local.id, x, y)
          .then(() => {
            setMensagem({ tipo: 'ok', texto: `Salvo! "${local.nome}" foi posicionado.` });
            setEscolhido('');
          })
          .catch((erro) => setMensagem({ tipo: 'erro', texto: mensagemAmigavel(erro, 'salvar a posição') }));
      }
    }
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
  }

  async function alterarMarcador(marcador, extras, msg) {
    try {
      const { error } = await supabase.from('marcadores').update(extras).eq('id', marcador.id);
      if (error) throw error;
      setMensagem({ tipo: 'ok', texto: msg || 'Salvo!' });
      await carregar();
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: mensagemAmigavel(erro, 'salvar') });
    }
  }

  async function desativar(marcador) {
    if (!window.confirm(`Desativar "${marcador.locais?.nome}"? Ele some do mapa do site até você ativá-lo de novo.`)) return;
    alterarMarcador(marcador, { ativo: false }, 'Salvo! Marcador desativado.');
  }

  async function reativar(marcador) {
    alterarMarcador(marcador, { ativo: true }, 'Salvo! Marcador ativado.');
  }

  async function remover(marcador) {
    if (!window.confirm(`Remover "${marcador.locais?.nome}" do mapa? O local continua cadastrado e pode ser posicionado de novo depois.`)) return;
    try {
      const { error } = await supabase.from('marcadores').delete().eq('id', marcador.id);
      if (error) throw error;
      setSelecionado(null);
      setMensagem({ tipo: 'ok', texto: 'Salvo! Marcador removido do mapa.' });
      await carregar();
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: mensagemAmigavel(erro, 'remover o marcador') });
    }
  }

  // Dados para as listas
  const marcadoresComNome = marcadores.map((m) => ({ ...m, locais: nomeDoLocal(m.local_id) }));
  const jaNoMapa = new Set(marcadores.map((m) => m.local_id));
  const foraDoMapa = locais.filter((l) => !jaNoMapa.has(l.id));
  const marcadorAtual = marcadoresComNome.find((m) => m.id === selecionado) || null;
  const nomeEscolhido = nomeDoLocal(escolhido)?.nome;

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <h1 className="titulo-pacifico" style={{ fontSize: 34 }}>Mapa</h1>
          <p className="texto-apoio">Coloque cada local no lugar certo da cidade. Use + e − para aproximar.</p>
        </div>
        <label className="btn btn-azul" style={{ cursor: ocupado ? 'wait' : 'pointer' }}>
          {ocupado ? 'Enviando…' : mapa ? 'Trocar a imagem do mapa' : 'Enviar a imagem do mapa'}
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={trocarImagem} disabled={ocupado} style={{ display: 'none' }} />
        </label>
      </div>

      {mensagem ? (
        <div className={`aviso ${mensagem.tipo === 'erro' ? 'aviso-erro' : 'aviso-ok'}`} role="status" style={{ fontWeight: 700 }}>
          {mensagem.texto}
        </div>
      ) : null}

      {!carregado ? <p style={{ color: '#4A6380' }}>Carregando…</p> : null}

      {carregado && !mapa ? (
        <p className="aviso aviso-info">Envie a imagem do mapa para começar a posicionar os locais.</p>
      ) : null}

      {mapa ? (
        <div className="editor-mapa-grade">
          <div>
            <div ref={areaRef} className={`area-mapa-editor${escolhido ? ' pronto' : ''}`}>
              <MapaInterativo
                src={urlImagem(mapa.imagem_path)}
                alt="Mapa para posicionar os locais"
                proporcao={`${mapa.largura} / ${mapa.altura}`}
                onPontoClique={clicarMapa}
                marcadores={(ctx) => {
                  ctxMapaRef.current = ctx;
                  return marcadoresComNome.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      data-marcador
                      className={`marcador marcador-editor${selecionado === m.id ? ' selecionado' : ''}`}
                      onPointerDown={(e) => iniciarArraste(e, m, ctx.paraNormalizado)}
                      onClick={() => setSelecionado(m.id)}
                      aria-label={`Marcador: ${m.locais?.nome}`}
                      style={{
                        left: `${m.x * 100}%`,
                        top: `${m.y * 100}%`,
                        width: `${m.tamanho * 100}%`,
                        opacity: m.ativo ? 1 : 0.4,
                        touchAction: 'none',
                      }}
                    >
                      {m.locais?.logo_path ? (
                        <img src={urlImagem(m.locais.logo_path)} alt="" draggable={false} className="marcador-logo" />
                      ) : (
                        <span className="marcador-pino">{inicial(m.locais?.nome)}</span>
                      )}
                    </button>
                  ));
                }}
              />
            </div>
            <p className="texto-apoio" style={{ marginTop: 10 }}>
              {escolhido
                ? <><strong>Clique no mapa</strong> para pôr "{nomeEscolhido}", ou arraste o nome para cá.</>
                : 'Toque num marcador para ver e editar. Para pôr um local novo, escolha-o na lista "Fora do mapa".'}
            </p>
          </div>

          <aside className="painel-lateral-mapa">
            {marcadorAtual ? (
              <section className="cartao caixa-marcador">
                <div className="caixa-marcador-topo">
                  {marcadorAtual.locais?.logo_path ? (
                    <img src={urlImagem(marcadorAtual.locais.logo_path)} alt="" className="logo-grande" style={{ width: 64, height: 64 }} />
                  ) : (
                    <span className="logo-grande logo-vazio" style={{ width: 64, height: 64, fontSize: 24 }}>{inicial(marcadorAtual.locais?.nome)}</span>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <strong className="cartao-nome">{marcadorAtual.locais?.nome}</strong>
                    <div>
                      <span className={`etiqueta-status etiqueta-${marcadorAtual.locais?.status || 'rascunho'}`}>{marcadorAtual.locais?.status || 'rascunho'}</span>
                      {!marcadorAtual.ativo ? <span className="etiqueta-status etiqueta-inativo">Marcador desativado</span> : null}
                    </div>
                  </div>
                </div>

                <label className="campo">
                  Tamanho no mapa: {Math.round(marcadorAtual.tamanho * 100)}%
                  <input
                    type="range"
                    min="0.02"
                    max="0.2"
                    step="0.005"
                    value={marcadorAtual.tamanho}
                    className="controle-tamanho"
                    onChange={(e) => setMarcadores((lista) => lista.map((m) => (m.id === marcadorAtual.id ? { ...m, tamanho: Number(e.target.value) } : m)))}
                    onPointerUp={(e) => alterarMarcador(marcadorAtual, { tamanho: Number(e.currentTarget.value) }, 'Salvo! Tamanho atualizado.')}
                    onKeyUp={(e) => alterarMarcador(marcadorAtual, { tamanho: Number(e.currentTarget.value) }, 'Salvo! Tamanho atualizado.')}
                  />
                </label>

                <Link to={`/admin/locais/${marcadorAtual.local_id}`} className="btn btn-azul botao-grande">Editar ficha completa</Link>
                {marcadorAtual.ativo ? (
                  <button className="btn btn-contorno botao-grande" onClick={() => desativar(marcadorAtual)}>Desativar marcador</button>
                ) : (
                  <button className="btn btn-contorno botao-grande" onClick={() => reativar(marcadorAtual)}>Ativar marcador</button>
                )}
                <button className="btn btn-perigo botao-grande" onClick={() => remover(marcadorAtual)}>Remover do mapa</button>
                <button className="link-simples" onClick={() => setSelecionado(null)}>Fechar</button>
              </section>
            ) : null}

            <section className="cartao caixa-lista-mapa">
              <h2 className="admin-subtitulo" style={{ margin: 0 }}>Fora do mapa ({foraDoMapa.length})</h2>
              <p className="texto-apoio" style={{ margin: 0, fontSize: 13 }}>Escolha um nome e clique no mapa, ou arraste até a imagem.</p>
              {foraDoMapa.length === 0 ? <p className="aviso aviso-ok" style={{ margin: 0 }}>Todos os locais já estão no mapa.</p> : null}
              <div className="lista-fora">
                {foraDoMapa.map((l) => (
                  <div key={l.id} className={`item-fora${escolhido === l.id ? ' escolhido' : ''}`}>
                    <button
                      type="button"
                      className="item-fora-arrastar"
                      onPointerDown={(e) => iniciarArrasteDaLista(e, l)}
                      aria-label={`Arrastar ${l.nome} até o mapa`}
                    >
                      <span aria-hidden="true">⠿</span>
                      <span className="item-fora-nome">{l.nome}</span>
                    </button>
                    <button type="button" className="btn btn-contorno item-fora-escolher" onClick={() => setEscolhido(escolhido === l.id ? '' : l.id)}>
                      {escolhido === l.id ? 'Escolhido' : 'Escolher'}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="cartao caixa-lista-mapa">
              <h2 className="admin-subtitulo" style={{ margin: 0 }}>No mapa ({marcadores.length})</h2>
              <div className="lista-fora">
                {marcadoresComNome.map((m) => (
                  <button key={m.id} type="button" onClick={() => setSelecionado(m.id)} className={`item-no-mapa${selecionado === m.id ? ' ativo' : ''}`}>
                    {m.locais?.nome}{m.ativo ? '' : ' (desativado)'}
                  </button>
                ))}
              </div>
            </section>
          </aside>
        </div>
      ) : null}

      {/* Nome que está sendo arrastado acompanha o dedo ou o mouse */}
      {arrastando ? (
        <div className="fantasma-arraste" style={{ left: arrastando.x + 12, top: arrastando.y + 12 }}>{arrastando.nome}</div>
      ) : null}
    </>
  );
}
