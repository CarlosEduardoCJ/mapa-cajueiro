// Editor do mapa: troca a imagem do mapa e posiciona os locais com zoom e arrasto (igual ao mapa público).
// Clique no mapa = põe o local escolhido ali. Arrastar um marcador = move ele.
// As posições (x, y) são só da imagem; as coordenadas reais (lat/lng) ficam no cadastro do local.
import { useEffect, useRef, useState } from 'react';
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
  const [mapa, setMapa] = useState(null);
  const [marcadores, setMarcadores] = useState([]); // { id, local_id, x, y, tamanho, ativo }
  const [locais, setLocais] = useState([]);
  const [escolhido, setEscolhido] = useState(''); // local que será posto ao clicar no mapa
  const [selecionado, setSelecionado] = useState(null); // id do marcador selecionado
  const [mensagem, setMensagem] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [carregado, setCarregado] = useState(false);
  const arrasteRef = useRef(null); // { id, moveu, localId } enquanto um marcador é arrastado

  async function carregar() {
    const [{ data: mapaAtivo }, { data: todos }] = await Promise.all([
      supabase.from('mapas').select('id, imagem_path, largura, altura').eq('ativo', true).maybeSingle(),
      supabase.from('locais').select('id, nome, status, logo_path').order('nome'),
    ]);
    setMapa(mapaAtivo || null);
    setLocais(todos || []);
    if (mapaAtivo) {
      const { data: marc } = await supabase
        .from('marcadores')
        .select('id, local_id, x, y, tamanho, ativo')
        .eq('mapa_id', mapaAtivo.id);
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

      // Copia as posições do mapa antigo para o novo (depois a equipe confere)
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

      setMensagem({ tipo: 'ok', texto: 'Salvo! A imagem do mapa foi trocada. Confira a posição de todos os marcadores, porque a imagem nova pode ter outro enquadramento.' });
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
      const { error } = await supabase.from('marcadores').update({ x, y }).eq('id', existente.id);
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
      setMensagem({ tipo: 'erro', texto: 'Antes, escolha um local na lista ao lado. Depois clique no mapa.' });
      return;
    }
    setMensagem(null);
    try {
      await gravarPosicao(escolhido, x, y);
      setMensagem({ tipo: 'ok', texto: `Salvo! ${nomeDoLocal(escolhido)?.nome} foi posicionado.` });
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: mensagemAmigavel(erro, 'salvar a posição') });
    }
  }

  // Arrastar um marcador: move enquanto o dedo/mouse se mexe e salva ao soltar
  function iniciarArraste(e, marcador, paraNormalizado) {
    e.stopPropagation();
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (erro) {
      /* sem captura: o arrasto ainda funciona enquanto o dedo estiver sobre o marcador */
    }
    arrasteRef.current = { id: marcador.id, localId: marcador.local_id, moveu: false };

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

  async function alterar(marcador, extras) {
    try {
      const { error } = await supabase.from('marcadores').update(extras).eq('id', marcador.id);
      if (error) throw error;
      setMensagem({ tipo: 'ok', texto: 'Salvo!' });
      await carregar();
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: mensagemAmigavel(erro, 'salvar') });
    }
  }

  async function alternarAtivo(marcador) {
    if (marcador.ativo) {
      const ok = window.confirm(`Desativar "${marcador.locais?.nome || 'este local'}"? Ele some do mapa do site até você reativar.`);
      if (!ok) return;
    }
    alterar(marcador, { ativo: !marcador.ativo });
  }

  async function remover(marcador) {
    if (!window.confirm(`Remover "${marcador.locais?.nome || 'este local'}" do mapa? O local continua cadastrado.`)) return;
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

  // Locais que ainda não estão no mapa aparecem primeiro na lista
  const marcadoresComNome = marcadores.map((m) => ({ ...m, locais: nomeDoLocal(m.local_id) }));
  const jaNoMapa = new Set(marcadores.map((m) => m.local_id));
  const opcoes = [...locais].sort((a, b) => Number(jaNoMapa.has(a.id)) - Number(jaNoMapa.has(b.id)));
  const marcadorAtual = marcadoresComNome.find((m) => m.id === selecionado) || null;

  return (
    <>
      <h1 className="titulo-pacifico" style={{ fontSize: 34 }}>Mapa e marcadores</h1>

      <section className="cartao" style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <strong>Imagem atual:</strong> {mapa ? 'mapa ilustrado publicado' : 'nenhum mapa publicado ainda'}
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#4A6380' }}>
            Trocar a imagem mantém as posições antigas, mas elas precisam ser conferidas.
          </p>
        </div>
        <label className="btn btn-azul" style={{ cursor: ocupado ? 'wait' : 'pointer' }}>
          {ocupado ? 'Enviando…' : mapa ? 'Trocar imagem do mapa' : 'Enviar imagem do mapa'}
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={trocarImagem} disabled={ocupado} style={{ display: 'none' }} />
        </label>
      </section>

      {mensagem ? (
        <div className={`aviso ${mensagem.tipo === 'erro' ? 'aviso-erro' : 'aviso-ok'}`} role="status" style={{ fontWeight: 700 }}>
          {mensagem.texto}
        </div>
      ) : null}

      {!carregado ? <p style={{ color: '#4A6380' }}>Carregando…</p> : null}

      {mapa ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'flex-start' }}>
          <div style={{ flex: '999 1 560px', minWidth: 0 }}>
            <MapaInterativo
              src={urlImagem(mapa.imagem_path)}
              alt="Mapa para posicionar os locais"
              proporcao={`${mapa.largura} / ${mapa.altura}`}
              onPontoClique={clicarMapa}
              marcadores={({ paraNormalizado }) =>
                marcadoresComNome.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    data-marcador
                    className="marcador"
                    onPointerDown={(e) => iniciarArraste(e, m, paraNormalizado)}
                    onClick={() => setSelecionado(m.id)}
                    aria-label={m.locais?.nome}
                    style={{
                      left: `${m.x * 100}%`,
                      top: `${m.y * 100}%`,
                      width: `${m.tamanho * 100}%`,
                      opacity: m.ativo ? 1 : 0.4,
                      borderColor: selecionado === m.id ? '#F7C21A' : undefined,
                      touchAction: 'none',
                    }}
                  >
                    {m.locais?.logo_path ? (
                      <img src={urlImagem(m.locais.logo_path)} alt="" draggable={false} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '3px solid #fff', boxSizing: 'border-box' }} />
                    ) : (
                      <span className="marcador-pino">{inicial(m.locais?.nome)}</span>
                    )}
                  </button>
                ))
              }
            />
            <p style={{ fontSize: 13, color: '#4A6380' }}>
              {escolhido
                ? `Clique no mapa para pôr "${nomeDoLocal(escolhido)?.nome}". Arraste um marcador para mover. Use + e − (ou a roda do mouse, ou dois dedos) para aproximar.`
                : 'Escolha um local na lista ao lado para posicioná-lo. Arraste um marcador para mover. Use + e − para aproximar.'}
            </p>
          </div>

          <aside className="cartao" style={{ flex: '1 1 280px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label className="campo">
              Local a posicionar
              <select value={escolhido} onChange={(e) => setEscolhido(e.target.value)}>
                <option value="">— nenhum —</option>
                {opcoes.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nome}{jaNoMapa.has(l.id) ? ' (já no mapa)' : ''}{l.status !== 'publicado' ? ' — não publicado' : ''}
                  </option>
                ))}
              </select>
            </label>

            {marcadorAtual ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid #EEF3FA', paddingTop: 12 }}>
                <strong>{marcadorAtual.locais?.nome}</strong>
                <label className="campo">
                  Tamanho no mapa ({Math.round(marcadorAtual.tamanho * 100)}% da largura)
                  <input
                    type="range"
                    min="0.02"
                    max="0.2"
                    step="0.005"
                    value={marcadorAtual.tamanho}
                    onChange={(e) => setMarcadores((lista) => lista.map((m) => (m.id === marcadorAtual.id ? { ...m, tamanho: Number(e.target.value) } : m)))}
                    onPointerUp={(e) => alterar(marcadorAtual, { tamanho: Number(e.currentTarget.value) })}
                    onKeyUp={(e) => alterar(marcadorAtual, { tamanho: Number(e.currentTarget.value) })}
                  />
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-contorno" style={{ minHeight: 40 }} onClick={() => alternarAtivo(marcadorAtual)}>
                    {marcadorAtual.ativo ? 'Desativar' : 'Ativar'}
                  </button>
                  <button className="btn btn-perigo" style={{ minHeight: 40 }} onClick={() => remover(marcadorAtual)}>
                    Remover do mapa
                  </button>
                </div>
              </div>
            ) : null}

            <div>
              <strong style={{ fontSize: 14 }}>No mapa ({marcadores.length})</strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6, maxHeight: 260, overflow: 'auto' }}>
                {marcadoresComNome.map((m) => (
                  <button key={m.id} onClick={() => setSelecionado(m.id)} style={{ textAlign: 'left', background: selecionado === m.id ? '#EEF5FF' : 'none', border: 0, borderRadius: 10, padding: '6px 8px', cursor: 'pointer', fontSize: 14 }}>
                    {m.locais?.nome} {m.ativo ? '' : '(desativado)'}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      ) : carregado ? (
        <p className="aviso aviso-info">Envie a imagem do mapa para começar a posicionar os locais.</p>
      ) : null}
    </>
  );
}
