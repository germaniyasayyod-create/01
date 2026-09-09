import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface Props {
  toasts?: ToastMessage[];
  onDismiss?: (id: string) => void;
  // Single toast props support
  id?: string;
  type?: 'success' | 'error' | 'info';
  message?: string;
  onClose?: () => void;
}

export const NotificationToast: React.FC<Props> = ({
  toasts,
  onDismiss,
  id,
  type,
  message,
  onClose,
}) => {
  const activeToasts: ToastMessage[] = React.useMemo(() => {
    if (Array.isArray(toasts)) {
      return toasts;
    }
    if (message) {
      return [
        {
          id: id || 'toast-single',
          type: type || 'info',
          message,
        },
      ];
    }
    return [];
  }, [toasts, id, type, message]);

  useEffect(() => {
    if (activeToasts.length === 0) return;
    const timer = setTimeout(() => {
      if (onDismiss) {
        onDismiss(activeToasts[0].id);
      }
      if (onClose) {
        onClose();
      }
    }, 4500);
    return () => clearTimeout(timer);
  }, [activeToasts, onDismiss, onClose]);

  if (activeToasts.length === 0) return null;

  const handleCloseItem = (toastId: string) => {
    if (onDismiss) {
      onDismiss(toastId);
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full px-4 pointer-events-none">
      {activeToasts.map(toast => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-all transform duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : toast.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
          {toast.type === 'info' && <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />}

          <div className="flex-1 text-sm font-medium leading-snug">{toast.message}</div>

          <button
            onClick={() => handleCloseItem(toast.id)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
