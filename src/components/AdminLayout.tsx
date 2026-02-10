import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2, 
  Gavel, 
  FileText, 
  Briefcase, 
  BookOpen, 
  Tag, 
  Tags, 
  Search, 
  Settings,
  ArrowLeft,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const navItems = [
    { label: 'Instituições', path: '/admin/instituicoes', icon: Building2 },
    { label: 'Bancas', path: '/admin/bancas', icon: Gavel },
    { label: 'Concursos', path: '/admin/concursos', icon: FileText },
    { label: 'Cargos', path: '/admin/cargos', icon: Briefcase },
    { label: 'Disciplinas', path: '/admin/disciplinas', icon: BookOpen },
    { label: 'Temas', path: '/admin/temas', icon: Tag },
    { label: 'Subtemas', path: '/admin/subtemas', icon: Tags },
    { label: 'Questões', path: '/admin/questoes', icon: LayoutDashboard },
    { label: 'Buscar e Explorar', path: '/admin/buscar', icon: Search },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900 bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 border-r border-slate-800`}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">Studora Admin</h1>
          </div>
          <button 
            className="lg:hidden text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <nav className="mt-6 px-3 space-y-1">
          <Link 
            to="/" 
            className="flex items-center px-3 py-2 text-sm font-medium rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="mr-3 h-5 w-5" />
            Voltar ao App
          </Link>
          
          <div className="pb-2 px-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
            Gerenciamento de Dados
          </div>

          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.path}
                to={item.path} 
                className={`flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  isActive 
                    ? 'bg-indigo-600/10 text-indigo-400' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center">
                  <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                  {item.label}
                </div>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-slate-800">
          <div className="flex items-center p-2 rounded-lg bg-slate-800/50">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-xs">
              AD
            </div>
            <div className="ml-3 min-w-0">
              <p className="text-xs font-bold text-white truncate">Administrador</p>
              <p className="text-[10px] text-slate-500 truncate">Painel de Controle</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-sm z-10">
          <div className="flex items-center">
            <button 
              className="mr-4 text-slate-500 lg:hidden hover:bg-slate-100 p-1 rounded-md"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center text-sm text-slate-500 font-medium">
              <span>Admin</span>
              <ChevronRight className="w-4 h-4 mx-2 text-slate-300" />
              <span className="text-slate-900">
                {navItems.find(i => i.path === location.pathname)?.label || 'Dashboard'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
              Modo Edição
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;