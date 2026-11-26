// Conexão com o Supabase (banco, login e armazenamento de imagens).
// As chaves ficam em .env.local (na Vercel, nas variáveis de ambiente do projeto).
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const chave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Se a configuração faltar, mostramos um aviso claro em vez de uma tela quebrada.
export const configuracaoOk = Boolean(url && chave);

export const supabase = configuracaoOk ? createClient(url, chave) : null;

// Nome do bucket de imagens (criado no banco pelas migrações)
export const BUCKET_MIDIA = 'midia';

// Monta o endereço de uma imagem.
// - Caminho que começa com "/" é um arquivo do próprio site (pasta public), ex.: /demo/mapa.jpg
// - Caminho sem "/" é uma imagem guardada no bucket "midia" do Supabase, ex.: locais/<id>/logo.webp
export function urlImagem(caminho) {
  if (!caminho) return '';
  if (caminho.startsWith('/')) return caminho;
  if (!url) return '';
  return `${url}/storage/v1/object/public/${BUCKET_MIDIA}/${caminho}`;
}
