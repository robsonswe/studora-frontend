'use client';

import { XCircle, Loader2 } from 'lucide-react';

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  title: string;
  loading?: boolean;
  submitLabel?: string;
  children: React.ReactNode;
  /** Optional extra content to render in the footer (e.g. validation errors) */
  footerExtra?: React.ReactNode;
  /** Size of the modal dialog */
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'max-w-lg',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
};

export default function FormModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  loading = false,
  submitLabel = 'Salvar',
  children,
  footerExtra,
  size = 'md',
}: FormModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`bg-white rounded-xl shadow-2xl w-full ${sizeMap[size]} flex flex-col animate-in fade-in slide-in-from-top-3 duration-200 overflow-hidden`}
        style={{ maxHeight: 'min(88vh, 680px)' }}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-indigo-100/60 bg-white">
          <h3 className="text-sm font-bold text-gray-900 tracking-tight">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            title="Fechar"
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-300 hover:text-gray-500 transition-colors duration-150"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form
          id="form-modal-form"
          onSubmit={onSubmit}
          className="flex flex-col flex-1 min-h-0"
        >
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {children}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/60">
            <div className="flex-1">{footerExtra}</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors duration-150"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 transition-colors duration-150 shadow-sm shadow-indigo-200"
              >
                {loading ? (
                  <><Loader2 className="animate-spin w-3.5 h-3.5" /> Salvando…</>
                ) : (
                  submitLabel
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
