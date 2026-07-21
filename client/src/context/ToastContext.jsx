import React, { createContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react';

export const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const showToast = useCallback((message, type = 'success', duration = 3000) => {
    setToast({ message, type });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setToast(null);
    }, duration);
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] animate-bounce-in">
          <div className={`flex items-center space-x-3 px-6 py-3 rounded-xl shadow-2xl border backdrop-blur-md ${
            toast.type === 'success' ? 'bg-success/10 border-success/20 text-success bg-white dark:bg-black/90' :
            toast.type === 'error' ? 'bg-danger/10 border-danger/20 text-danger bg-white dark:bg-black/90' :
            toast.type === 'warning' ? 'bg-orange-500/10 border-orange-500/20 text-orange-500 bg-white dark:bg-black/90' :
            'bg-accent-blue/10 border-accent-blue/20 text-accent-blue bg-white dark:bg-black/90'
          }`}>
            {toast.type === 'success' && <CheckCircle2 size={20} />}
            {toast.type === 'error' && <XCircle size={20} />}
            {toast.type === 'warning' && <AlertCircle size={20} />}
            {toast.type === 'info' && <Info size={20} />}
            <span className="font-medium text-sm">{toast.message}</span>
            <button onClick={hideToast} className="ml-4 opacity-70 hover:opacity-100 transition-opacity">
              &times;
            </button>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};
