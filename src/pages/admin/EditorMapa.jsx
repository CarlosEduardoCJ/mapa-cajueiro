// Editor do mapa: troca a imagem, posiciona os locais com zoom e arrasto (igual ao mapa público).
// - Clicar num marcador abre o painel lateral dele (ficha, tamanho, desativar, remover).
// - Lista "Fora do mapa": escolha um local e clique na imagem, ou arraste o nome até o mapa.
// - Desfazer / Refazer (botões e Ctrl+Z / Ctrl+Shift+Z): cada mudança guarda o "antes" e o "depois".
// - Modo edição (cadeado): precisa estar ligado para mexer nos marcadores, para evitar mudanças sem querer.
// As posições (x, y) são só da imagem; as coordenadas reais (lat/lng) ficam no cadastro do local.
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import MapaInterativo from '../../components/MapaInterativo.jsx';
import MarcadorMapa from '../../components/MarcadorMapa.jsx';
import { supabase, BUCKET_MIDIA, urlImagem } from '../../lib/supabase.js';
import { comprimirImagem } from '../../lib/imagens.js';
import { inicial } from '../../lib/utils.js';
import { mensagemAmigavel } from '../../lib/erros.js';

const TAMANHO_PADRAO = 0.05;
const LIMITE_HISTORICO = 50; // quantas ações ficam guardadas na sessão
const LIMITE_ARRASTO_PX = 5; // movimentos menores que isso não contam como arrasto (toque no touchpad)

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

// O que de um marcador pode mudar (e portanto é guardado no "antes" e no "depois")
function estadoDe(m) {
  return { x: m.x, y: m.y, tamanho: m.tamanho, ativo: m.ativo, estilo: m.estilo || 'logo' };
}

// Frase curta para a mensagem de desfeito/refeito, conforme o tipo da ação
function fraseDaAcao(acao, desfazendo) {
  const n = acao.nome;
  const frases = {
    posicionar: [`${n} foi tirado do mapa`, `${n} voltou a ser posicionado`],
    mover: [`${n} voltou para a posição anterior`, `${n} foi movido de novo`],
    tamanho: [`${n} voltou ao tamanho anterior`, `o tamanho de ${n} foi mudado de novo`],
    ativar: [`o marcador de ${n} voltou a ficar desativado`, `o marcador de ${n} foi ativado de novo`],
    desativar: [`o marcador de ${n} voltou a ficar ativo`, `o marcador de ${n} foi desativado de novo`],
    remover: [`${n} voltou para o mapa`, `${n} foi removido do mapa de novo`],
    estilo: [`${n} voltou ao estilo anterior`, `o estilo de ${n} foi mudado de novo`],
  };
  return frases[acao.tipo][desfazendo ? 0 : 1];
}

export default function EditorMapa() {
  const [params, setParams] = useSearchParams();
  const [mapa, setMapa] = useState(null);
  const [marcadores, setMarcadores] = useState([]); // { id, local_id, x, y, tamanho, ativo }
  const [locais, setLocais] = useState([]);
  const [escolhido, setEscolhido] = useState(''); // local da lista "Fora do mapa" que será posto ao clicar no mapa
  const [selecionado, setSelecionado] = useState(null); // id do marcador com painel aberto
  const [mensagem, setMensagem] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [carregado, setCarregado] = useState(false);
  const [arrastando, setArrastando] = useState(null); // { localId, nome, x, y } ao arrastar da lista
  // Modo edição: começa ligado só quando se chega pelo atalho "Posicionar no mapa"
  const [edicao, setEdicao] = useState(Boolean(params.get('local')));
  // Histórico da sessão: cada ação = { tipo, localId, nome, antes, depois } (antes/depois = estado do marcador ou null)
  const [feitas, setFeitas] = useState([]);
  const [refazer, setRefazer] = useState([]);
  const [trabalhando, setTrabalhando] = useState(false); // evita desfazer/refazer em duplicidade
  const arrasteRef = useRef(null); // marcador sendo arrastado
  const ctxMapaRef = useRef(null); // funções do mapa (converter posição da tela para a imagem)
  const areaRef = useRef(null); // área do mapa (para saber se soltou em cima dele)
  const tamanhoInicioRef = useRef(null); // tamanho antes de começar a mexer no controle
  const marcadoresRef = useRef([]);
  marcadoresRef.current = marcadores; // sempre a lista mais recente, para funções assíncronas

  async function carregar() {
    const [{ data: mapaAtivo }, { data: todos }] = await Promise.all([
      supabase.from('mapas').select('id, imagem_path, largura, altura').eq('ativo', true).maybeSingle(),
      supabase.from('locais').select('id, nome, status, logo_path, slug, eh_demonstracao').order('nome'),
    ]);
    setMapa(mapaAtivo || null);
    setLocais(todos || []);
    if (mapaAtivo) {
      const { data: marc } = await supabase.from('marcadores').select('id, local_id, x, y, tamanho, ativo, estilo').eq('mapa_id', mapaAtivo.id);
      setMarcadores((marc || []).map((m) => ({ ...m, x: Number(m.x), y: Number(m.y), tamanho: Number(m.tamanho), estilo: m.estilo === 'area' ? 'area' : 'logo' })));
    } else {
      setMarcadores([]);
    }
    setCarregado(true);
  }

  useEffect(() => {
    carregar();
  }, []);

  // Chegou pelo atalho "Posicionar no mapa": se o local já está no mapa, só seleciona o marcador;
  // se ainda não está, deixa escolhido para posicionar
  useEffect(() => {
    if (!carregado) return;
    const idUrl = params.get('local');
    if (!idUrl) return;
    const existente = marcadoresRef.current.find((m) => m.local_id === idUrl);
    if (existente) setSelecionado(existente.id);
    else if (locais.some((l) => l.id === idUrl)) setEscolhido(idUrl);
    setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregado]);

  const nomeDoLocal = (localId) => locais.find((l) => l.id === localId);

  // ---------- Histórico (desfazer / refazer) ----------

  // Guarda uma ação nova (e esquece o "refazer", como em qualquer editor)
  function registrar(acao) {
    setFeitas((lista) => [...lista, acao].slice(-LIMITE_HISTORICO));
    setRefazer([]);
  }

  // Grava no banco o estado de um marcador: null apaga, objeto cria ou atualiza (recria com a mesma posição e tamanho)
  async function aplicarEstado(localId, estado) {
    const { data: existente, error: erroBusca } = await supabase
      .from('marcadores')
      .select('id')
      .eq('mapa_id', mapa.id)
      .eq('local_id', localId)
      .maybeSingle();
    if (erroBusca) throw erroBusca;
    if (!estado) {
      if (existente) {
        const { error } = await supabase.from('marcadores').delete().eq('id', existente.id);
        if (error) throw error;
      }
    } else if (existente) {
      const { error } = await supabase.from('marcadores').update(estado).eq('id', existente.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('marcadores').insert({ mapa_id: mapa.id, local_id: localId, ...estado });
      if (error) throw error;
    }
    await carregar();
  }

  async function desfazer() {
    if (trabalhando || feitas.length === 0 || !mapa) return;
    const acao = feitas[feitas.length - 1];
    setTrabalhando(true);
    try {
      await aplicarEstado(acao.localId, acao.antes);
      setFeitas((l) => l.slice(0, -1));
      setRefazer((l) => [...l, acao]);
      setMensagem({ tipo: 'ok', texto: `Desfeito: ${fraseDaAcao(acao, true)}.` });
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: mensagemAmigavel(erro, 'desfazer') });
    }
    setTrabalhando(false);
  }

  async function refazerAcao() {
    if (trabalhando || refazer.length === 0 || !mapa) return;
    const acao = refazer[refazer.length - 1];
    setTrabalhando(true);
    try {
      await aplicarEstado(acao.localId, acao.depois);
      setRefazer((l) => l.slice(0, -1));
      setFeitas((l) => [...l, acao]);
      setMensagem({ tipo: 'ok', texto: `Refeito: ${fraseDaAcao(acao, false)}.` });
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: mensagemAmigavel(erro, 'refazer') });
    }
    setTrabalhando(false);
  }

  // Atalhos Ctrl+Z / Ctrl+Shift+Z (Cmd no Mac): só valem com o foco no editor, e não dentro de campos de texto
  function aoTeclar(e) {
    if (e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (!(e.ctrlKey || e.metaKey)) return;
    const tecla = e.key.toLowerCase();
    if (tecla === 'z' && !e.shiftKey) {
      e.preventDefault();
      desfazer();
    } else if ((tecla === 'z' && e.shiftKey) || tecla === 'y') {
      e.preventDefault();
      refazerAcao();
    }
  }

  // Dá o foco ao editor ao clicar nele (para os atalhos funcionarem), sem roubar o foco de campos
  function focarEditor(e) {
    if (e.target.closest('input, textarea, select, a')) return;
    e.currentTarget.focus({ preventScroll: true });
  }

  // Avisa quando o modo edição está desligado e a pessoa tenta mudar algo
  function exigirEdicao() {
    if (edicao) return true;
    setMensagem({ tipo: 'erro', texto: 'O Modo edição está desligado. Ligue o cadeado ("Modo edição") para fazer mudanças.' });
    return false;
  }

  // ---------- Imagem do mapa ----------

  // Troca a imagem do mapa: cria um mapa novo, copia as posições e ativa o novo
  async function trocarImagem(e) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    if (!exigirEdicao()) return;
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
        const copias = marcadores.map((m) => ({ mapa_id: novoId, local_id: m.local_id, x: m.x, y: m.y, tamanho: m.tamanho, ativo: m.ativo, estilo: m.estilo }));
        if (copias.length) {
          const { error } = await supabase.from('marcadores').insert(copias);
          if (error) throw error;
        }
        const { error: erroDesativa } = await supabase.from('mapas').update({ ativo: false }).eq('ativo', true);
        if (erroDesativa) throw erroDesativa;
      }
      const { error: erroAtivo } = await supabase.from('mapas').update({ ativo: true }).eq('id', novoId);
      if (erroAtivo) throw erroAtivo;

      // Mapa novo: o histórico antigo não vale mais
      setFeitas([]);
      setRefazer([]);
      setMensagem({ tipo: 'ok', texto: 'Salvo! A imagem do mapa foi trocada. Confira a posição de cada marcador.' });
      await carregar();
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: mensagemAmigavel(erro, 'trocar a imagem do mapa') });
    }
    setOcupado(false);
  }

  // ---------- Mudanças nos marcadores (cada uma vira UMA ação no histórico) ----------

  // Põe um local no mapa (se ainda não estava) ou move (se já estava)
  async function posicionar(localId, x, y) {
    if (!mapa) return;
    const existente = marcadoresRef.current.find((m) => m.local_id === localId);
    const antes = existente ? estadoDe(existente) : null;
    const depois = { x, y, tamanho: existente ? existente.tamanho : TAMANHO_PADRAO, ativo: true, estilo: existente ? existente.estilo : 'logo' };
    await aplicarEstado(localId, depois);
    registrar({ tipo: existente ? 'mover' : 'posicionar', localId, nome: nomeDoLocal(localId)?.nome || 'Local', antes, depois });
  }

  // Clique no fundo do mapa: põe o local escolhido nesse ponto
  async function clicarMapa({ x, y }) {
    // Clicar num ponto vazio NUNCA move um marcador: só tira a seleção.
    // A única exceção é ter escolhido um local na lista "Fora do mapa" (aí o clique posiciona esse local novo).
    if (!escolhido) {
      setSelecionado(null);
      return;
    }
    if (!exigirEdicao()) return;
    if (marcadoresRef.current.some((m) => m.local_id === escolhido)) {
      setEscolhido('');
      setMensagem({ tipo: 'erro', texto: 'Esse local já está no mapa. Para mudar a posição, arraste o marcador dele.' });
      return;
    }
    setMensagem(null);
    try {
      await posicionar(escolhido, x, y);
      setMensagem({ tipo: 'ok', texto: `Salvo! "${nomeDoLocal(escolhido)?.nome}" foi posicionado.` });
      setEscolhido('');
      setParams({}, { replace: true });
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: mensagemAmigavel(erro, 'salvar a posição') });
    }
  }

  // Arrastar um marcador: acompanha o dedo/mouse na tela e SÓ SALVA AO SOLTAR (uma ação no histórico)
  function iniciarArraste(e, marcador, paraNormalizado) {
    if (!edicao) return; // com o cadeado desligado, o marcador só pode ser clicado
    if (e.button !== 0) return; // botão direito (ou toque com dois dedos no touchpad) não arrasta nada
    const alvo = e.currentTarget; // guardado agora: o React zera e.currentTarget quando o evento termina
    e.stopPropagation();
    e.preventDefault();
    try {
      alvo.setPointerCapture(e.pointerId);
    } catch (erro) {
      /* sem captura: o arrasto segue enquanto o dedo estiver sobre o marcador */
    }
    const antes = estadoDe(marcador);
    const inicio = { x: e.clientX, y: e.clientY };
    arrasteRef.current = { moveu: false };

    function mover(ev) {
      // Movimentos pequenos (menos de 5 px) não contam: um toque no touchpad não pode virar arrasto
      if (!arrasteRef.current.moveu && Math.hypot(ev.clientX - inicio.x, ev.clientY - inicio.y) < LIMITE_ARRASTO_PX) return;
      const { x, y } = paraNormalizado(ev.clientX, ev.clientY);
      arrasteRef.current.moveu = true;
      setMarcadores((lista) => lista.map((m) => (m.id === marcador.id ? { ...m, x, y } : m)));
    }
    async function soltar(ev) {
      alvo.removeEventListener('pointermove', mover);
      alvo.removeEventListener('pointerup', soltar);
      alvo.removeEventListener('pointercancel', cancelar);
      const { x, y } = paraNormalizado(ev.clientX, ev.clientY);
      const moveu = arrasteRef.current?.moveu;
      arrasteRef.current = null;
      if (moveu) {
        const depois = { ...antes, x, y };
        try {
          const { error } = await supabase.from('marcadores').update({ x, y }).eq('id', marcador.id);
          if (error) throw error;
          registrar({ tipo: 'mover', localId: marcador.local_id, nome: nomeDoLocal(marcador.local_id)?.nome || 'Local', antes, depois });
          setMensagem({ tipo: 'ok', texto: 'Salvo! Posição atualizada.' });
        } catch (erro) {
          setMensagem({ tipo: 'erro', texto: mensagemAmigavel(erro, 'salvar a posição') });
        }
        await carregar();
      }
    }
    // Se o navegador cancelar o gesto, nada é salvo e o marcador volta ao lugar
    function cancelar() {
      alvo.removeEventListener('pointermove', mover);
      alvo.removeEventListener('pointerup', soltar);
      alvo.removeEventListener('pointercancel', cancelar);
      arrasteRef.current = null;
      carregar();
    }
    alvo.addEventListener('pointermove', mover);
    alvo.addEventListener('pointerup', soltar);
    alvo.addEventListener('pointercancel', cancelar);
  }

  // Arrastar um nome da lista "Fora do mapa" até a imagem
  function iniciarArrasteDaLista(e, local) {
    if (e.button !== undefined && e.button !== 0) return;
    if (!exigirEdicao()) return;
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
        posicionar(local.id, x, y)
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

  // Tamanho: guarda o valor de antes ao começar a mexer e salva (uma ação) ao soltar
  function comecarTamanho(marcador) {
    if (tamanhoInicioRef.current === null) tamanhoInicioRef.current = marcador.tamanho;
  }
  async function terminarTamanho(marcador, valor) {
    const antesTamanho = tamanhoInicioRef.current;
    tamanhoInicioRef.current = null;
    if (antesTamanho === null || Math.abs(antesTamanho - valor) < 0.0001) return;
    const antes = { ...estadoDe(marcador), tamanho: antesTamanho };
    const depois = { ...antes, tamanho: valor };
    try {
      const { error } = await supabase.from('marcadores').update({ tamanho: valor }).eq('id', marcador.id);
      if (error) throw error;
      registrar({ tipo: 'tamanho', localId: marcador.local_id, nome: marcador.locais?.nome || 'Local', antes, depois });
      setMensagem({ tipo: 'ok', texto: 'Salvo! Tamanho atualizado.' });
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: mensagemAmigavel(erro, 'salvar o tamanho') });
    }
    await carregar();
  }

  // Como o marcador aparece: logo ou área invisível (vale para Desfazer/Refazer)
  async function mudarEstilo(marcador, novo) {
    if (!exigirEdicao()) return;
    if (marcador.estilo === novo) return;
    const antes = estadoDe(marcador);
    const depois = { ...antes, estilo: novo };
    try {
      const { error } = await supabase.from('marcadores').update({ estilo: novo }).eq('id', marcador.id);
      if (error) throw error;
      registrar({ tipo: 'estilo', localId: marcador.local_id, nome: marcador.locais?.nome || 'Local', antes, depois });
      setMensagem({
        tipo: 'ok',
        texto: novo === 'area' ? 'Salvo! Agora é uma área invisível sobre o logo que já está desenhado no mapa.' : 'Salvo! Agora o mapa mostra o logo do local.',
      });
      await carregar();
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: mensagemAmigavel(erro, 'salvar') });
    }
  }

  // Ativa ou desativa o marcador (desativar pede confirmação)
  async function alternarAtivo(marcador) {
    if (!exigirEdicao()) return;
    const desativando = marcador.ativo;
    if (desativando && !window.confirm(`Desativar "${marcador.locais?.nome}"? Ele some do mapa do site até você ativá-lo de novo.`)) return;
    const antes = estadoDe(marcador);
    const depois = { ...antes, ativo: !marcador.ativo };
    try {
      const { error } = await supabase.from('marcadores').update({ ativo: depois.ativo }).eq('id', marcador.id);
      if (error) throw error;
      registrar({ tipo: desativando ? 'desativar' : 'ativar', localId: marcador.local_id, nome: marcador.locais?.nome || 'Local', antes, depois });
      setMensagem({ tipo: 'ok', texto: desativando ? 'Salvo! Marcador desativado.' : 'Salvo! Marcador ativado.' });
      await carregar();
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: mensagemAmigavel(erro, 'salvar') });
    }
  }

  // Remove do mapa (sempre pede confirmação). O local continua cadastrado.
  async function remover(marcador) {
    if (!exigirEdicao()) return;
    if (!window.confirm(`Remover "${marcador.locais?.nome}" do mapa? O local continua cadastrado e você pode desfazer ou posicionar de novo depois.`)) return;
    const antes = estadoDe(marcador);
    try {
      const { error } = await supabase.from('marcadores').delete().eq('id', marcador.id);
      if (error) throw error;
      registrar({ tipo: 'remover', localId: marcador.local_id, nome: marcador.locais?.nome || 'Local', antes, depois: null });
      setSelecionado(null);
      setMensagem({ tipo: 'ok', texto: 'Salvo! Marcador removido do mapa. Use "Desfazer" se foi sem querer.' });
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
    <div className="editor-mapa-raiz" tabIndex={-1} onKeyDown={aoTeclar} onPointerDownCapture={focarEditor}>
      <div className="cabecalho-pagina">
        <div>
          <h1 className="titulo-pacifico" style={{ fontSize: 34 }}>Mapa</h1>
          <p className="texto-apoio">Coloque cada local no lugar certo da cidade. Use + e − para aproximar.</p>
        </div>
        <label className={`btn btn-azul${edicao ? '' : ' cartao-desativado'}`} style={{ cursor: ocupado ? 'wait' : edicao ? 'pointer' : 'not-allowed' }}>
          {ocupado ? 'Enviando…' : mapa ? 'Trocar a imagem do mapa' : 'Enviar a imagem do mapa'}
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={trocarImagem} disabled={ocupado || !edicao} style={{ display: 'none' }} />
        </label>
      </div>

      {/* Barra de ferramentas: desfazer, refazer e modo edição */}
      <div className="barra-ferramentas-mapa" role="toolbar" aria-label="Ferramentas do mapa">
        <button type="button" className="btn btn-contorno" onClick={desfazer} disabled={feitas.length === 0 || trabalhando || !mapa} title="Desfazer (Ctrl+Z)">
          <span aria-hidden="true">↶</span> Desfazer
        </button>
        <button type="button" className="btn btn-contorno" onClick={refazerAcao} disabled={refazer.length === 0 || trabalhando || !mapa} title="Refazer (Ctrl+Shift+Z)">
          <span aria-hidden="true">↷</span> Refazer
        </button>
        <button
          type="button"
          className={`modo-edicao${edicao ? ' ligado' : ''}`}
          role="switch"
          aria-checked={edicao}
          onClick={() => setEdicao((v) => !v)}
          title={edicao ? 'Clique para travar o mapa' : 'Clique para poder mexer nos marcadores'}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="4" y="11" width="16" height="10" rx="2" />
            {edicao ? <path d="M8 11V7a4 4 0 0 1 7-2.6" /> : <path d="M8 11V7a4 4 0 0 1 8 0v4" />}
          </svg>
          Modo edição: {edicao ? 'ligado' : 'desligado'}
        </button>
      </div>
      {!edicao ? (
        <p className="texto-apoio" style={{ margin: 0 }}>O mapa está travado, só para ver. Ligue o "Modo edição" para arrastar, posicionar, mudar tamanho ou remover.</p>
      ) : null}

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
            {escolhido && edicao ? (
              <div className="faixa-posicionar" role="status">
                <span><strong>Clique no mapa</strong> para posicionar "{nomeEscolhido}" (ou arraste o nome da lista até a imagem).</span>
                <button type="button" className="btn btn-contorno" onClick={() => { setEscolhido(''); setParams({}, { replace: true }); }}>Cancelar</button>
              </div>
            ) : null}
            <div ref={areaRef} className={`area-mapa-editor${escolhido && edicao ? ' pronto' : ''}`}>
              <MapaInterativo
                src={urlImagem(mapa.imagem_path)}
                alt="Mapa para posicionar os locais"
                proporcao={`${mapa.largura} / ${mapa.altura}`}
                onPontoClique={clicarMapa}
                marcadores={(ctx) => {
                  ctxMapaRef.current = ctx;
                  return marcadoresComNome.map((m) => (
                    <MarcadorMapa
                      key={m.id}
                      nome={m.locais?.nome || 'Local'}
                      logoPath={m.locais?.logo_path}
                      estilo={m.estilo}
                      className={`marcador-editor${selecionado === m.id ? ' selecionado' : ''}${edicao ? '' : ' travado'}`}
                      onPointerDown={(e) => iniciarArraste(e, m, ctx.paraNormalizado)}
                      onClick={() => setSelecionado(m.id)}
                      style={{
                        left: `${m.x * 100}%`,
                        top: `${m.y * 100}%`,
                        width: `${m.tamanho * 100}%`,
                        opacity: m.ativo ? 1 : 0.4,
                        touchAction: 'none',
                      }}
                    />
                  ));
                }}
              />
            </div>
            <p className="texto-apoio" style={{ marginTop: 10 }}>
              Toque num marcador para ver e editar. Para mover, arraste o próprio marcador (com o Modo edição ligado). Para pôr um local novo, escolha-o na lista "Fora do mapa".
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
                    disabled={!edicao}
                    className="controle-tamanho"
                    onPointerDown={() => comecarTamanho(marcadorAtual)}
                    onKeyDown={() => comecarTamanho(marcadorAtual)}
                    onChange={(e) => setMarcadores((lista) => lista.map((m) => (m.id === marcadorAtual.id ? { ...m, tamanho: Number(e.target.value) } : m)))}
                    onPointerUp={(e) => terminarTamanho(marcadorAtual, Number(e.currentTarget.value))}
                    onKeyUp={(e) => terminarTamanho(marcadorAtual, Number(e.currentTarget.value))}
                  />
                </label>

                <fieldset className="como-aparece" disabled={!edicao}>
                  <legend>Como aparece</legend>
                  <label className={`opcao-estilo${marcadorAtual.estilo === 'logo' ? ' ativa' : ''}`}>
                    <input type="radio" name="estilo-marcador" checked={marcadorAtual.estilo === 'logo'} onChange={() => mudarEstilo(marcadorAtual, 'logo')} />
                    <span><strong>Mostrar logo</strong><small>O logo do local aparece sobre o mapa.</small></span>
                  </label>
                  <label className={`opcao-estilo${marcadorAtual.estilo === 'area' ? ' ativa' : ''}`}>
                    <input type="radio" name="estilo-marcador" checked={marcadorAtual.estilo === 'area'} onChange={() => mudarEstilo(marcadorAtual, 'area')} />
                    <span><strong>Área invisível</strong><small>Para quando o logo já está desenhado no mapa. Mostra só um anel e o nome ao passar o mouse.</small></span>
                  </label>
                </fieldset>

                <Link to={`/admin/locais/${marcadorAtual.local_id}`} className="btn btn-azul botao-grande">Editar ficha completa</Link>
                <button className="btn btn-contorno botao-grande" disabled={!edicao} onClick={() => alternarAtivo(marcadorAtual)}>
                  {marcadorAtual.ativo ? 'Desativar marcador' : 'Ativar marcador'}
                </button>
                <button className="btn btn-perigo botao-grande" disabled={!edicao} onClick={() => remover(marcadorAtual)}>Remover do mapa</button>
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
                    <button
                      type="button"
                      className="btn btn-contorno item-fora-escolher"
                      onClick={() => { if (exigirEdicao()) setEscolhido(escolhido === l.id ? '' : l.id); }}
                    >
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
    </div>
  );
}
