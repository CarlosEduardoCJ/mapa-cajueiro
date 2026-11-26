// Tela de login do painel (/admin/login). A senha vai direto ao Supabase, nunca passa pelo chat.
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase, configuracaoOk } from '../../lib/supabase.js';
import { useAuth } from '../../lib/AuthContext.jsx';

export default function Login() {
  const { sessao, carregando } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  if (!configuracaoOk) {
    return <p className="aviso aviso-erro" style={{ margin: 24 }}>Falta configurar o banco (variáveis VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY).</p>;
  }
  if (!carregando && sessao) {
    return <Navigate to="/admin" replace />;
  }

  async function entrar(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    setEnviando(false);
    if (error) {
      setErro('E-mail ou senha incorretos.');
      return;
    }
    navigate('/admin', { replace: true });
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#DDEEFC' }}>
      <form onSubmit={entrar} className="cartao" style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <img src="/imagens/logo.png" alt="Mapa Cajueiro" style={{ width: '100%', maxWidth: 260, margin: '0 auto' }} />
        <h1 className="titulo-pacifico" style={{ textAlign: 'center', fontSize: 30 }}>Área da equipe</h1>

        <label className="campo">
          E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
        </label>
        <label className="campo">
          Senha
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required autoComplete="current-password" />
        </label>

        {erro ? <div className="aviso aviso-erro">{erro}</div> : null}

        <button type="submit" className="btn btn-azul" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
