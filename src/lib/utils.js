// Funções auxiliares pequenas usadas em várias telas.

// Número oficial de WhatsApp do site (usado como padrão; o valor real vem da tabela configuracoes)
export const WHATSAPP_PADRAO = '5586999933162';

// Monta um link de WhatsApp com mensagem pronta
export function linkWhatsApp(numero, mensagem) {
  const n = (numero || '').replace(/\D/g, '');
  if (!n) return '';
  return `https://wa.me/${n}?text=${encodeURIComponent(mensagem)}`;
}

// Links de navegação (Google Maps e Waze) a partir da latitude/longitude reais
export function linkGoogleMaps(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
export function linkWaze(lat, lng) {
  return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
}

// Cria um identificador simples para URLs (ex.: "Pousada do Sol" -> "pousada-do-sol")
export function gerarSlug(texto) {
  return (texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// Primeira letra do nome, para o círculo quando não há logo
export function inicial(nome) {
  return (nome || '?').trim().charAt(0).toUpperCase();
}
