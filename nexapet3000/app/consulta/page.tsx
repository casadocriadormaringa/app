'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '@/firebase';
import { Search, Package, Truck, AlertCircle, Dog, Loader2 } from 'lucide-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ConsultaContent() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code') || '';
  
  const [mounted, setMounted] = useState(false);
  const [codigoBusca, setCodigoBusca] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState<any>(null);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSearch = React.useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const codeToSearch = e ? codigoBusca.trim() : initialCode.trim();
    if (!codeToSearch) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);
    setCustomer(null);

    // 1. Find Customer
    const qCustomer = query(
      collection(db, 'clientes'),
      where('codigoConsulta', '==', codeToSearch)
    );

    const unsubCustomer = onSnapshot(qCustomer, (snapshot) => {
      if (snapshot.empty) {
        setCustomer(null);
        setError('Código não encontrado. Verifique se digitou corretamente.');
        setLoading(false);
        return;
      }

      const customerData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      setCustomer(customerData);
      setLoading(false);

      // 2. Fetch Deliveries
      const qDeliveries = query(
        collection(db, 'vendas'),
        where('clienteCodigoConsulta', '==', codeToSearch),
        where('tipoVenda', '==', 'ENTREGA'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      onSnapshot(qDeliveries, (snap) => {
        setDeliveries(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => {
        console.error('Erro ao buscar entregas:', err);
        if (err.message.includes('requires an index')) {
          setError('O sistema está sendo atualizado (Índice do banco de dados necessário). Por favor, tente novamente em alguns minutos.');
        }
      });
    }, (err) => {
      console.error('Erro na busca:', err);
      if (err.message.includes('requires an index')) {
        setError('O sistema está sendo atualizado (Índice do banco de dados necessário). Por favor, tente novamente em alguns minutos.');
      } else {
        setError('Ocorreu um erro ao buscar seus dados.');
      }
      setLoading(false);
    });

    return () => unsubCustomer();
  }, [codigoBusca, initialCode]);

  useEffect(() => {
    if (initialCode) {
      handleSearch();
    }
  }, [initialCode, handleSearch]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'EM_SEPARACAO': return 'text-amber-500 bg-amber-50';
      case 'EM_ROTA': return 'text-blue-500 bg-blue-50';
      case 'ENTREGA_CONCLUIDA': return 'text-emerald-500 bg-emerald-50';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'EM_SEPARACAO': return 'Em Separação';
      case 'EM_ROTA': return 'Em Rota de Entrega';
      case 'ENTREGA_CONCLUIDA': return 'Entregue';
      default: return status;
    }
  };

  if (!mounted) return null;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#F8F9FA] font-sans">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 py-6 px-4 sticky top-0 z-10 shadow-sm">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-xl">
                <Dog className="text-white" size={24} />
              </div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight">Portal do Cliente</h1>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-8">
          {/* Search Section */}
          <section className="mb-8">
            <div className="bg-white rounded-3xl p-6 shadow-xl shadow-indigo-100/20 border border-gray-50">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Acesse seus dados</h2>
              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Digite seu código de consulta..."
                    value={codigoBusca}
                    onChange={(e) => setCodigoBusca(e.target.value.toUpperCase())}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !codigoBusca.trim()}
                  className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-200 active:scale-95"
                >
                  {loading ? 'Buscando...' : 'Consultar'}
                </button>
              </form>
              <p className="mt-3 text-xs text-gray-400 font-medium">
                O código de consulta foi fornecido no momento do seu cadastro.
              </p>
            </div>
          </section>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="error-message"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-center gap-3 mb-8"
              >
                <AlertCircle size={20} />
                <p className="font-bold text-sm">{error}</p>
              </motion.div>
            )}

            {customer && (
              <motion.div
                key="customer-results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
              >
                {/* Real-time Deliveries */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Truck className="text-indigo-600" size={20} />
                    <h3 className="font-black text-gray-900 uppercase tracking-wider text-sm">Entregas em Tempo Real</h3>
                  </div>
                  <div className="space-y-3">
                    {deliveries.length === 0 ? (
                      <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-gray-200">
                        <Package className="mx-auto text-gray-300 mb-2" size={32} />
                        <p className="text-gray-400 text-sm font-medium">Nenhuma entrega em andamento.</p>
                      </div>
                    ) : (
                      deliveries.map((delivery) => (
                        <div key={delivery.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${getStatusColor(delivery.statusEntrega)}`}>
                              <Truck size={24} />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">Pedido #{delivery.numeroVenda}</p>
                              <p className="text-xs text-gray-500 font-medium">
                                {new Date(delivery.createdAt).toLocaleDateString('pt-BR')} às {new Date(delivery.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                          <div className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider text-center ${getStatusColor(delivery.statusEntrega)}`}>
                            {getStatusLabel(delivery.statusEntrega)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </motion.div>
            )}

            {!hasSearched && !loading && (
              <motion.div
                key="waiting-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                  <Search size={32} />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">Aguardando seu código</h3>
                <p className="text-gray-500 max-w-xs mx-auto text-sm font-medium">
                  Insira o código de consulta acima para visualizar o status das suas entregas em tempo real.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <footer className="max-w-3xl mx-auto px-4 py-12 text-center text-gray-400 text-xs font-medium">
          <p>© {new Date().getFullYear()} Sistema de Gerenciamento. Todos os direitos reservados.</p>
        </footer>
      </div>
    </ErrorBoundary>
  );
}

export default function ConsultaPublica() {
  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
          <Loader2 className="animate-spin text-indigo-600" size={48} />
        </div>
      }>
        <ConsultaContent />
      </Suspense>
    </ErrorBoundary>
  );
}
