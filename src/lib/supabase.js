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

// Monta o endereço público de uma imagem guardada no bucket "midia"
export function urlImagem(caminho) {
  if (!caminho || !url) return '';
  return `${url}/storage/v1/object/public/${BUCKET_MIDIA}/${caminho}`;
}
