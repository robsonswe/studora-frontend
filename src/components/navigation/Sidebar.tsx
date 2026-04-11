'use client';

import Link from 'next/link';
import {
  LayoutDashboard,
  ClipboardList,
  FolderOpen,
  FileText,
  FileQuestion,
  TrendingUp,
  Settings,
  User,
  X
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  pathname: string;
}

export const Sidebar = ({ isOpen, onClose, pathname }: SidebarProps) => {
  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Simulados', path: '/simulados', icon: ClipboardList },
    { label: 'Disciplinas', path: '/disciplinas', icon: FolderOpen },
    { label: 'Concursos', path: '/concursos', icon: FileText },
    { label: 'Praticar', path: '/praticar', icon: FileQuestion },
    { label: 'Desempenho', path: '/desempenho', icon: TrendingUp },
  ];

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-64 bg-indigo-800 text-white transform ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col`}
    >
      <div className="flex items-center justify-between p-4 border-b border-indigo-700">
        <div className="flex items-center space-x-2">
          <div className="bg-white/90 p-1.5 rounded-lg shrink-0">
            <img src="/logo.png" alt="Studora" className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-semibold tracking-[-0.02em] whitespace-nowrap">Studora</h1>
        </div>
        <button
          className="lg:hidden text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 p-1 rounded-md shrink-0"
          onClick={onClose}
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
            const isActive = pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 ${
                  isActive
                    ? 'text-white border-l-[3px] border-amber-400/80 bg-white/[0.06]'
                    : 'text-indigo-200/80 hover:bg-white/[0.06] hover:text-white border-l-[3px] border-transparent'
                }`}
                onClick={onClose}
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
            href="/admin"
            className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-indigo-200/80 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 transition-colors whitespace-nowrap overflow-hidden"
            onClick={onClose}
          >
            <Settings className="mr-3 h-5 w-5 shrink-0 text-indigo-300" />
            Gerenciamento
          </Link>
        </div>
      </nav>

      {/* User Profile Section */}
      <div className="p-4 border-t border-white/[0.06]">
        <Link
          href="/perfil"
          className="flex items-center rounded-lg p-2 hover:bg-white/[0.04] transition-colors"
          onClick={onClose}
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
  );
}
