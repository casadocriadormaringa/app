'use client';

import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { Loader2, AlertCircle, Lock } from 'lucide-react';
import { format, isAfter, parseISO, startOfDay } from 'date-fns';

interface ExpirationWrapperProps {
  children: React.ReactNode;
}

export const ExpirationWrapper: React.FC<ExpirationWrapperProps> = ({ children }) => {
  console.log('ExpirationWrapper: Renderizando...');
  const [mounted, setMounted] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    console.log('ExpirationWrapper: Iniciando verificação de expiração...');
    const docRef = doc(db, 'cadeado_itens', 'config');
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      console.log('ExpirationWrapper: Snapshot recebido, existe:', snapshot.exists());
      if (snapshot.exists()) {
        const data = snapshot.data();
        const expirationDateStr = data.dataExpiracao;
        
        if (expirationDateStr) {
          try {
            const expirationDate = startOfDay(parseISO(expirationDateStr));
            const today = startOfDay(new Date());
            
            setIsExpired(isAfter(today, expirationDate));
          } catch (err) {
            console.error('ExpirationWrapper: Error parsing expiration date:', err);
            setIsExpired(false);
          }
        } else {
          setIsExpired(false);
        }
      } else {
        setIsExpired(false);
      }
      setLoading(false);
    }, (error) => {
      console.error('ExpirationWrapper: Error checking expiration:', error);
      setLoading(false);
    });

    // Timeout de segurança
    const timeout = setTimeout(() => {
      setLoading(prev => {
        if (prev) {
          console.warn('ExpirationWrapper: Timeout de carregamento atingido.');
          return false;
        }
        return prev;
      });
    }, 10000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  if (!mounted) return null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
        <div className="text-center">
          <p className="text-gray-600 font-bold">Verificando licença...</p>
          <p className="text-gray-400 text-xs mt-1">Isso não deve demorar muito.</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all"
        >
          Recarregar Página
        </button>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center border border-red-100">
          <div className="bg-red-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="text-red-500" size={48} />
          </div>
          <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">App Vencido !</h1>
          <p className="text-gray-500 mb-8 leading-relaxed">
            A licença de uso deste aplicativo expirou. <br />
            Entre em contato com o administrador para renovar seu acesso.
          </p>
          <div className="bg-gray-50 rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-center gap-2 text-gray-400 mb-2">
              <Lock size={16} />
              <span className="text-xs font-bold uppercase tracking-widest">Acesso Restrito</span>
            </div>
          </div>
          <p className="text-sm text-gray-400">
            Consulte a página do <strong>Cadeado</strong> para mais informações.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
