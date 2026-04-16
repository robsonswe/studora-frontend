import { ReactNode } from 'react';
import { XCircle, Loader2 } from 'lucide-react';
import BaseModal from './BaseModal';

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  title: string;
  loading?: boolean;
  submitLabel?: string;
  children: ReactNode;
  /** Optional extra content to render in the footer (e.g. validation errors) */
  footerExtra?: ReactNode;
  /** Size of the modal dialog */
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '5xl' | '6xl' | 'full';
}

export default function FormModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  loading = false,
  submitLabel = 'Salvar',
  children,
  footerExtra,
  size = '2xl',
}: FormModalProps) {
  return (
    <BaseModal 
      isOpen={isOpen} 
      onClose={onClose} 
      size={size}
      preventBackdropClick={loading}
    >
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 sm:px-6 py-4 sm:py-3.5 border-b border-indigo-100/60 bg-white">
        <h3 className="text-sm sm:text-[15px] font-bold text-gray-900 tracking-tight">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          title="Fechar"
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-300 hover:text-gray-500 transition-colors duration-150"
        >
          <XCircle className="w-5 h-5 sm:w-4 sm:h-4" />
        </button>
      </div>

      {/* Body */}
      <form
        id="form-modal-form"
        onSubmit={onSubmit}
        className="flex flex-col flex-1 min-h-0 overflow-hidden"
      >
        <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6 sm:py-5 max-h-[min(70vh,550px)]">
          {children}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 px-5 sm:px-6 py-4 sm:py-3 border-t border-slate-100 bg-slate-50/60 pb-safe">
          <div className="flex-1 w-full sm:w-auto">{footerExtra}</div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors duration-150"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 sm:px-4 py-2.5 sm:py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 transition-colors duration-150 shadow-sm shadow-indigo-200"
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
    </BaseModal>
  );
}
