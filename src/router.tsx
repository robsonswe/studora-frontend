import { createBrowserRouter } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import DisciplinasPage from '@/pages/DisciplinasPage';
import ConcursosPage from '@/pages/ConcursosPage';
import TemasPage from '@/pages/TemasPage';
import SubtemasPage from '@/pages/SubtemasPage';
import QuestoesPage from '@/pages/QuestoesPage';
import BancasPage from '@/pages/BancasPage';
import InstituicoesPage from '@/pages/InstituicoesPage';
import CargosPage from '@/pages/CargosPage';
import SimuladosPage from '@/pages/SimuladosPage';
import SimuladoDetailPage from '@/pages/SimuladoDetailPage';
import QuestaoPracticePage from '@/pages/QuestaoPracticePage';
import SearchBrowsePage from '@/pages/SearchBrowsePage';
import ProfilePage from '@/pages/ProfilePage';
import SettingsPage from '@/pages/SettingsPage';

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
        path: '/disciplinas',
        element: <DisciplinasPage />,
      },
      {
        path: '/concursos',
        element: <ConcursosPage />,
      },
      {
        path: '/temas',
        element: <TemasPage />,
      },
      {
        path: '/subtemas',
        element: <SubtemasPage />,
      },
      {
        path: '/questoes',
        element: <QuestoesPage />,
      },
      {
        path: '/bancas',
        element: <BancasPage />,
      },
      {
        path: '/instituicoes',
        element: <InstituicoesPage />,
      },
      {
        path: '/cargos',
        element: <CargosPage />,
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
        path: '/praticar',
        element: <QuestaoPracticePage />,
      },
      {
        path: '/buscar',
        element: <SearchBrowsePage />,
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
]);