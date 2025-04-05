// src/context/toastContext.tsx
'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'info' | 'warn' | 'error';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = new Date().getTime().toString() + Math.random().toString();
    const newToast: Toast = { id, message, type };

    setToasts(prevToasts => {
      const updatedToasts = [...prevToasts, newToast];
      if (updatedToasts.length > 5) {
        updatedToasts.shift();
      }
      return updatedToasts;
    });

    setTimeout(() => {
      setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
    }, 3000);
  }, []);

  const getToastStyle = (type: ToastType) => {
    switch (type) {
      case 'info':
        return {
          backgroundColor: 'rgba(76, 175, 80, 0.9)',
          color: 'white',
        };
      case 'warn':
        return {
          backgroundColor: 'rgba(255, 193, 7, 0.9)',
          color: 'black',
        };
      case 'error':
        return {
          backgroundColor: 'rgba(244, 67, 54, 0.9)',
          color: 'white',
        };
      default:
        return {
          backgroundColor: 'rgba(76, 175, 80, 0.9)',
          color: 'white',
        };
    }
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        pointerEvents: 'none',
      }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            style={{
              ...getToastStyle(toast.type),
              padding: '10px 20px',
              borderRadius: '10px',
              marginBottom: '10px',
              transition: 'opacity 0.5s',
              opacity: 1,
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};
