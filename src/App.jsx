// Mapa de rotas: quais endereços existem e qual tela cada um mostra.
// Site público: /pt, /en, /es (e /pt/mapa, /en/mapa…). O painel /admin fica só em português.
import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import LayoutPublico from './components/LayoutPublico.jsx';
import EntradaIdioma from './pages/EntradaIdioma.jsx';
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
const Categorias = lazy(() => import('./pages/admin/Categorias.jsx'));

export default function App() {
  return (
    <Suspense fallback={<p style={{ padding: 48, textAlign: 'center', color: '#4A6380' }}>Carregando…</p>}>
      <Routes>
        {/* Raiz: tela de escolha de idioma (ou vai direto para o idioma já escolhido) */}
        <Route index element={<EntradaIdioma />} />

        {/* Site público com idioma no endereço: /pt, /en, /es */}
        <Route path=":lang" element={<LayoutPublico />}>
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
          <Route path="categorias" element={<Categorias />} />
        </Route>

        <Route path="*" element={<NaoEncontrado />} />
      </Routes>
    </Suspense>
  );
}
