import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Settings,
  Menu,
  X,
  User,
  TrendingUp,
  FolderOpen,
  FileText,
  FileQuestion,
} from 'lucide-react';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Simulados', path: '/simulados', icon: ClipboardList },
    { label: 'Disciplinas', path: '/disciplinas', icon: FolderOpen },
    { label: 'Concursos', path: '/concursos', icon: FileText },
    { label: 'Praticar', path: '/praticar', icon: FileQuestion },
    { label: 'Desempenho', path: '/desempenho', icon: TrendingUp },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden animate-backdrop"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-indigo-800 text-white transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col`}
      >
        <div className="flex items-center justify-between p-4 border-b border-indigo-700">
          <div className="flex items-center space-x-2">
            <div className="bg-white/90 p-1.5 rounded-lg shrink-0">
              <img src="/src/assets/logo.png" alt="Studora" className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-semibold tracking-[-0.02em] whitespace-nowrap">Studora</h1>
          </div>
          <button 
            className="lg:hidden text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 p-1 rounded-md shrink-0"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <nav className="mt-5 px-3 flex-1 overflow-y-auto overflow-x-hidden scrollbar-transparent">
          <div className="pt-1 pb-1.5 px-3 text-xs font-semibold text-indigo-300/70 uppercase tracking-wider">
            Menu Principal
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
                      ? 'text-white border-l-[3px] border-amber-400/80 bg-white/[0.06]' 
                      : 'text-indigo-200/80 hover:bg-white/[0.06] hover:text-white border-l-[3px] border-transparent'
                  }`}
                >
                  <Icon className={`mr-3 h-5 w-5 shrink-0 ${isActive ? 'text-white' : 'text-indigo-300'}`} />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="pt-5 pb-1.5 px-3 text-xs font-semibold text-indigo-300/70 uppercase tracking-wider">
            Sistema
          </div>

          <div className="space-y-1">
            <Link 
              to="/admin" 
              className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-indigo-200/80 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 transition-colors whitespace-nowrap overflow-hidden"
            >
              <Settings className="mr-3 h-5 w-5 shrink-0 text-indigo-300" />
              Gerenciamento
            </Link>
          </div>
        </nav>

        {/* User Profile Section */}
        <div className="p-4 border-t border-white/[0.06]">
          <Link
            to="/perfil"
            className="flex items-center rounded-lg p-2 hover:bg-white/[0.04] transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-600/40 flex items-center justify-center text-indigo-200 shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="ml-3 min-w-0">
              <p className="text-sm font-medium text-white/90 truncate">Estudante</p>
              <p className="text-xs text-indigo-300/60 truncate">Plano Premium</p>
            </div>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top navigation bar */}
        <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shadow-sm z-10">
          <div className="flex items-center">
            <button 
              className="mr-4 text-gray-500 lg:hidden hover:bg-gray-100 p-1 rounded-md transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            <h2 className="text-lg font-bold text-gray-800">
              {navItems.find(i => i.path === location.pathname)?.label || 'App'}
            </h2>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
