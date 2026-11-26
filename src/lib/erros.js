// Transforma erros técnicos em mensagens que a equipe entende (em português, sem códigos).
// O erro original continua no console do navegador para quem for investigar.
export function mensagemAmigavel(erro, acao = 'salvar') {
  const texto = String(erro?.message || erro || '').toLowerCase();
  console.warn('[painel]', erro);

  if (!navigator.onLine || texto.includes('failed to fetch') || texto.includes('network')) {
    return `Sem conexão com a internet. Confira sua conexão e tente ${acao} de novo.`;
  }
  if (texto.includes('row-level security') || texto.includes('permission denied') || texto.includes('jwt')) {
    return 'Sua conta não tem permissão para esta ação. Peça ao administrador do site.';
  }
  if (texto.includes('duplicate key') && texto.includes('slug')) {
    return 'Já existe outro cadastro com este endereço (slug). Mude o nome ou o endereço e tente de novo.';
  }
  if (texto.includes('duplicate key')) {
    return 'Este cadastro já existe. Atualize a página para ver a versão mais recente.';
  }
  if (texto.includes('exceeded') || texto.includes('too large') || texto.includes('payload')) {
    return 'O arquivo é grande demais. Escolha uma imagem menor e tente de novo.';
  }
  if (texto.includes('mime') || texto.includes('invalid file type')) {
    return 'Este tipo de arquivo não é aceito. Use JPG, PNG ou WebP.';
  }
  if (texto.includes('check constraint') || texto.includes('violates')) {
    return 'Algum campo está com um valor não aceito. Confira os dados e tente de novo.';
  }
  return `Não foi possível ${acao} agora. Tente de novo em instantes; se continuar, avise o responsável pelo site.`;
}
