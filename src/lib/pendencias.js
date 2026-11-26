// "Pendências" são avisos de coisas que faltam num local. Usado na lista de locais e no início do painel.
// Não impedem nada: são só lembretes para a equipe.

// Recebe o local e o que se sabe sobre fotos e marcador no mapa; devolve os avisos em português simples
export function pendenciasDoLocal(local, { temFoto, noMapa }) {
  const avisos = [];
  if (!local.whatsapp) avisos.push('sem WhatsApp');
  if (local.latitude == null || local.longitude == null) avisos.push('sem coordenadas');
  if (!temFoto) avisos.push('sem fotos');
  if (!noMapa) avisos.push('fora do mapa');
  return avisos;
}

// Monta um mapa de "tem foto?" e "está no mapa?" a partir das listas vindas do banco
export function indicesDeLocais(fotos, marcadores) {
  const comFoto = new Set((fotos || []).map((f) => f.local_id));
  const noMapa = new Set((marcadores || []).filter((m) => m.ativo).map((m) => m.local_id));
  return { comFoto, noMapa };
}
