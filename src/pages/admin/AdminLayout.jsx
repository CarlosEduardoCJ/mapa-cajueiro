// Moldura do painel /admin: menu lateral e proteção de rota.
// Quem não entrou vai para o login; quem entrou sem perfil liberado vê um aviso.
import { Link, NavLink, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext.jsx';

export default function AdminLayout() {
  const { sessao, perfil, carregando, podeUsar, sair } = useAuth();

  if (carregando) {
    return <p style={{ padding: 48, textAlign: 'center', color: '#4A6380' }}>Carregando…</p>;
  }
  if (!sessao) {
    return <Navigate to="/admin/login" replace />;
  }
  if (!perfil) {
    return (
      <div style={{ maxWidth: 520, margin: '64px auto', padding: 20 }}>
        <div className="aviso aviso-erro" style={{ marginBottom: 16 }}>
          Sua conta não tem acesso ao painel (ou está desativada). Peça ao administrador do site.
        </div>
        <button className="btn btn-azul" onClick={sair}>Sair</button>
      </div>
    );
  }

  const linkMenu = ({ isActive }) => (isActive ? 'ativo' : '');

  return (
    <div>
      <div style={{ background: '#fff', borderBottom: '1px solid #CFE0F5', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <strong style={{ color: '#1A5FB4', fontFamily: 'Pacifico, cursive', fontWeight: 400, fontSize: 22 }}>Painel do Mapa</strong>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 14, color: '#4A6380' }}>{perfil.nome || sessao.user.email}</span>
          <Link to="/" className="btn btn-contorno" style={{ minHeight: 40 }}>Ver o site</Link>
          <button className="btn btn-azul" style={{ minHeight: 40 }} onClick={sair}>Sair</button>
        </div>
      </div>

      <div className="admin-layout">
        <nav className="admin-menu" aria-label="Painel">
          <NavLink to="/admin" end className={linkMenu}>Início</NavLink>
          {podeUsar('locais') ? <NavLink to="/admin/locais" className={linkMenu}>Locais</NavLink> : null}
          {podeUsar('mapa') ? <NavLink to="/admin/mapa" className={linkMenu}>Mapa e marcadores</NavLink> : null}
          {podeUsar('categorias') || podeUsar('traducoes') ? (
            <NavLink to="/admin/categorias" className={linkMenu}>Categorias e nomes</NavLink>
          ) : null}
        </nav>
        <div className="admin-conteudo">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
