// Lê latitude e longitude a partir de um link ou texto do Google Maps (ou de coordenadas coladas).
// Não acessa a internet: links curtos (maps.app.goo.gl / goo.gl) precisam ser abertos no navegador
// e o endereço completo copiado, porque o site não consegue seguir o redirecionamento.

function valida(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
    ? { lat, lng }
    : null;
}

// Devolve { lat, lng }, ou { erro: 'mensagem' } quando não conseguir
export function lerLinkGoogleMaps(texto) {
  const t = (texto || '').trim();
  if (!t) return { erro: 'Cole o link ou as coordenadas primeiro.' };

  // Coordenadas soltas: "-2.9312, -41.3432" ou "-2,9312 -41,3432"
  let m = t.match(/^(-?\d+[.,]\d+)\s*[,;]?\s+(-?\d+[.,]\d+)$/) || t.match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/);
  if (m) {
    const r = valida(Number(m[1].replace(',', '.')), Number(m[2].replace(',', '.')));
    if (r) return r;
  }

  // Link completo: "...maps/place/.../@-2.93,-41.34,17z" ou "!3d-2.93!4d-41.34"
  m = t.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || t.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || t.match(/[?&](?:q|ll|query|destination)=(-?\d+\.\d+)(?:,|%2C)(-?\d+\.\d+)/i);
  if (m) {
    const r = valida(Number(m[1]), Number(m[2]));
    if (r) return r;
  }

  if (/goo\.gl|maps\.app/i.test(t)) {
    return { erro: 'Este é um link curto. Abra o link no navegador, espere o mapa carregar, copie o endereço completo da barra e cole aqui.' };
  }
  return { erro: 'Não encontrei a localização nesse texto. Copie o link completo do Google Maps ou escreva a latitude e a longitude.' };
}
