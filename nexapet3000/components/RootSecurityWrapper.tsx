'use client';

import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';

export function RootSecurityWrapper({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [companyName, setCompanyName] = useState('Casa do Criador Maringá');

  useEffect(() => {
    setIsMounted(true);
    const auth = localStorage.getItem('pos_admin_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }

    const unsubConfig = onSnapshot(doc(db, 'config', 'empresa'), (docSnap) => {
      if (docSnap.exists()) {
        setCompanyName(docSnap.data().nomeEmpresa || 'Casa do Criador Maringá');
      }
    });

    return () => unsubConfig();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Senha simples para controle de acesso básico conforme solicitado anteriormente
    if (password === 'admin123') {
      localStorage.setItem('pos_admin_auth', 'true');
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setPassword('');
    }
  };

  if (!isMounted) return null;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="text-blue-600" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Acesso Restrito</h1>
            <p className="text-gray-500 text-center mt-2">
              Digite a senha administrativa para acessar o sistema.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha de acesso"
                autoComplete="new-password"
                className={`w-full px-4 py-3 rounded-xl border ${
                  error ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-blue-500'
                } outline-none transition-all`}
                autoFocus
              />
              {error && (
                <p className="text-red-500 text-sm mt-1 ml-1">Senha incorreta. Tente novamente.</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors shadow-lg shadow-blue-200"
            >
              Entrar no Sistema
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">
              {companyName}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
