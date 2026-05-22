'use client';

import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { Loader2 } from 'lucide-react';

export default function GhostHomePage() {
  const [companyName, setCompanyName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const configRef = doc(db, 'config', 'empresa');
    const unsubscribe = onSnapshot(configRef, (snapshot) => {
      if (snapshot.exists()) {
        setCompanyName(snapshot.data().nomeEmpresa || 'Bem-vindo');
      } else {
        setCompanyName('Bem-vindo');
      }
      setLoading(false);
    }, (err) => {
      console.error('Erro ao buscar nome da empresa:', err);
      setCompanyName('Bem-vindo');
      setLoading(false);
    });

    // Safety timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="animate-spin text-gray-200" size={32} />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <h1 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tighter uppercase">
          {companyName}
        </h1>
        <div className="h-px w-12 bg-gray-200 mx-auto" />
        <p className="text-xl text-gray-400 font-medium tracking-tight">
          Seja bem-vindo ao nosso portal.
        </p>
      </div>
      
      {/* Footer minimalista */}
      <footer className="fixed bottom-8 text-[10px] text-gray-300 uppercase tracking-[0.2em] font-bold">
        © {new Array().concat(new Date().getFullYear())} • Todos os direitos reservados
      </footer>
    </main>
  );
}
