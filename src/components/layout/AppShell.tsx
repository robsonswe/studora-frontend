'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/navigation/Sidebar';
import { Navbar } from '@/components/navigation/Navbar';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = [
    { label: 'Dashboard', path: '/', icon: 'LayoutDashboard' },
    { label: 'Simulados', path: '/simulados', icon: 'ClipboardList' },
    { label: 'Disciplinas', path: '/disciplinas', icon: 'FolderOpen' },
    { label: 'Concursos', path: '/concursos', icon: 'FileText' },
    { label: 'Praticar', path: '/praticar', icon: 'FileQuestion' },
    { label: 'Desempenho', path: '/desempenho', icon: 'TrendingUp' },
  ];

  const currentLabel = navItems.find(i =>
    pathname === i.path || (i.path !== '/' && pathname?.startsWith(i.path))
  )?.label || 'Studora';

  const isAdmin = pathname?.startsWith('/admin');

  // If not mounted yet (to avoid hydration mismatch) or if in admin section,
  // we just render a simple wrapper. The admin layout handles its own sidebar.
  if (!mounted || isAdmin) {
    return <div className="min-h-screen bg-slate-50">{children}</div>;
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden animate-in fade-in"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        pathname={pathname}
      />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar
          title={currentLabel}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}
