'use client';

import { ReactNode } from 'react';
import { XCircle } from 'lucide-react';
import BaseModal from './BaseModal';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '5xl' | '6xl' | 'full';
  /** Optional subtitle or description below the title */
  subtitle?: string;
  /** If true, the header (title and close button) is hidden */
  hideHeader?: boolean;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  subtitle,
  hideHeader = false,
}: ModalProps) {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size={size}>
      {!hideHeader && (
        <div className="flex-shrink-0 flex items-start justify-between px-6 py-5 border-b border-indigo-100/60 bg-white">
          <div className="pr-8">
            <h3 className="text-sm sm:text-lg font-bold text-gray-900 tracking-tight leading-tight">
              {title}
            </h3>
            {subtitle && (
              <p className="mt-1 text-sm text-slate-500 leading-snug">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Fechar"
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-300 hover:text-gray-500 transition-colors duration-150"
          >
            <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto max-h-[calc(88vh-80px)]">
        {children}
      </div>
    </BaseModal>
  );
}
