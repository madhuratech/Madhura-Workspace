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
        <div className="fixed bottom-6 right-6 z-[9999] animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="relative flex items-center min-w-[300px] max-w-sm rounded-xl shadow-lg border border-border bg-bg-secondary text-text-primary overflow-hidden">
            <div className={`w-1.5 self-stretch shrink-0 ${
              toast.type === 'success' ? 'bg-emerald-500' :
              toast.type === 'error' ? 'bg-rose-500' :
              toast.type === 'warning' ? 'bg-amber-500' :
              'bg-blue-500'
            }`} />
            
            <div className="flex-1 flex items-center p-3.5 pl-3">
              <div className="shrink-0 mr-3">
                {toast.type === 'success' && <CheckCircle2 size={18} className="text-emerald-500" />}
                {toast.type === 'error' && <XCircle size={18} className="text-rose-500" />}
                {toast.type === 'warning' && <AlertCircle size={18} className="text-amber-500" />}
                {toast.type === 'info' && <Info size={18} className="text-blue-500" />}
              </div>
              <div className="flex-1 pr-2">
                <p className="font-semibold text-[13px] leading-tight">{toast.message}</p>
              </div>
              <button 
                onClick={hideToast} 
                className="shrink-0 text-text-secondary hover:text-text-primary transition-colors p-1 rounded-md hover:bg-bg-primary"
              >
                <XCircle size={16} />
              </button>
            </div>
            
            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 h-[2px] w-full bg-border/50">
              <div 
                className={`h-full animate-[shrink_linear_forwards] ${
                  toast.type === 'success' ? 'bg-emerald-500' :
                  toast.type === 'error' ? 'bg-rose-500' :
                  toast.type === 'warning' ? 'bg-amber-500' :
                  'bg-blue-500'
                }`} 
                style={{ animationDuration: '3000ms' }}
              />
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};
