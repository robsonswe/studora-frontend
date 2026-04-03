import { createBrowserRouter } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import SimuladosPage from '@/pages/SimuladosPage';
import SimuladoDetailPage from '@/pages/SimuladoDetailPage';
import QuestaoPracticePage from '@/pages/QuestaoPracticePage';
import ProfilePage from '@/pages/ProfilePage';
import SettingsPage from '@/pages/SettingsPage';
import ProvaDetailPage from '@/pages/ProvaDetailPage';
import PerformancePage from '@/pages/PerformancePage';
import DisciplinasPage from '@/pages/DisciplinasPage';
import DisciplinaDetailPage from '@/pages/DisciplinaDetailPage';
import AdminLayout from '@/components/AdminLayout';
import ConcursosPage from '@/pages/ConcursosPage';
import ConcursoCargoDetailPage from '@/pages/ConcursoCargoDetailPage';
import DisciplinasAdminPage from '@/pages/admin/DisciplinasPage';
import ConcursosAdminPage from '@/pages/admin/ConcursosPage';
import TemasPage from '@/pages/admin/TemasPage';
import SubtemasPage from '@/pages/admin/SubtemasPage';
import QuestoesPage from '@/pages/admin/QuestoesPage';
import BancasPage from '@/pages/admin/BancasPage';
import InstituicoesPage from '@/pages/admin/InstituicoesPage';
import CargosPage from '@/pages/admin/CargosPage';
import SearchBrowsePage from '@/pages/admin/SearchBrowsePage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: '/desempenho',
        element: <PerformancePage />,
      },
      {
        path: '/simulados',
        element: <SimuladosPage />,
      },
      {
        path: '/simulados/:id',
        element: <SimuladoDetailPage />,
      },
      {
        path: '/disciplinas',
        element: <DisciplinasPage />,
      },
      {
        path: '/disciplinas/:id',
        element: <DisciplinaDetailPage />,
      },
      {
        path: '/concursos',
        element: <ConcursosPage />,
      },
      {
        path: '/concursos/:concursoId/cargos/:cargoId',
        element: <ConcursoCargoDetailPage />,
      },
      {
        path: '/provas/executar',
        element: <ProvaDetailPage />,
      },
      {
        path: '/praticar',
        element: <QuestaoPracticePage />,
      },
      {
        path: '/perfil',
        element: <ProfilePage />,
      },
      {
        path: '/configuracoes',
        element: <SettingsPage />,
      },
    ],
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      {
        index: true,
        element: <QuestoesPage />,
      },
      {
        path: 'disciplinas',
        element: <DisciplinasAdminPage />,
      },
      {
        path: 'concursos',
        element: <ConcursosAdminPage />,
      },
      {
        path: 'temas',
        element: <TemasPage />,
      },
      {
        path: 'subtemas',
        element: <SubtemasPage />,
      },
      {
        path: 'questoes',
        element: <QuestoesPage />,
      },
      {
        path: 'bancas',
        element: <BancasPage />,
      },
      {
        path: 'instituicoes',
        element: <InstituicoesPage />,
      },
      {
        path: 'cargos',
        element: <CargosPage />,
      },
      {
        path: 'buscar',
        element: <SearchBrowsePage />,
      },
    ],
  },
]);