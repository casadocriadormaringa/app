'use client';

import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const getStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50 border-green-100',
          text: 'text-green-800',
          icon: <CheckCircle className="text-green-500" size={20} />
        };
      case 'error':
        return {
          bg: 'bg-red-50 border-red-100',
          text: 'text-red-800',
          icon: <XCircle className="text-red-500" size={20} />
        };
      case 'warning':
        return {
          bg: 'bg-amber-50 border-amber-100',
          text: 'text-amber-800',
          icon: <AlertCircle className="text-amber-500" size={20} />
        };
      default:
        return {
          bg: 'bg-indigo-50 border-indigo-100',
          text: 'text-indigo-800',
          icon: <Info className="text-indigo-500" size={20} />
        };
    }
  };

  const styles = getStyles();

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-bottom-4 duration-300">
      <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl border shadow-xl ${styles.bg} ${styles.text}`}>
        {styles.icon}
        <span className="font-bold text-sm whitespace-nowrap">{message}</span>
        <button 
          onClick={onClose}
          className="ml-2 p-1 hover:bg-black/5 rounded-lg transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
