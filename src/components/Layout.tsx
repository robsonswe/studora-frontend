import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ClipboardList, 
  FileSignature, 
  GraduationCap, 
  Settings, 
  Menu, 
  X,
  User,
  TrendingUp
} from 'lucide-react';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Simulados', path: '/simulados', icon: ClipboardList },
    { label: 'Provas', path: '/provas', icon: FileSignature },
    { label: 'Praticar', path: '/praticar', icon: GraduationCap },
    { label: 'Desempenho', path: '/desempenho', icon: TrendingUp },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
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
            <div className="bg-white/10 p-1.5 rounded-lg">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Studora</h1>
          </div>
          <button 
            className="lg:hidden text-white hover:bg-indigo-700 p-1 rounded-md"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <nav className="mt-6 px-3 flex-1 space-y-1">
          <div className="pb-2 px-3 text-[10px] font-extrabold text-indigo-300 uppercase tracking-widest">
            Menu Principal
          </div>

          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link 
                key={item.path}
                to={item.path} 
                className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  isActive 
                    ? 'bg-indigo-900 text-white shadow-inner' 
                    : 'text-indigo-100 hover:bg-indigo-700 hover:text-white'
                }`}
              >
                <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-white' : 'text-indigo-300'}`} />
                {item.label}
              </Link>
            );
          })}

          <div className="pt-6 pb-2 px-3 text-[10px] font-extrabold text-indigo-300 uppercase tracking-widest">
            Sistema
          </div>

          <Link 
            to="/admin" 
            className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-indigo-100 hover:bg-indigo-700 hover:text-white transition-all"
          >
            <Settings className="mr-3 h-5 w-5 text-indigo-300" />
            Gerenciamento
          </Link>
        </nav>

        {/* User Profile Section */}
        <div className="p-4 border-t border-indigo-700 mt-auto">
          <div className="flex items-center p-2 rounded-xl bg-indigo-900/50 border border-indigo-700/50">
            <div className="w-9 h-9 rounded-lg bg-indigo-500 flex items-center justify-center text-white shadow-lg">
              <User className="w-5 h-5" />
            </div>
            <div className="ml-3 min-w-0">
              <p className="text-sm font-bold text-white truncate">Estudante</p>
              <p className="text-[10px] text-indigo-300 truncate font-medium">Plano Premium</p>
            </div>
          </div>
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