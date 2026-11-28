// Mapa interativo com Leaflet (estilo Google Maps), usando os tiles de public/mapa-tiles.
// Serve ao mapa público e ao editor do painel. Os marcadores chegam com x e y "normalizados" (0 a 1, como no banco)
// e este componente converte para as coordenadas do Leaflet (ver src/lib/tiles.js).
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import { COR_FUNDO_MAPA, URL_TILES, deLatLng, limitesDoMapa, paraLatLng } from '../lib/tiles.js';
import { inicial } from '../lib/utils.js';

const ZOOM_MINIMO = 0;
const ZOOM_MAXIMO = 5;
const ZOOM_NATIVO_MAXIMO = 4; // acima disso o Leaflet estica os tiles do zoom 4
const LIMITE_ARRASTO_PX = 5; // movimentos menores que isso não contam como arrasto (toque no touchpad)

// Monta o botão do marcador (logo ou área invisível). Usa textContent para o nome nunca virar HTML.
function criarElementoMarcador({ nome, logoUrl, estilo, classe, tamanho, tabIndex }) {
  const botao = document.createElement('button');
  botao.type = 'button';
  const area = estilo === 'area';
  botao.className = `marcador${area ? ' marcador-area' : ''}${classe ? ` ${classe}` : ''}`;
  botao.setAttribute('data-marcador', 'true');
  botao.setAttribute('aria-label', nome);
  botao.title = nome;
  botao.tabIndex = tabIndex;
  // Tamanho salvo no banco (fração da largura do mapa); o CSS multiplica pela largura atual do mapa na tela
  botao.style.setProperty('--tam', String(tamanho));
  botao.addEventListener('contextmenu', (e) => e.preventDefault());

  if (area) {
    const balao = document.createElement('span');
    balao.className = 'marcador-balao';
    balao.setAttribute('aria-hidden', 'true');
    balao.textContent = nome;
    botao.appendChild(balao);
  } else if (logoUrl) {
    const img = document.createElement('img');
    img.className = 'marcador-logo';
    img.src = logoUrl;
    img.alt = '';
    img.draggable = false;
    botao.appendChild(img);
  } else {
    const pino = document.createElement('span');
    pino.className = 'marcador-pino';
    pino.textContent = inicial(nome);
    botao.appendChild(pino);
  }
  return botao;
}

// Um marcador no mapa
function MarcadorLeaflet({ m, meta, arrastavel, aoClicar, aoIniciarArraste, aoTerminarArraste }) {
  const map = useMap();
  const icone = useMemo(
    () =>
      L.divIcon({
        className: 'marcador-leaflet', // sem o estilo padrão do Leaflet (fundo branco e borda)
        iconSize: [0, 0],
        iconAnchor: [0, 0],
        html: criarElementoMarcador(m),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [m.nome, m.logoUrl, m.estilo, m.classe, m.tamanho, m.tabIndex],
  );
  return (
    <Marker
      position={paraLatLng(m.x, m.y, meta)}
      icon={icone}
      draggable={arrastavel}
      keyboard={false} // o botão de dentro já recebe o foco
      opacity={m.opacidade ?? 1}
      zIndexOffset={m.destaque ? 1000 : 0}
      eventHandlers={{
        click: () => aoClicar?.(m.id),
        dragstart: () => aoIniciarArraste?.(m.id),
        dragend: (e) => {
          const fim = e.target.getLatLng();
          // Movimento de menos de 5 px (toque no touchpad) não conta: o marcador volta ao lugar e nada é salvo
          const inicio = L.latLng(paraLatLng(m.x, m.y, meta));
          const px = map.latLngToContainerPoint(inicio).distanceTo(map.latLngToContainerPoint(fim));
          if (px < LIMITE_ARRASTO_PX) {
            e.target.setLatLng(inicio);
            return;
          }
          aoTerminarArraste?.(m.id, deLatLng(fim.lat, fim.lng, meta));
        },
      }}
    />
  );
}

// Parte interna: usa o objeto do mapa (useMap) para enquadrar, redimensionar e responder a cliques
function ControleDoMapa({ meta, limites, apiRef, aoClicarNoMapa, aoMudarZoom }) {
  const map = useMap();
  const ajusteRef = useRef(0); // zoom que mostra o mapa inteiro
  const cliqueRef = useRef(aoClicarNoMapa);
  cliqueRef.current = aoClicarNoMapa;
  const zoomRef = useRef(aoMudarZoom);
  zoomRef.current = aoMudarZoom;

  // Largura do mapa inteiro na tela (em px), usada pelo CSS para dar tamanho aos marcadores.
  // Eles crescem um pouco menos que o mapa ao aproximar (raiz quadrada), como no mapa anterior.
  const atualizarTamanho = useCallback(() => {
    const z = map.getZoom();
    const z0 = ajusteRef.current;
    const larg = meta.larguraUnidades * 2 ** z0 * 2 ** ((z - z0) / 2);
    map.getContainer().style.setProperty('--larg-mapa', `${larg}px`);
    zoomRef.current?.(z > z0 + 0.05);
  }, [map, meta]);

  useMapEvents({
    zoom: atualizarTamanho,
    zoomend: atualizarTamanho,
    // Clique num ponto vazio (cliques em marcadores não chegam aqui)
    click: (e) => cliqueRef.current?.(deLatLng(e.latlng.lat, e.latlng.lng, meta)),
  });

  // Ao montar: enquadra o mapa inteiro. Se o tamanho da área mudar (tela cheia, giro do celular), reajusta sem mover.
  useEffect(() => {
    map.invalidateSize({ animate: false });
    map.fitBounds(limites, { animate: false });
    ajusteRef.current = map.getZoom();
    atualizarTamanho();
    const el = map.getContainer();
    const observador = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
      ajusteRef.current = map.getBoundsZoom(limites);
      atualizarTamanho();
    });
    observador.observe(el);
    // Sem menu do botão direito sobre o mapa
    const bloquear = (e) => e.preventDefault();
    el.addEventListener('contextmenu', bloquear);
    return () => {
      observador.disconnect();
      el.removeEventListener('contextmenu', bloquear);
    };
  }, [map, limites, atualizarTamanho]);

  // Funções que a página pode chamar (mesmos nomes do mapa de imagem única)
  apiRef.current = {
    focarEm(x, y, escala = 2.4) {
      const alvo = Math.min(ZOOM_MAXIMO, ajusteRef.current + Math.log2(escala));
      map.flyTo(paraLatLng(x, y, meta), alvo, { duration: 0.6 });
    },
    mapaInteiro() {
      map.flyToBounds(limites, { duration: 0.5 });
    },
    obterVista() {
      return { centro: map.getCenter(), zoom: map.getZoom() };
    },
    restaurarVista(v) {
      map.flyTo(v.centro, v.zoom, { duration: 0.5 });
    },
    // Ponto da tela (clientX, clientY) -> posição normalizada do mapa (x, y de 0 a 1)
    paraNormalizado(clientX, clientY) {
      const ponto = map.mouseEventToContainerPoint({ clientX, clientY });
      const ll = map.containerPointToLatLng(ponto);
      return deLatLng(ll.lat, ll.lng, meta);
    },
  };
  return null;
}

const MapaLeaflet = forwardRef(function MapaLeaflet(
  {
    meta,
    marcadores = [],
    arrastavel = false,
    aoClicarMarcador,
    aoIniciarArraste,
    aoTerminarArraste,
    aoClicarNoMapa,
    extras = null,
    className = '',
    rotuloMapaInteiro = 'Ver mapa inteiro',
  },
  ref,
) {
  const apiRef = useRef(null);
  const [zoomado, setZoomado] = useState(false);
  const limites = useMemo(() => limitesDoMapa(meta), [meta]);

  useImperativeHandle(
    ref,
    () => ({
      focarEm: (...a) => apiRef.current?.focarEm(...a),
      mapaInteiro: () => apiRef.current?.mapaInteiro(),
      obterVista: () => apiRef.current?.obterVista(),
      restaurarVista: (v) => apiRef.current?.restaurarVista(v),
      paraNormalizado: (x, y) => apiRef.current?.paraNormalizado(x, y),
    }),
    [],
  );

  return (
    <div className={`mapa-leaflet-raiz${className ? ` ${className}` : ''}`} style={{ '--razao': meta.larguraUnidades / meta.alturaUnidades }}>
      <MapContainer
        className="mapa-leaflet"
        crs={L.CRS.Simple}
        center={[-meta.alturaUnidades / 2, meta.larguraUnidades / 2]}
        zoom={1}
        minZoom={ZOOM_MINIMO}
        maxZoom={ZOOM_MAXIMO}
        maxBounds={limites}
        maxBoundsViscosity={1}
        zoomSnap={0.25}
        zoomDelta={1}
        clickTolerance={LIMITE_ARRASTO_PX}
        zoomControl={false}
        attributionControl={false}
        style={{ background: COR_FUNDO_MAPA }}
      >
        <TileLayer
          url={URL_TILES}
          minZoom={ZOOM_MINIMO}
          maxZoom={ZOOM_MAXIMO}
          maxNativeZoom={ZOOM_NATIVO_MAXIMO}
          tileSize={256}
          noWrap
          bounds={limites}
        />
        <ControleDoMapa meta={meta} limites={limites} apiRef={apiRef} aoClicarNoMapa={aoClicarNoMapa} aoMudarZoom={setZoomado} />
        {marcadores.map((m) => (
          <MarcadorLeaflet
            key={m.chave ?? m.id}
            m={m}
            meta={meta}
            arrastavel={arrastavel}
            aoClicar={aoClicarMarcador}
            aoIniciarArraste={aoIniciarArraste}
            aoTerminarArraste={aoTerminarArraste}
          />
        ))}
        <ZoomControl position="bottomright" zoomInTitle="Aproximar" zoomOutTitle="Afastar" />
      </MapContainer>

      {extras}

      {zoomado ? (
        <button type="button" className="mapa-inteiro-botao" onClick={() => apiRef.current?.mapaInteiro()}>
          {rotuloMapaInteiro}
        </button>
      ) : null}
    </div>
  );
});

export default MapaLeaflet;
