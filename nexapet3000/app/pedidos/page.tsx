'use client';

import React, { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  getDocFromServer,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '@/firebase';
import { OrderList } from '@/components/OrderList';
import { OrderForm } from '@/components/OrderForm';
import { ManualReceiptModal } from '@/components/ManualReceiptModal';
import { OrderData } from '@/types/order';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Toast, ToastType } from '@/components/Toast';
import { Search, Plus, Loader2, Clock, FileText } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { ExpirationWrapper } from '@/components/ExpirationWrapper';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

interface CreditUsage {
  creditId: string;
  amount: number;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function PedidosContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyPending, setShowOnlyPending] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(() => searchParams.get('new_order') === 'true');
  const [editingOrder, setEditingOrder] = useState<OrderData | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<OrderData | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ message, type });
  }, []);
  const [prefilledOrder, setPrefilledOrder] = useState<Partial<OrderData> | null>(() => {
    if (searchParams.get('new_order') === 'true') {
      return {
        codigo_cliente: searchParams.get('codigo') || '',
        cliente_nome: searchParams.get('nome') || '',
        telefone_cliente: searchParams.get('telefone') || '',
        endereco_cliente: searchParams.get('endereco') || '',
        valor_total: searchParams.get('valor') || '',
        descricao_cobranca: searchParams.get('descricao') || '',
        status_pagamento: 'pendente',
        tipodepagamentopixcartao: 'Pix'
      };
    }
    return null;
  });
  const [error, setError] = useState<string | null>(null);

  // Handle clearing query params
  useEffect(() => {
    if (searchParams.get('new_order') === 'true') {
      // Clear params without refreshing
      router.replace('/pedidos');
    }
  }, [searchParams, router]);

  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    setError(`Erro no Firestore: ${errInfo.error}`);
    throw new Error(JSON.stringify(errInfo));
  };

  // Firestore Connection Test
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  // Data Listener
  useEffect(() => {
    // 1. Listen to Pedidos
    const qOrders = query(collection(db, 'pedidos'));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          codigo_cliente: data.codigo_cliente || '',
          cliente_nome: data.cliente_nome || '',
          status_pagamento: data.status_pagamento || 'pendente'
        };
      }) as OrderData[];
      
      setOrders(ordersData);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'pedidos');
      setLoading(false);
    });

    // Timeout de segurança
    const timeout = setTimeout(() => {
      setLoading(prev => {
        if (prev) {
          console.warn('PedidosContent: Timeout de carregamento atingido.');
          return false;
        }
        return prev;
      });
    }, 15000);

    return () => {
      unsubOrders();
      clearTimeout(timeout);
    };
  }, []);

  const handleSaveOrder = async (data: Omit<OrderData, 'id'>, creditsUsed?: CreditUsage[]) => {
    try {
      let orderId = editingOrder?.id;
      if (orderId) {
        const orderRef = doc(db, 'pedidos', orderId);
        await updateDoc(orderRef, {
          ...data,
        });
      } else {
        const docRef = await addDoc(collection(db, 'pedidos'), {
          ...data,
          createdAt: new Date().toISOString(),
        });
        orderId = docRef.id;
      }

      // Handle credits usage
      if (creditsUsed && creditsUsed.length > 0) {
        for (const usage of creditsUsed) {
          const creditRef = doc(db, 'creditos', usage.creditId);
          const creditSnap = await getDocFromServer(creditRef);
          if (creditSnap.exists()) {
            const creditData = creditSnap.data();
            const currentRestante = creditData.valor_restante || 0;
            const newRestante = Math.max(0, currentRestante - usage.amount);
            
            await updateDoc(creditRef, {
              valor_restante: newRestante
            });
          }
        }
      }

      setIsFormOpen(false);
      setEditingOrder(null);
      showToast('Cobrança salva com sucesso!', 'success');
    } catch (err) {
      handleFirestoreError(err, editingOrder ? OperationType.UPDATE : OperationType.CREATE, 'pedidos');
    }
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    try {
      await deleteDoc(doc(db, 'pedidos', orderToDelete));
      setOrderToDelete(null);
      showToast('Cobrança excluída com sucesso!', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `pedidos/${orderToDelete}`);
      showToast('Erro ao excluir cobrança.', 'error');
    }
  };

  const handleUpdateSentDate = async (id: string, date: string) => {
    try {
      const orderRef = doc(db, 'pedidos', id);
      await updateDoc(orderRef, {
        pgtoenviado_dia: date,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `pedidos/${id}`);
    }
  };

  const handleManualReceipt = async (orderId: string, paymentData: {
    method: string;
    date: string;
    receivedValue: number;
    billedValue: number;
  }) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const orderRef = doc(db, 'pedidos', orderId);
      
      // 1. Update original order to Paid with the received value
      await updateDoc(orderRef, {
        status_pagamento: 'Pago',
        pago_em: paymentData.date,
        tipodepagamentopixcartao: paymentData.method,
        valor_total: paymentData.receivedValue.toFixed(2)
      });

      // Record in unified transaction log
      await addDoc(collection(db, 'todas_movimentacoes'), {
        tipo: 'PAGAMENTO_PEDIDO',
        data: new Date().toISOString(),
        clienteId: order.cliente_id || '',
        clienteNome: order.cliente_nome || '',
        clienteCodigoConsulta: order.clienteCodigoConsulta || '',
        detalhes: {
          pedidoId: order.id,
          valorRecebido: paymentData.receivedValue,
          formaPagamento: paymentData.method
        },
        valor: paymentData.receivedValue,
        createdAt: new Date().toISOString()
      });

      // 2. If there's a difference, create a new record in unified history (historico_banhos)
      const difference = paymentData.billedValue - paymentData.receivedValue;
      if (Math.abs(difference) > 0.01) {
        // Find customer ID to link to history
        const customersRef = collection(db, 'clientes');
        const q = query(customersRef, where('codigo', '==', order.codigo_cliente));
        const customerSnap = await getDocs(q);
        
        if (!customerSnap.empty) {
          const customerId = customerSnap.docs[0].id;
          await addDoc(collection(db, 'historico_banhos'), {
            clienteId: customerId,
            clienteNome: order.cliente_nome || '',
            clienteCodigoConsulta: order.clienteCodigoConsulta || '',
            data: paymentData.date,
            status: 'Pendente',
            tipo_pacote: '💰 Restante da Conta Anterior',
            valor: difference,
            pago: false,
            faturado: false,
            createdAt: new Date().toISOString()
          });
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `pedidos/${orderId}`);
    }
  };

  const filteredOrders = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const sortedOrders = [...orders].sort((a, b) => {
      const getVal = (obj: any) => {
        const val = obj.createdAt || obj.pgtogerado_dia || '';
        if (val && typeof val === 'object' && 'seconds' in val) {
          return new Date(val.seconds * 1000).toISOString();
        }
        return String(val);
      };
      
      const valA = getVal(a);
      const valB = getVal(b);
      return valB.localeCompare(valA);
    });

    return sortedOrders.filter(order => {
      const codigo = String(order.codigo_cliente || '').toLowerCase();
      const nome = String(order.cliente_nome || '').toLowerCase();
      const status = String(order.status_pagamento || '').toLowerCase();
      const telefone = String(order.telefone_cliente || '').toLowerCase();
      
      const matchesSearch = codigo.includes(term) || 
                           nome.includes(term) || 
                           status.includes(term) ||
                           telefone.includes(term);
      
      if (showOnlyPending) {
        return matchesSearch && order.status_pagamento?.toLowerCase() === 'pendente';
      }
      
      return matchesSearch;
    });
  }, [orders, searchTerm, showOnlyPending]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
        <div className="text-center">
          <p className="text-gray-600 font-bold">Carregando Pedidos...</p>
          <p className="text-gray-400 text-xs mt-1">Isso pode levar alguns segundos.</p>
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

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20">
      {/* Sub-Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <FileText className="text-white" size={20} />
            </div>
            <h1 className="text-lg font-bold text-gray-900">Controle de Cobranças</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setEditingOrder(null);
                setPrefilledOrder(null);
                setIsFormOpen(true);
              }}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95 text-sm"
            >
              <Plus size={18} />
              Nova Cobrança
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Controls */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Pesquisar por código, nome ou status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            />
          </div>
          
          <div className="flex gap-2 sm:gap-4">
            <button
              onClick={() => setShowOnlyPending(!showOnlyPending)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 sm:px-6 py-3 sm:py-4 rounded-2xl font-bold transition-all border text-xs sm:text-base ${
                showOnlyPending 
                  ? 'bg-amber-100 border-amber-200 text-amber-700 shadow-inner' 
                  : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50 shadow-sm'
              }`}
            >
              <Clock size={18} className={showOnlyPending ? 'animate-pulse' : ''} />
              <span className="whitespace-nowrap">{showOnlyPending ? 'Pendentes' : 'Filtrar'}</span>
            </button>
            <button
              onClick={() => {
                setEditingOrder(null);
                setIsFormOpen(true);
              }}
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white px-3 sm:px-8 py-3 sm:py-4 rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95 text-xs sm:text-base"
            >
              <Plus size={18} />
              <span className="whitespace-nowrap">Nova Cobrança</span>
            </button>
          </div>
        </div>

        {/* List */}
        <OrderList 
          orders={filteredOrders} 
          onEdit={(order) => {
            setEditingOrder(order);
            setIsFormOpen(true);
          }}
          onDelete={(id) => setOrderToDelete(id)}
          onUpdateSentDate={handleUpdateSentDate}
          onManualReceipt={(order) => setReceiptOrder(order)}
        />
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <OrderForm
          key={editingOrder?.id || 'new'}
          order={editingOrder || (prefilledOrder as OrderData)}
          onSave={handleSaveOrder}
          onClose={() => {
            setIsFormOpen(false);
            setEditingOrder(null);
            setPrefilledOrder(null);
          }}
        />
      )}

      {/* Manual Receipt Modal */}
      {receiptOrder && (
        <ManualReceiptModal
          order={receiptOrder}
          onSave={handleManualReceipt}
          onClose={() => setReceiptOrder(null)}
        />
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!orderToDelete}
        title="Excluir Cobrança"
        message="Tem certeza que deseja excluir esta cobrança? Esta ação não pode ser desfeita."
        onConfirm={handleDeleteOrder}
        onCancel={() => setOrderToDelete(null)}
        confirmText="Excluir"
        cancelText="Cancelar"
        type="danger"
      />

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
}

export default function PedidosPage() {
  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-[#F8F9FA]">
        <Navbar />
        <ExpirationWrapper>
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
              <Loader2 className="animate-spin text-indigo-600" size={48} />
              <div className="text-center">
                <p className="text-gray-600 font-bold">Iniciando Pedidos...</p>
              </div>
            </div>
          }>
            <PedidosContent />
          </Suspense>
        </ExpirationWrapper>
      </main>
    </ErrorBoundary>
  );
}
