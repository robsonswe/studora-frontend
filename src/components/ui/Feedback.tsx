import React from 'react';
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

type FeedbackType = 'error' | 'success' | 'info' | 'warning';

interface FeedbackProps {
  type: FeedbackType;
  title?: string;
  message: string | string[];
  className?: string;
  onClose?: () => void;
}

export const Feedback = ({ type, title, message, className = '', onClose }: FeedbackProps) => {
  const styles = {
    error: {
      bg: 'bg-red-50/50',
      border: 'border-red-200',
      text: 'text-red-900',
      accent: 'bg-red-500',
      icon: <XCircle className="w-5 h-5 text-red-500" />
    },
    success: {
      bg: 'bg-emerald-50/50',
      border: 'border-emerald-200',
      text: 'text-emerald-900',
      accent: 'bg-emerald-500',
      icon: <CheckCircle className="w-5 h-5 text-emerald-500" />
    },
    info: {
      bg: 'bg-indigo-50/50',
      border: 'border-indigo-200',
      text: 'text-indigo-900',
      accent: 'bg-indigo-500',
      icon: <Info className="w-5 h-5 text-indigo-500" />
    },
    warning: {
      bg: 'bg-amber-50/50',
      border: 'border-amber-200',
      text: 'text-amber-900',
      accent: 'bg-amber-500',
      icon: <AlertCircle className="w-5 h-5 text-amber-500" />
    }
  };

  const current = styles[type];

  return (
    <div className={`relative overflow-hidden rounded-lg border ${current.bg} ${current.border} p-4 ${className}`}>
      {/* 2px Vertical Accent Pill */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${current.accent}`} />
      
      <div className="flex gap-3">
        <div className="mt-0.5 shrink-0">
          {current.icon}
        </div>
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className={`text-sm font-bold ${current.text} tracking-tight mb-1`}>
              {title}
            </h4>
          )}
          {Array.isArray(message) ? (
            <ul className="space-y-1">
              {message.map((msg, i) => (
                <li key={i} className={`text-sm font-medium ${current.text} leading-relaxed opacity-90 flex gap-2`}>
                  <span className="opacity-50">·</span>
                  <span>{msg}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={`text-sm font-medium ${current.text} leading-relaxed opacity-90`}>
              {message}
            </p>
          )}
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className={`shrink-0 p-1 rounded-md hover:bg-black/5 transition-colors ${current.text} opacity-40 hover:opacity-100`}
            aria-label="Fechar"
          >
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
