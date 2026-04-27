'use client';

import { useEffect, ReactNode, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Background footer content, usually for action buttons */
  footer?: ReactNode;
}

export default function Drawer({
  isOpen,
  onClose,
  title,
  children,
  footer,
}: DrawerProps) {
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const drawerContent = (
    <div
      className="fixed inset-0 z-[10000] flex items-end justify-center bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-300"
      onMouseDown={handleBackdropClick}
    >
      <div
        className="w-full bg-white rounded-t-[1.5rem] shadow-2xl flex flex-col max-h-[92vh] animate-in slide-in-from-bottom-[100%] duration-500 ease-out fill-mode-both"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Handle for visual affordance */}
        <div className="shrink-0 pt-3 pb-1" onClick={onClose}>
          <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto" />
        </div>

        {/* Header */}
        <div className="shrink-0 px-6 pt-2 pb-4 flex items-center justify-between">
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-full hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-2 custom-scrollbar pb-8">
          {children}
        </div>

        {/* Optional Footer */}
        {footer && (
          <div className="shrink-0 bg-white border-t border-slate-100 p-6 pb-8">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(drawerContent, document.body);
}
