// Mapa de rotas: quais endereços existem e qual tela cada um mostra.
import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import LayoutPublico from './components/LayoutPublico.jsx';
import Inicio from './pages/Inicio.jsx';
import MapaCidade from './pages/MapaCidade.jsx';
import Contato from './pages/Contato.jsx';
import NaoEncontrado from './pages/NaoEncontrado.jsx';

// O painel /admin só é carregado quando alguém abre essas telas (deixa o site público mais leve)
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout.jsx'));
const Login = lazy(() => import('./pages/admin/Login.jsx'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard.jsx'));
const Locais = lazy(() => import('./pages/admin/Locais.jsx'));
const LocalForm = lazy(() => import('./pages/admin/LocalForm.jsx'));
const EditorMapa = lazy(() => import('./pages/admin/EditorMapa.jsx'));

export default function App() {
  return (
    <Suspense fallback={<p style={{ padding: 48, textAlign: 'center', color: '#4A6380' }}>Carregando…</p>}>
    <Routes>
      {/* Site público: com cabeçalho e rodapé */}
      <Route element={<LayoutPublico />}>
        <Route index element={<Inicio />} />
        <Route path="mapa" element={<MapaCidade />} />
        <Route path="contato" element={<Contato />} />
        <Route path="*" element={<NaoEncontrado />} />
      </Route>

      {/* Painel administrativo (/admin) */}
      <Route path="admin/login" element={<Login />} />
      <Route path="admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="locais" element={<Locais />} />
        <Route path="locais/novo" element={<LocalForm />} />
        <Route path="locais/:id" element={<LocalForm />} />
        <Route path="mapa" element={<EditorMapa />} />
      </Route>
    </Routes>
    </Suspense>
  );
}
