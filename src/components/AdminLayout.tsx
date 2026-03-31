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
  X,
} from 'lucide-react';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

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
          className="fixed inset-0 z-40 bg-black/50 lg:hidden animate-backdrop"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 border-r border-slate-800 flex flex-col`}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg shrink-0">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-semibold text-white/90 tracking-[-0.02em] whitespace-nowrap">Studora Admin</h1>
          </div>
          <button 
            className="lg:hidden text-slate-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 shrink-0"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <nav className="mt-5 px-3 flex-1 overflow-y-auto overflow-x-hidden scrollbar-transparent">
          <Link 
            to="/" 
            className="flex items-center px-3 py-2 mb-4 text-sm font-medium rounded-lg text-slate-400/70 hover:bg-white/[0.04] hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 transition-colors whitespace-nowrap overflow-hidden"
          >
            <ArrowLeft className="mr-3 h-5 w-5 shrink-0 text-slate-500" />
            Voltar ao App
          </Link>
          
          <div className="pt-1 pb-1.5 px-3 text-xs font-semibold text-slate-500/70 uppercase tracking-wider">
            Gerenciamento de Dados
          </div>

          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              
              return (
                <Link 
                  key={item.path}
                  to={item.path} 
                  className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 ${
                    isActive 
                      ? 'bg-indigo-500/[0.07] text-indigo-400 border-l-[3px] border-amber-400/80' 
                      : 'text-slate-400/80 hover:bg-white/[0.04] hover:text-slate-200 border-l-[3px] border-transparent'
                  }`}
                >
                  <Icon className={`mr-3 h-5 w-5 shrink-0 ${isActive ? 'text-indigo-400/90' : 'text-slate-500/70'}`} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User profile */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center rounded-lg p-2">
            <div className="w-8 h-8 rounded-full bg-indigo-600/50 flex items-center justify-center text-indigo-200 font-medium text-xs shrink-0">
              AD
            </div>
            <div className="ml-3 min-w-0">
              <p className="text-xs font-medium text-white/80 truncate">Administrador</p>
              <p className="text-xs text-slate-500/60 truncate">Painel de Controle</p>
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
