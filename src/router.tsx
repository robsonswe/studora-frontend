import { createBrowserRouter } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import DisciplinasPage from '@/pages/DisciplinasPage';
import ConcursosPage from '@/pages/ConcursosPage';
import TemasPage from '@/pages/TemasPage';
import SubtemasPage from '@/pages/SubtemasPage';
import QuestoesPage from '@/pages/QuestoesPage';
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