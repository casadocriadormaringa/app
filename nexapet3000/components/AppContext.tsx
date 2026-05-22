'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';

interface CompanyConfig {
  nomeEmpresa?: string;
  enderecoRua?: string;
  enderecoNumero?: string;
  enderecoBairro?: string;
  enderecoCidade?: string;
  enderecoEstado?: string;
  telefoneEmpresa?: string;
  [key: string]: any;
}

interface AppContextType {
  companyConfig: CompanyConfig | null;
  loadingConfig: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [companyConfig, setCompanyConfig] = useState<CompanyConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, 'config', 'empresa'), (docSnap) => {
      if (docSnap.exists()) {
        setCompanyConfig(docSnap.data());
      }
      setLoadingConfig(false);
    }, (error) => {
      console.error('Error fetching company config:', error);
      setLoadingConfig(false);
    });

    return () => unsubConfig();
  }, []);

  return (
    <AppContext.Provider value={{ companyConfig, loadingConfig }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
