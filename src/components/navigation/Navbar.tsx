'use client';

import { Menu } from 'lucide-react';

interface NavbarProps {
  onMenuClick: () => void;
  children?: React.ReactNode;
}

export const Navbar = ({ onMenuClick, children }: NavbarProps) => {
  return (
    <div className="flex items-center">
      <button
        className="mr-4 text-slate-500 lg:hidden hover:bg-slate-100 p-1 rounded-md transition-colors"
        onClick={onMenuClick}
      >
        <Menu className="h-6 w-6" />
      </button>
      {children}
    </div>
  );
};
