import { useState } from 'react';
import { Outlet } from 'react-router-dom';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

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
        } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
      >
        <div className="flex items-center justify-between p-4 border-b border-indigo-700">
          <h1 className="text-xl font-bold">Studora</h1>
          <button 
            className="lg:hidden text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <nav className="mt-6 px-2 space-y-1 overflow-y-auto max-h-[calc(100vh-100px)] pb-10">
          <a 
            href="/" 
            className="flex items-center px-4 py-2 text-sm font-medium rounded-md bg-indigo-900 text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Dashboard
          </a>
          
          <div className="pt-4 pb-2 px-4 text-xs font-semibold text-indigo-300 uppercase tracking-wider">
            Estudos
          </div>

          <a
            href="/simulados"
            className="flex items-center px-4 py-2 text-sm font-medium rounded-md text-indigo-200 hover:bg-indigo-700 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2a4 4 0 014-4h2a4 4 0 014 4v2m-3-9a3 3 0 11-6 0 3 3 0 016 0zM1 21h22" />
            </svg>
            Simulados
          </a>

          <a
            href="/provas"
            className="flex items-center px-4 py-2 text-sm font-medium rounded-md text-indigo-200 hover:bg-indigo-700 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Provas
          </a>

          <a
            href="/praticar"
            className="flex items-center px-4 py-2 text-sm font-medium rounded-md text-indigo-200 hover:bg-indigo-700 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Praticar
          </a>

          <div className="pt-4 pb-2 px-4 text-xs font-semibold text-indigo-300 uppercase tracking-wider">
            Sistema
          </div>

          <a
            href="/admin"
            className="flex items-center px-4 py-2 text-sm font-medium rounded-md text-indigo-200 hover:bg-indigo-700 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.756 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Gerenciamento
          </a>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top navigation bar */}
        <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
          <div className="flex items-center">
            <button 
              className="mr-4 text-gray-500 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h2 className="text-xl font-semibold text-gray-800">Dashboard</h2>
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="p-1 text-gray-500 rounded-full hover:bg-gray-100 focus:outline-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            
            <div className="relative">
              <button className="flex items-center max-w-xs text-sm rounded-full focus:outline-none">
                <span className="inline-block h-8 w-8 rounded-full overflow-hidden bg-gray-200">
                  <svg className="h-full w-full text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 12.001 5.993zM16.244 11.828a6 6 0 01-8.488 0 6 6 0 010-8.484 6 6 0 018.488 0z" />
                  </svg>
                </span>
              </button>

              {/* Dropdown menu - simplified for now, would be expanded in a real implementation */}
              <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 hidden">
                <a href="/perfil" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Seu perfil</a>
                <a href="/configuracoes" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Configurações</a>
                <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Sair</a>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;