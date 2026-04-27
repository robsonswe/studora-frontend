import { AlertTriangle, Info, CheckCircle, Loader2 } from 'lucide-react';
import BaseModal from './BaseModal';

export type ConfirmModalType = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  type?: ConfirmModalType;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  alertOnly?: boolean;
}

const typeStyles = {
  danger: {
    icon: AlertTriangle,
    iconColor: 'text-terracotta-600',
    iconBg: 'bg-terracotta-100',
    buttonBg: 'bg-terracotta-600 hover:bg-terracotta-700 active:bg-terracotta-800',
    buttonShadow: 'shadow-terracotta-200',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-100',
    buttonBg: 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700',
    buttonShadow: 'shadow-amber-200',
  },
  info: {
    icon: Info,
    iconColor: 'text-indigo-600',
    iconBg: 'bg-indigo-100',
    buttonBg: 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800',
    buttonShadow: 'shadow-indigo-200',
  },
  success: {
    icon: CheckCircle,
    iconColor: 'text-sage-600',
    iconBg: 'bg-sage-100',
    buttonBg: 'bg-sage-600 hover:bg-sage-700 active:bg-sage-800',
    buttonShadow: 'shadow-sage-200',
  },
};

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'info',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  loading = false,
  alertOnly = false,
}: ConfirmModalProps) {
  const style = typeStyles[type];
  const Icon = style.icon;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      preventBackdropClick={loading}
    >
      <div className="p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div className={`flex-shrink-0 flex items-center justify-center h-14 w-14 rounded-2xl ${style.iconBg} mb-5`}>
            <Icon className={`h-7 w-7 ${style.iconColor}`} />
          </div>
          
          <h3 className="text-lg font-bold text-slate-900 mb-2 leading-tight">
            {title}
          </h3>
          
          <p className="text-sm text-slate-500 leading-relaxed">
            {message}
          </p>
        </div>
      </div>

      <div className="px-6 py-5 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-3">
        {!alertOnly && (
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-full sm:flex-1 px-4 py-2.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-all duration-150"
          >
            {cancelLabel}
          </button>
        )}
        
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={`w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white ${style.buttonBg} rounded-xl disabled:opacity-50 transition-all duration-150 shadow-sm ${style.buttonShadow}`}
        >
          {loading ? (
            <><Loader2 className="animate-spin w-3.5 h-3.5" /> Procesando…</>
          ) : (
            confirmLabel
          )}
        </button>
      </div>
    </BaseModal>
  );
}
