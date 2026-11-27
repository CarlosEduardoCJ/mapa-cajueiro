// Mapa em "tiles" (pedaços) para o Leaflet. Os tiles ficam em public/mapa-tiles/{z}/{x}/{y}.webp
// e o arquivo meta.json diz o tamanho do mapa em "unidades" (largura 256 e altura 212,3733).
//
// No Leaflet com L.CRS.Simple: lng vai de 0 a larguraUnidades (da esquerda para a direita) e
// lat vai de -alturaUnidades a 0 (de baixo para cima). Os marcadores do banco guardam x e y
// "normalizados" (0 a 1, com 0,0 no canto superior esquerdo). A conversão é:
//   lat = -(y * alturaUnidades)      lng = x * larguraUnidades
//   x = lng / larguraUnidades        y = -lat / alturaUnidades
import { useEffect, useState } from 'react';

export const URL_TILES = '/mapa-tiles/{z}/{x}/{y}.webp';
export const URL_META = '/mapa-tiles/meta.json';
export const COR_FUNDO_MAPA = '#298FD3';

const limitar01 = (v) => Math.min(1, Math.max(0, v));

// Posição do banco (x, y de 0 a 1) -> [lat, lng] do Leaflet
export function paraLatLng(x, y, meta) {
  return [-(Number(y) * meta.alturaUnidades), Number(x) * meta.larguraUnidades];
}

// [lat, lng] do Leaflet -> posição para salvar no banco (x, y de 0 a 1)
export function deLatLng(lat, lng, meta) {
  return { x: limitar01(lng / meta.larguraUnidades), y: limitar01(-lat / meta.alturaUnidades) };
}

// Limites do mapa no formato do Leaflet: [[sul, oeste], [norte, leste]]
export function limitesDoMapa(meta) {
  return [
    [-meta.alturaUnidades, 0],
    [0, meta.larguraUnidades],
  ];
}

// Lê o meta.json uma vez só e guarda (todas as telas usam o mesmo)
let promessaMeta = null;
function carregarMeta() {
  if (!promessaMeta) {
    promessaMeta = fetch(URL_META)
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => (m && m.larguraUnidades > 0 && m.alturaUnidades > 0 ? m : null))
      .catch(() => null);
  }
  return promessaMeta;
}

// Hook: { meta, carregando }. Se o meta.json não existir ou falhar, meta fica null
// (aí as telas usam a imagem única do mapa, como antes).
export function useMetaTiles() {
  const [estado, setEstado] = useState({ meta: null, carregando: true });
  useEffect(() => {
    let vivo = true;
    carregarMeta().then((meta) => {
      if (vivo) setEstado({ meta, carregando: false });
    });
    return () => {
      vivo = false;
    };
  }, []);
  return estado;
}
