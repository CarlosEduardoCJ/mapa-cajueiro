// Comprime a imagem no navegador antes do envio (economiza o espaço gratuito do Supabase).
import imageCompression from 'browser-image-compression';
import { supabase, BUCKET_MIDIA } from './supabase.js';

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
const LIMITE_BYTES = 5 * 1024 * 1024; // 5 MB, igual ao limite do bucket

// Reduz para no máximo 1600 px e converte para WebP.
// Com { semLimiteDeLado: true } (imagem do mapa) o tamanho em pixels NÃO é reduzido: só o peso é ajustado para caber em 5 MB.
export async function comprimirImagem(arquivo, { semLimiteDeLado = false } = {}) {
  if (!TIPOS_PERMITIDOS.includes(arquivo.type)) {
    throw new Error('Use uma imagem JPG, PNG ou WebP.');
  }
  const comprimida = await imageCompression(arquivo, {
    ...(semLimiteDeLado ? { maxSizeMB: 4.8 } : { maxWidthOrHeight: 1600 }),
    fileType: 'image/webp',
    initialQuality: 0.82,
    useWebWorker: true,
  });
  if (comprimida.size > LIMITE_BYTES) {
    throw new Error('A imagem ficou maior que 5 MB. Escolha outra.');
  }
  return comprimida;
}

// Envia a imagem para um caminho do bucket e devolve o caminho salvo
export async function enviarImagem(arquivo, caminho) {
  const pronta = await comprimirImagem(arquivo);
  const { error } = await supabase.storage
    .from(BUCKET_MIDIA)
    .upload(caminho, pronta, { upsert: true, contentType: 'image/webp' });
  if (error) throw error;
  return caminho;
}

// Gera um nome único para arquivos de fotos
export function nomeUnico() {
  return crypto.randomUUID();
}
