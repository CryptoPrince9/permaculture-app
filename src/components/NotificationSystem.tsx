"use client";

import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface NotificationContextType {
  notify: (message: string, type?: ToastType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
          >
              <div className={`glass-panel p-4 rounded-lg flex items-start gap-3 min-w-[300px] max-w-md border shadow-2xl ${
                toast.type === 'success' ? 'border-green-500/50 bg-green-500/5' :
                toast.type === 'error' ? 'border-red-500/50 bg-red-500/5' :
                toast.type === 'warning' ? 'border-yellow-500/50 bg-yellow-500/5' :
                'border-accent/50 bg-accent/5'
              }`}>
                <div className="mt-0.5">
                  {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
                  {toast.type === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
                  {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
                  {toast.type === 'info' && <Info className="w-5 h-5 text-accent" />}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-mono text-gray-800 leading-relaxed uppercase tracking-tight">
                    {toast.message}
                  </p>
                </div>
                <button 
                  onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
