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
          <div className={`relative overflow-hidden flex flex-col min-w-[300px] max-w-sm rounded-xl shadow-2xl border backdrop-blur-xl ${
            toast.type === 'success' ? 'bg-success/95 border-success/20 text-white' :
            toast.type === 'error' ? 'bg-danger/95 border-danger/20 text-white' :
            toast.type === 'warning' ? 'bg-orange-500/95 border-orange-500/20 text-white' :
            'bg-accent-blue/95 border-accent-blue/20 text-white'
          }`}>
            <div className="flex items-start p-4">
              <div className="shrink-0 mr-3 mt-0.5">
                {toast.type === 'success' && <CheckCircle2 size={20} className="text-white drop-shadow-md" />}
                {toast.type === 'error' && <XCircle size={20} className="text-white drop-shadow-md" />}
                {toast.type === 'warning' && <AlertCircle size={20} className="text-white drop-shadow-md" />}
                {toast.type === 'info' && <Info size={20} className="text-white drop-shadow-md" />}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm tracking-wide capitalize drop-shadow-sm">
                  {toast.type === 'success' ? 'Success' : toast.type === 'error' ? 'Error' : toast.type === 'warning' ? 'Warning' : 'Info'}
                </h4>
                <p className="font-medium text-xs mt-0.5 opacity-90 leading-tight drop-shadow-sm">{toast.message}</p>
              </div>
              <button onClick={hideToast} className="ml-4 opacity-70 hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded-md">
                <XCircle size={16} />
              </button>
            </div>
            {/* Progress Bar */}
            <div className="h-1 w-full bg-white/20">
              <div 
                className="h-full bg-white/60 animate-[shrink_linear_forwards]" 
                style={{ animationDuration: '3000ms' }}
              />
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};
