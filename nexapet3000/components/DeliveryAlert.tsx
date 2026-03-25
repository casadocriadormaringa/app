'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db } from '@/firebase';
import { Bell, Truck, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePathname } from 'next/navigation';

export const DeliveryAlert = () => {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [newDelivery, setNewDelivery] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const isFirstRun = useRef(true);
  const lastSeenId = useRef<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    // Don't listen for deliveries if on the public consultation page
    if (pathname === '/consulta') return;

    // Listen for new sales that are deliveries
    const q = query(
      collection(db, 'vendas'),
      where('tipoVenda', '==', 'ENTREGA'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        isFirstRun.current = false;
        return;
      }

      const latestDoc = snapshot.docs[0];
      const data = latestDoc.data();
      const docId = latestDoc.id;

      // On first run, just record the latest ID to avoid alerting for old deliveries
      if (isFirstRun.current) {
        lastSeenId.current = docId;
        isFirstRun.current = false;
        return;
      }

      // If we see a new ID that we haven't seen before, it's a new delivery
      if (docId !== lastSeenId.current) {
        lastSeenId.current = docId;
        setNewDelivery({ id: docId, ...data });
        setShowModal(true);
        
        // Play a notification sound if possible
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(e => {
          // This is expected if the user hasn't interacted with the page yet
          console.log('Audio playback blocked by browser until user interaction.');
        });
      }
    }, (error) => {
      console.error('Error listening for new deliveries:', error);
    });

    return () => unsubscribe();
  }, [pathname, mounted]);

  const handleDismiss = () => {
    setShowModal(false);
    setNewDelivery(null);
  };

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {showModal && newDelivery && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden border-4 border-blue-500"
          >
            <div className="bg-blue-600 p-8 text-white relative overflow-hidden">
              {/* Animated Background Elements */}
              <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl" />
              
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="bg-white/20 p-5 rounded-3xl mb-6 backdrop-blur-sm ring-4 ring-white/30 animate-bounce">
                  <Truck size={48} className="text-white" />
                </div>
                <h2 className="text-4xl font-black uppercase tracking-tighter mb-2">Nova Entrega!</h2>
                <div className="bg-white/20 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
                  Venda #{newDelivery.numeroVenda}
                </div>
              </div>
            </div>

            <div className="p-10 space-y-8">
              <div className="space-y-6">
                <div className="flex items-start gap-4 p-6 bg-blue-50 rounded-3xl border-2 border-blue-100">
                  <div className="bg-blue-600 p-2 rounded-xl text-white shrink-0">
                    <Bell size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Cliente</p>
                    <p className="text-2xl font-black text-gray-900 leading-tight">
                      {newDelivery.clienteNome}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Valor Total</p>
                    <p className="text-xl font-black text-gray-900">
                      R$ {Number(newDelivery.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Itens</p>
                    <p className="text-xl font-black text-gray-900">
                      {newDelivery.itens?.length || 0} {newDelivery.itens?.length === 1 ? 'Item' : 'Itens'}
                    </p>
                  </div>
                </div>

                {newDelivery.clienteEndereco && (
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                    <AlertTriangle size={20} className="text-amber-600 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Endereço de Entrega</p>
                      <p className="text-sm font-bold text-gray-800 leading-snug">
                        {newDelivery.clienteEndereco}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleDismiss}
                className="w-full py-6 bg-blue-600 text-white rounded-[28px] font-black text-xl uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-3 active:scale-95"
              >
                <CheckCircle2 size={28} />
                Visualizado (OK)
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
