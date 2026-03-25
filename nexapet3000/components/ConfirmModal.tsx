'use client';

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'danger'
}) => {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: <AlertTriangle className="text-red-600" size={24} />,
          button: 'bg-red-600 hover:bg-red-700 shadow-red-100',
          bg: 'bg-red-50'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="text-amber-600" size={24} />,
          button: 'bg-amber-600 hover:bg-amber-700 shadow-amber-100',
          bg: 'bg-amber-50'
        };
      default:
        return {
          icon: <AlertTriangle className="text-indigo-600" size={24} />,
          button: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100',
          bg: 'bg-indigo-50'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className={`p-3 rounded-2xl ${styles.bg}`}>
              {styles.icon}
            </div>
            <button 
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"
            >
              <X size={20} />
            </button>
          </div>
          
          <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-500 leading-relaxed">{message}</p>
        </div>
        
        <div className="p-6 bg-gray-50 flex flex-col sm:flex-row gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold hover:bg-gray-100 transition-all active:scale-95"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-6 py-3 text-white rounded-2xl font-bold transition-all active:scale-95 shadow-lg ${styles.button}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
