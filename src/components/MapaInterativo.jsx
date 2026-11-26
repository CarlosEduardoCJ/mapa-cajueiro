// Mapa com zoom e arrasto (mouse, dedo e roda do mouse), usado no site público e no editor do painel.
// Não usa biblioteca externa: o zoom é um "transform" do CSS, que o celular desenha com a placa de vídeo.
//
// Como funciona, em resumo:
// - A "camada" guarda a posição e o zoom (tx, ty, s). Mexer nela é só trocar o transform.
// - Os marcadores ficam DENTRO da camada, com posição em % da imagem. Por isso acompanham o zoom.
// - Durante o arrasto não há animação (resposta imediata). Nos botões e ao clicar num marcador, há transição suave.
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

const ESCALA_MIN = 1; // mapa inteiro
const ESCALA_MAX = 4; // máximo de aproximação
const LIMITE_ARRASTO_PX = 6; // movimento menor que isso ainda conta como toque
const DURACAO_ANIMACAO_MS = 450;

// Mantém o zoom entre 1x e 4x e impede que a imagem saia das bordas
function limitarVista(v, largura, altura) {
  const s = Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, v.s));
  const tx = Math.min(0, Math.max(largura * (1 - s), v.tx));
  const ty = Math.min(0, Math.max(altura * (1 - s), v.ty));
  return { s, tx, ty };
}

// Prende o ponteiro ao elemento (o arrasto continua mesmo se o dedo sair da área). Erro aqui não pode quebrar o gesto.
function capturarPonteiro(elemento, id) {
  try {
    elemento.setPointerCapture(id);
  } catch (e) {
    /* ponteiro já não está ativo: segue sem captura */
  }
}

function distancia(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

const MapaInterativo = forwardRef(function MapaInterativo(
  { src, alt = '', proporcao = '3 / 2', marcadores, onPontoClique },
  ref,
) {
  const contRef = useRef(null); // área visível do mapa (com as bordas)
  const camadaRef = useRef(null); // parte que se move e dá zoom
  const vistaRef = useRef({ s: 1, tx: 0, ty: 0 }); // posição e zoom atuais
  const ponteiros = useRef(new Map()); // dedos/mouse pressionados agora
  const gestoRef = useRef(null); // o que está sendo feito: arrastar ou pinçar
  const arrastouRef = useRef(false); // true se houve arrasto (então o clique em logo é ignorado)
  const ultimoToqueRef = useRef(null); // para detectar toque duplo no celular
  const escalaAnteriorRef = useRef(1);
  const [escalaAtual, setEscalaAtual] = useState(1); // só para desativar os botões + e −

  // Pega largura e altura reais da área do mapa
  function medidas() {
    const c = contRef.current;
    return { largura: c.clientWidth, altura: c.clientHeight };
  }

  // Aplica uma posição e zoom na tela. "animar" liga a transição suave.
  function aplicar(v, animar) {
    const camada = camadaRef.current;
    const cont = contRef.current;
    if (!camada || !cont) return;
    const { largura, altura } = medidas();
    const limpa = limitarVista(v, largura, altura);
    camada.style.transition = animar ? `transform ${DURACAO_ANIMACAO_MS}ms cubic-bezier(.2,.7,.2,1)` : 'none';
    camada.style.transform = `translate(${limpa.tx}px, ${limpa.ty}px) scale(${limpa.s})`;
    // Marcadores encolhem um pouco ao aproximar, para não cobrir o mapa inteiro
    cont.style.setProperty('--k', String(1 / Math.sqrt(limpa.s)));
    vistaRef.current = limpa;
    if (limpa.s !== escalaAnteriorRef.current) {
      escalaAnteriorRef.current = limpa.s;
      setEscalaAtual(limpa.s);
    }
  }

  // Ponto dentro da área do mapa, em pixels (a partir do canto superior esquerdo)
  function pontoLocal(clientX, clientY) {
    const r = contRef.current.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  }

  // Ponto em coordenadas da IMAGEM (0 a 1), levando em conta o zoom atual
  function pontoNormalizado(clientX, clientY) {
    const p = pontoLocal(clientX, clientY);
    const { largura, altura } = medidas();
    const v = vistaRef.current;
    const x = (p.x - v.tx) / v.s / largura;
    const y = (p.y - v.ty) / v.s / altura;
    return { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) };
  }

  // Aproxima ou afasta mantendo o ponto (px, py) parado na tela
  function zoomEm(px, py, fator, animar) {
    const v = vistaRef.current;
    const s2 = Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, v.s * fator));
    if (s2 === v.s) return;
    const k = s2 / v.s;
    aplicar({ s: s2, tx: px - (px - v.tx) * k, ty: py - (py - v.ty) * k }, animar);
  }

  // Zoom no centro do mapa (botões + e −)
  function zoomBotao(fator) {
    const { largura, altura } = medidas();
    zoomEm(largura / 2, altura / 2, fator, true);
  }

  // Volta ao mapa inteiro
  function mapaInteiro() {
    aplicar({ s: 1, tx: 0, ty: 0 }, true);
  }

  // Centraliza um ponto (x, y da imagem, 0 a 1) com zoom
  function focarEm(x, y, escala = 2.4) {
    const { largura, altura } = medidas();
    const s = Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, escala));
    aplicar({ s, tx: largura / 2 - x * largura * s, ty: altura / 2 - y * altura * s }, true);
  }

  // Deixa o componente de fora controlar o zoom (ex.: clicar num logo)
  useImperativeHandle(ref, () => ({
    focarEm,
    mapaInteiro,
    obterVista: () => ({ ...vistaRef.current }),
    restaurarVista: (v) => aplicar(v, true),
  }));

  // Ao montar: posiciona no mapa inteiro. Se o tamanho da tela mudar, reajusta.
  useEffect(() => {
    aplicar(vistaRef.current, false);
    const observador = new ResizeObserver(() => aplicar(vistaRef.current, false));
    observador.observe(contRef.current);
    return () => observador.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Roda do mouse: precisa de listener "não passivo" para impedir a rolagem da página
  useEffect(() => {
    const el = contRef.current;
    function aoRolar(e) {
      e.preventDefault();
      const p = pontoLocal(e.clientX, e.clientY);
      zoomEm(p.x, p.y, Math.exp(-e.deltaY * 0.0015), false);
    }
    el.addEventListener('wheel', aoRolar, { passive: false });
    return () => el.removeEventListener('wheel', aoRolar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function iniciarArrasto(x, y) {
    gestoRef.current = { tipo: 'arrasto', x0: x, y0: y, v0: { ...vistaRef.current }, moveu: false };
  }

  // Dois dedos: guarda o ponto do meio para o zoom acontecer ali
  function iniciarPinca() {
    const [a, b] = [...ponteiros.current.values()];
    const meio = pontoLocal((a.x + b.x) / 2, (a.y + b.y) / 2);
    const v = vistaRef.current;
    gestoRef.current = {
      tipo: 'pinca',
      d0: distancia(a, b),
      v0: { ...v },
      meio0: meio,
      conteudo: { x: (meio.x - v.tx) / v.s, y: (meio.y - v.ty) / v.s },
    };
    arrastouRef.current = true;
  }

  function aoPressionar(e) {
    // Pressionar em um marcador ou em um botão (+, −, ver inteiro) não inicia arrasto do mapa
    if (e.target.closest('button')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    ponteiros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    capturarPonteiro(contRef.current, e.pointerId);
    if (ponteiros.current.size === 1) {
      arrastouRef.current = false;
      iniciarArrasto(e.clientX, e.clientY);
    } else if (ponteiros.current.size === 2) {
      iniciarPinca();
    }
  }

  function aoMover(e) {
    if (!ponteiros.current.has(e.pointerId)) return;
    ponteiros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gestoRef.current;
    if (!g) return;

    if (g.tipo === 'arrasto') {
      const dx = e.clientX - g.x0;
      const dy = e.clientY - g.y0;
      if (!g.moveu && Math.abs(dx) + Math.abs(dy) < LIMITE_ARRASTO_PX) return;
      g.moveu = true;
      arrastouRef.current = true;
      aplicar({ s: g.v0.s, tx: g.v0.tx + dx, ty: g.v0.ty + dy }, false);
    } else if (g.tipo === 'pinca' && ponteiros.current.size >= 2) {
      const [a, b] = [...ponteiros.current.values()];
      const meio = pontoLocal((a.x + b.x) / 2, (a.y + b.y) / 2);
      const s2 = g.v0.s * (distancia(a, b) / g.d0);
      // O ponto do meio dos dedos continua embaixo dos dedos (zoom e arrasto juntos)
      aplicar({ s: s2, tx: meio.x - g.conteudo.x * s2, ty: meio.y - g.conteudo.y * s2 }, false);
    }
  }

  function aoSoltar(e, cancelado) {
    if (!ponteiros.current.has(e.pointerId)) return;
    ponteiros.current.delete(e.pointerId);

    // Se sobrou um dedo depois de pinçar, volta a arrastar com ele
    if (ponteiros.current.size === 1) {
      const [restante] = ponteiros.current.values();
      iniciarArrasto(restante.x, restante.y);
    }
    if (ponteiros.current.size === 0) {
      const g = gestoRef.current;
      gestoRef.current = null;
      // Toque duplo no celular (dois toques rápidos no mesmo lugar) aproxima
      if (!cancelado && e.pointerType === 'touch' && g && g.tipo === 'arrasto' && !g.moveu) {
        const agora = Date.now();
        const anterior = ultimoToqueRef.current;
        if (anterior && agora - anterior.t < 350 && distancia(anterior, { x: e.clientX, y: e.clientY }) < 30) {
          const p = pontoLocal(e.clientX, e.clientY);
          zoomEm(p.x, p.y, 2, true);
          ultimoToqueRef.current = null;
        } else {
          ultimoToqueRef.current = { t: agora, x: e.clientX, y: e.clientY };
        }
      }
    }
  }

  // Duplo clique com mouse aproxima no ponto clicado
  function aoDuploClique(e) {
    if (e.target.closest('button')) return;
    const p = pontoLocal(e.clientX, e.clientY);
    zoomEm(p.x, p.y, 2, true);
  }

  // Se o usuário acabou de arrastar, o "clique" que vem depois é ignorado
  function aoClicarCapturado(e) {
    if (arrastouRef.current) {
      e.stopPropagation();
      e.preventDefault();
    }
  }

  // Clique no fundo do mapa (não num marcador)
  function aoClicar(e) {
    if (e.target.closest('button')) return;
    if (!onPontoClique) return;
    onPontoClique(pontoNormalizado(e.clientX, e.clientY));
  }

  return (
    <div
      ref={contRef}
      className="mapa-area"
      style={{ aspectRatio: proporcao }}
      onPointerDown={aoPressionar}
      onPointerMove={aoMover}
      onPointerUp={(e) => aoSoltar(e, false)}
      onPointerCancel={(e) => aoSoltar(e, true)}
      onDoubleClick={aoDuploClique}
      onClickCapture={aoClicarCapturado}
      onClick={aoClicar}
      onDragStart={(e) => e.preventDefault()}
    >
      <div ref={camadaRef} className="mapa-camada">
        <img src={src} alt={alt} draggable={false} />
        {marcadores ? marcadores({ paraNormalizado: pontoNormalizado }) : null}
      </div>

      <div className="mapa-controles">
        <button type="button" aria-label="Aproximar" onClick={() => zoomBotao(1.6)} disabled={escalaAtual >= ESCALA_MAX}>+</button>
        <button type="button" aria-label="Afastar" onClick={() => zoomBotao(1 / 1.6)} disabled={escalaAtual <= ESCALA_MIN}>−</button>
      </div>
      {escalaAtual > ESCALA_MIN ? (
        <button type="button" className="mapa-inteiro-botao" onClick={mapaInteiro}>
          Ver mapa inteiro
        </button>
      ) : null}
    </div>
  );
});

export default MapaInterativo;
