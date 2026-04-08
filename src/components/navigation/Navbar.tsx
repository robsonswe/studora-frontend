'use client';

import { Menu } from 'lucide-react';

interface NavbarProps {
  title: string;
  onMenuClick: () => void;
}

export const Navbar = ({ title, onMenuClick }: NavbarProps) => {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-sm z-10">
      <div className="flex items-center">
        <button 
          className="mr-4 text-slate-500 lg:hidden hover:bg-slate-100 p-1 rounded-md transition-colors"
          onClick={onMenuClick}
        >
          <Menu className="h-6 w-6" />
        </button>
        <h2 className="text-lg font-bold text-slate-800">
          {title}
        </h2>
      </div>
    </header>
  );
};
