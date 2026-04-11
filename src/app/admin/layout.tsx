'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { AdminSidebar } from '@/components/navigation/AdminSidebar';
import { Navbar } from '@/components/navigation/Navbar';
import { BreadcrumbProvider, useBreadcrumbs } from '@/components/layout/BreadcrumbContext';

function AdminLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { breadcrumbs } = useBreadcrumbs();

  const navItems = [
    { label: 'Instituições', path: '/admin/instituicoes' },
    { label: 'Bancas', path: '/admin/bancas' },
    { label: 'Concursos', path: '/admin/concursos' },
    { label: 'Cargos', path: '/admin/cargos' },
    { label: 'Disciplinas', path: '/admin/disciplinas' },
    { label: 'Temas', path: '/admin/temas' },
    { label: 'Subtemas', path: '/admin/subtemas' },
    { label: 'Questões', path: '/admin/questoes' },
  ];

  const activeItem = navItems.find(i => i.path === pathname) || { label: 'Admin' };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden animate-backdrop"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      <AdminSidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        pathname={pathname} 
      />

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-sm z-10 font-sans relative">
          <Navbar onMenuClick={() => setSidebarOpen(true)}>
            <div className="hidden lg:flex items-center text-sm text-slate-500 font-medium ml-2">
              <span>Admin</span>
              {breadcrumbs.length > 0 ? (
                breadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={idx}>
                    <ChevronRight className="w-4 h-4 mx-2 text-slate-300 flex-shrink-0" />
                    {crumb.href ? (
                      <Link href={crumb.href} className="hover:text-indigo-600 transition-colors">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className={idx === breadcrumbs.length - 1 ? 'text-slate-900 font-bold' : ''}>
                        {crumb.label}
                      </span>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <>
                  <ChevronRight className="w-4 h-4 mx-2 text-slate-300" />
                  <span className="text-slate-900">
                    {activeItem.label}
                  </span>
                </>
              )}
            </div>
          </Navbar>
          
          <div className="flex items-center space-x-4">
            <div className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest border border-indigo-100">
              Gerenciamento
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 font-sans">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <BreadcrumbProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </BreadcrumbProvider>
  );
}
