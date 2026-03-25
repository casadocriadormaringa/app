'use client';

import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { Lock, Loader2, ShieldCheck, ArrowRight } from 'lucide-react';

interface SecurityLockProps {
  children: React.ReactNode;
}

export const SecurityLock: React.FC<SecurityLockProps> = ({ children }) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [correctPassword, setCorrectPassword] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('Casa do Criador');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const docRef = doc(db, 'config', 'empresa');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCorrectPassword(data.senhaDesbloqueio || null);
        setCompanyName(data.nomeEmpresa || 'Casa do Criador');
      }
      setLoading(false);
    }, (err) => {
      console.error('Erro ao buscar senha:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);

    // Se não houver senha cadastrada, permite acesso (ou você pode exigir uma senha padrão)
    if (!correctPassword) {
      setIsUnlocked(true);
      return;
    }

    if (password === correctPassword) {
      setIsUnlocked(true);
    } else {
      setError(true);
      setPassword('');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
        <p className="text-gray-600 font-bold">Verificando Segurança...</p>
      </div>
    );
  }

  if (isUnlocked) {
    return <>{children}</>;
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-3xl shadow-2xl border border-gray-100 text-center animate-in fade-in zoom-in duration-300">
      <div className="bg-indigo-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600 shadow-inner">
        <Lock size={40} />
      </div>
      
      <h2 className="text-2xl font-black text-gray-900 mb-2">Acesso Restrito</h2>
      <p className="text-gray-500 font-medium mb-8">Esta área é protegida. Por favor, insira a senha de desbloqueio para continuar.</p>

      <form onSubmit={handleUnlock} className="space-y-4">
        <div className="relative">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 outline-none text-center text-xl font-black tracking-widest transition-all ${
              error ? 'border-red-500 bg-red-50 animate-shake' : 'border-transparent focus:border-indigo-500 focus:bg-white'
            }`}
            placeholder="••••••"
            autoFocus
          />
          {error && (
            <p className="text-red-500 text-xs font-bold mt-2 uppercase tracking-widest">Senha Incorreta</p>
          )}
        </div>

        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 group"
        >
          <ShieldCheck size={20} />
          Desbloquear Acesso
          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </form>

      <p className="mt-8 text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
        Segurança {companyName}
      </p>
    </div>
  );
};
