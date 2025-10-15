'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const DEFAULT_DURATION = 3000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType = 'info', duration: number = DEFAULT_DURATION) => {
      const id = Date.now().toString();
      const newToast: Toast = { id, type, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onClose: () => void;
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const bgColor =
    toast.type === 'success'
      ? 'bg-green-50 dark:bg-green-900/20'
      : toast.type === 'error'
        ? 'bg-red-50 dark:bg-red-900/20'
        : 'bg-blue-50 dark:bg-blue-900/20';

  const borderColor =
    toast.type === 'success'
      ? 'border-green-200 dark:border-green-800'
      : toast.type === 'error'
        ? 'border-red-200 dark:border-red-800'
        : 'border-blue-200 dark:border-blue-800';

  const textColor =
    toast.type === 'success'
      ? 'text-green-800 dark:text-green-200'
      : toast.type === 'error'
        ? 'text-red-800 dark:text-red-200'
        : 'text-blue-800 dark:text-blue-200';

  const iconColor =
    toast.type === 'success'
      ? 'text-green-600 dark:text-green-400'
      : toast.type === 'error'
        ? 'text-red-600 dark:text-red-400'
        : 'text-blue-600 dark:text-blue-400';

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${bgColor} ${borderColor} ${textColor} pointer-events-auto shadow-lg animate-in fade-in slide-in-from-right-4 duration-200`}
    >
      {/* Icon */}
      {toast.type === 'success' && (
        <svg
          className={`w-5 h-5 flex-shrink-0 ${iconColor} mt-0.5`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      )}
      {toast.type === 'error' && (
        <svg
          className={`w-5 h-5 flex-shrink-0 ${iconColor} mt-0.5`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      )}
      {toast.type === 'info' && (
        <svg
          className={`w-5 h-5 flex-shrink-0 ${iconColor} mt-0.5`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
      )}

      {/* Message */}
      <div className="flex-1">
        <p className="text-sm font-medium">{toast.message}</p>
      </div>

      {/* Close Button */}
      <button
        onClick={onClose}
        className={`flex-shrink-0 ${iconColor} hover:opacity-75 transition-opacity`}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}
