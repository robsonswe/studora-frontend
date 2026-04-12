'use client';

import { useState, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '5xl' | '6xl' | 'full';
  className?: string;
  /** If true, the backdrop click won't trigger onClose */
  preventBackdropClick?: boolean;
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  full: 'max-w-full h-full sm:h-auto',
};

export default function BaseModal({
  isOpen,
  onClose,
  children,
  size = 'md',
  className = '',
  preventBackdropClick = false,
}: BaseModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !preventBackdropClick) {
      onClose();
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 backdrop-blur-[2px] p-4 overflow-y-auto animate-in fade-in duration-200"
      onMouseDown={handleBackdropClick}
    >
      <div
        className={`bg-white shadow-2xl w-full ${sizeMap[size]} rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-bottom-4 sm:slide-in-from-top-4 duration-300 ${className}`}
      >
        {children}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
