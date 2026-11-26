// Guarda quem está logado no /admin, o perfil (admin ou editor) e os módulos liberados.
// Atenção: isto só controla a TELA. A proteção de verdade é o banco (RLS).
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [sessao, setSessao] = useState(null);
  const [perfil, setPerfil] = useState(null); // linha da tabela perfis
  const [modulos, setModulos] = useState([]); // módulos liberados (para editores)
  const [carregando, setCarregando] = useState(true);

  // Busca o perfil e as permissões de quem está logado
  async function carregarPerfil(usuario) {
    if (!usuario) {
      setPerfil(null);
      setModulos([]);
      return;
    }
    const { data: p } = await supabase
      .from('perfis')
      .select('id, nome, papel, ativo')
      .eq('id', usuario.id)
      .maybeSingle();
    const { data: perms } = await supabase
      .from('permissoes_editor')
      .select('modulo')
      .eq('perfil_id', usuario.id);
    setPerfil(p && p.ativo ? p : null);
    setModulos((perms || []).map((x) => x.modulo));
  }

  useEffect(() => {
    if (!supabase) {
      setCarregando(false);
      return;
    }
    supabase.auth.getSession().then(async ({ data }) => {
      setSessao(data.session);
      await carregarPerfil(data.session?.user);
      setCarregando(false);
    });
    const { data: escuta } = supabase.auth.onAuthStateChange(async (_evento, nova) => {
      setSessao(nova);
      await carregarPerfil(nova?.user);
    });
    return () => escuta.subscription.unsubscribe();
  }, []);

  // Admin pode tudo; editor só os módulos liberados
  function podeUsar(modulo) {
    if (!perfil) return false;
    if (perfil.papel === 'admin') return true;
    return modulos.includes(modulo);
  }

  async function sair() {
    await supabase.auth.signOut();
  }

  const valor = { sessao, perfil, carregando, podeUsar, sair };
  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
