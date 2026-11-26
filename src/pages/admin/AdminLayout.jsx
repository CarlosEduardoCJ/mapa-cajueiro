// Moldura do painel /admin: cabeçalho, menu lateral agrupado (com ícones) e proteção de rota.
// No celular, o menu vira um botão que abre e fecha. Quem não entrou vai para o login.
import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext.jsx';

// Ícones de traço do menu (SVG, sem emoji)
const ICONES = {
  inicio: <path d="M3 11l9-7 9 7M5 10v10h14V10" />,
  locais: <><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  mapa: <><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" /><path d="M9 4v14M15 6v14" /></>,
  categorias: <><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="8" rx="2" /><rect x="3" y="13" width="8" height="8" rx="2" /><rect x="13" y="13" width="8" height="8" rx="2" /></>,
  eventos: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  noticias: <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M7 9h10M7 13h10M7 17h6" /></>,
  pagina: <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M3 9h18M9 20V9" /></>,
  sobre: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></>,
  config: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" /></>,
  usuarios: <><circle cx="9" cy="8" r="4" /><path d="M2 21c0-4 3-6 7-6s7 2 7 6M16 4a4 4 0 0 1 0 8M22 21c0-3-1.5-5-4-6" /></>,
  historico: <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v4h4M12 7v5l3 2" /></>,
  backup: <><path d="M12 3v12M7 10l5 5 5-5M4 19h16" /></>,
  sair: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  fechar: <><path d="M6 6l12 12M18 6L6 18" /></>,
};

function Icone({ nome }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONES[nome]}
    </svg>
  );
}

export default function AdminLayout() {
  const { sessao, perfil, carregando, podeUsar, sair } = useAuth();
  const { pathname } = useLocation();
  const [menuAberto, setMenuAberto] = useState(false); // só usado no celular

  // Fecha o menu do celular ao trocar de tela
  useEffect(() => {
    setMenuAberto(false);
  }, [pathname]);

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
          Sua conta não tem acesso ao painel, ou ela está desativada. Peça ao administrador do site.
        </div>
        <button className="btn btn-azul" onClick={sair}>Sair</button>
      </div>
    );
  }

  const admin = perfil.papel === 'admin';

  // Grupos e itens do menu. Cada item só aparece se a conta puder usar aquele módulo.
  const grupos = [
    {
      titulo: 'Conteúdo',
      itens: [
        { to: '/admin/locais', rotulo: 'Locais', icone: 'locais', ok: podeUsar('locais') },
        { to: '/admin/mapa', rotulo: 'Mapa', icone: 'mapa', ok: podeUsar('mapa') },
        { to: '/admin/categorias', rotulo: 'Categorias', icone: 'categorias', ok: podeUsar('categorias') || podeUsar('traducoes') },
        { to: '/admin/eventos', rotulo: 'Eventos', icone: 'eventos', ok: podeUsar('eventos') },
        { to: '/admin/noticias', rotulo: 'Notícias', icone: 'noticias', ok: podeUsar('noticias') },
      ],
    },
    {
      titulo: 'Site',
      itens: [
        { to: '/admin/inicio', rotulo: 'Página inicial', icone: 'pagina', ok: podeUsar('inicio') },
        { to: '/admin/sobre', rotulo: 'Sobre a cidade', icone: 'sobre', ok: podeUsar('configuracoes') },
        { to: '/admin/configuracoes', rotulo: 'Configurações', icone: 'config', ok: podeUsar('configuracoes') },
      ],
    },
    {
      titulo: 'Administração',
      itens: [
        { to: '/admin/usuarios', rotulo: 'Pessoas e acessos', icone: 'usuarios', ok: admin },
        { to: '/admin/historico', rotulo: 'Histórico', icone: 'historico', ok: admin },
        { to: '/admin/backup', rotulo: 'Cópia de segurança', icone: 'backup', ok: admin },
      ],
    },
  ];

  return (
    <div>
      <header className="admin-topo">
        <button className="admin-botao-menu" onClick={() => setMenuAberto((v) => !v)} aria-expanded={menuAberto} aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}>
          <Icone nome={menuAberto ? 'fechar' : 'menu'} />
        </button>
        <Link to="/admin" className="admin-marca">
          <img src="/imagens/logo.png" alt="" />
          <span>Painel do Mapa</span>
        </Link>
        <div className="admin-topo-direita">
          <span className="admin-usuario">{perfil.nome || sessao.user.email}</span>
          <a href="/pt" target="_blank" rel="noopener" className="btn btn-contorno admin-btn-pequeno">Ver o site</a>
          <button className="btn btn-azul admin-btn-pequeno" onClick={sair}>Sair</button>
        </div>
      </header>

      <div className="admin-corpo">
        {menuAberto ? <div className="admin-sombra" onClick={() => setMenuAberto(false)} aria-hidden="true" /> : null}

        <nav className={`admin-navegacao${menuAberto ? ' aberto' : ''}`} aria-label="Menu do painel">
          {grupos.map((g) => {
            const visiveis = g.itens.filter((i) => i.ok);
            if (!visiveis.length) return null;
            return (
              <div key={g.titulo} className="admin-menu-grupo">
                <p className="admin-menu-titulo">{g.titulo}</p>
                {visiveis.map((i) => (
                  <NavLink key={i.to} to={i.to} className={({ isActive }) => `admin-menu-item${isActive ? ' ativo' : ''}`}>
                    <Icone nome={i.icone} />
                    {i.rotulo}
                  </NavLink>
                ))}
              </div>
            );
          })}
          <button className="admin-menu-item admin-menu-sair" onClick={sair}>
            <Icone nome="sair" />
            Sair da conta
          </button>
        </nav>

        <main className="admin-conteudo">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
