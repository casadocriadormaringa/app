'use client';

import React from 'react';
import { motion } from 'motion/react';
import { ShoppingCart, Calendar, ArrowRight, ShieldCheck, Clock } from 'lucide-react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useApp } from '@/components/AppContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function NexaPetPage() {
  const { companyConfig } = useApp();
  const [licenseInfo, setLicenseInfo] = React.useState<any>(null);

  React.useEffect(() => {
    const unsubLicense = onSnapshot(doc(db, 'cadeado_itens', 'config'), (snap) => {
      if (snap.exists()) {
        setLicenseInfo(snap.data());
      }
    });
    return () => unsubLicense();
  }, []);

  const formattedExpiration = React.useMemo(() => {
    if (!licenseInfo?.dataExpiracao) return 'Não definida';
    try {
      return format(parseISO(licenseInfo.dataExpiracao), 'dd/MM/yyyy', { locale: ptBR });
    } catch (e) {
      return licenseInfo.dataExpiracao;
    }
  }, [licenseInfo]);

  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-[#F8F9FA] flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-4xl mx-auto px-4 py-12 flex flex-col items-center justify-center text-center">
          {/* Animated Dog Emoji */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 10, -10, 0],
              opacity: 1 
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut"
            }}
            className="text-8xl md:text-9xl mb-8 cursor-default select-none"
          >
            🐶
          </motion.div>

          {/* NexaPet Title */}
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-2">
            <span className="text-orange-500">NexaPet</span>
          </h1>

          {/* Slogan */}
          <p className="text-xl md:text-2xl font-bold text-gray-500 mb-12 tracking-tight">
            O Melhor Amigo Do Seu Negócio
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 w-full max-w-lg">
            <Link 
              href="/XJ92K4BT/vendas"
              className="flex-1 group relative overflow-hidden bg-orange-500 text-white px-8 py-5 rounded-3xl font-black text-xl shadow-2xl shadow-orange-200 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
            >
              <ShoppingCart size={24} />
              <span>Vender Agora</span>
              <motion.div
                animate={{ x: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <ArrowRight size={20} />
              </motion.div>
            </Link>

            <Link 
              href="/XJ92K4BT/agenda"
              className="flex-1 group bg-white text-gray-900 border-2 border-gray-100 px-8 py-5 rounded-3xl font-black text-xl shadow-xl shadow-gray-100 transition-all hover:border-orange-500 hover:text-orange-500 hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
            >
              <Calendar size={24} />
              <span>Agendar</span>
            </Link>
          </div>

          {/* Licensing Information */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-16 pt-8 border-t border-gray-100 flex flex-col gap-2 items-center"
          >
            <div className="flex items-center gap-2 text-gray-400 font-bold text-sm uppercase tracking-widest">
              <ShieldCheck size={16} className="text-emerald-500" />
              <span>Licenciado para:</span>
              <span className="text-gray-900">{companyConfig?.nomeEmpresa || '...'}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400 font-bold text-sm uppercase tracking-widest">
              <Clock size={16} className="text-rose-500" />
              <span>Vencimento:</span>
              <span className="text-gray-900 font-black">{formattedExpiration}</span>
            </div>
          </motion.div>

          {/* Decorative background elements */}
          <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 -left-20 w-96 h-96 bg-orange-100 rounded-full blur-3xl opacity-30" />
            <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-30" />
          </div>
        </div>
      </main>
    </ErrorBoundary>
  );
}
