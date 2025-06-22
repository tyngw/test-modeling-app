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
  // 最近追加されたトーストの追跡（重複防止強化のため）
  const [recentToasts, setRecentToasts] = useState<Map<string, number>>(new Map());

  const addToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const toastKey = `${message}:${type}`;
      const now = Date.now();

      // 重複防止: 同じメッセージが既に存在する場合は追加しない
      setToasts((prevToasts) => {
        const isDuplicate = prevToasts.some(
          (toast) => toast.message === message && toast.type === type,
        );

        if (isDuplicate) {
          return prevToasts; // 重複の場合は何もしない
        }

        // 最近（3秒以内）に同じトーストが追加されたかチェック
        const lastToastTime = recentToasts.get(toastKey);
        if (lastToastTime && now - lastToastTime < 3000) {
          return prevToasts; // 3秒以内の重複は無視
        }

        // 最近のトーストを記録
        setRecentToasts((prev) => {
          const newMap = new Map(prev);
          newMap.set(toastKey, now);
          // 古いエントリを削除（メモリリーク防止）
          for (const [key, time] of newMap.entries()) {
            if (now - time > 10000) {
              // 10秒以上古い記録は削除
              newMap.delete(key);
            }
          }
          return newMap;
        });

        const id = new Date().getTime().toString() + Math.random().toString();
        const newToast: Toast = { id, message, type };

        const updatedToasts = [...prevToasts, newToast];
        if (updatedToasts.length > 5) {
          updatedToasts.shift();
        }

        // 3秒後にトーストを削除
        setTimeout(() => {
          setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
        }, 3000);

        return updatedToasts;
      });
    },
    [recentToasts],
  );

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
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => (
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
