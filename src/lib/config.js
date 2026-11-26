// Lê o número oficial de WhatsApp da tabela "configuracoes" (não fica fixo no código).
import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';

export function useWhatsAppSuporte() {
  const [numero, setNumero] = useState('');

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'whatsapp_suporte')
      .maybeSingle()
      .then(({ data }) => {
        if (typeof data?.valor === 'string') setNumero(data.valor);
      });
  }, []);

  return numero;
}
