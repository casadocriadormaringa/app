'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  where 
} from 'firebase/firestore';
import { db } from '@/firebase';
import { CustomerList } from '@/components/CustomerList';
import { CustomerForm, CustomerData } from '@/components/CustomerForm';
import { ImportModal } from '@/components/ImportModal';
import { BathHistoryModal } from '@/components/BathHistoryModal';
import { OrderHistoryModal } from '@/components/OrderHistoryModal';
import { CreditModal } from '@/components/CreditModal';
import { OrderForm } from '@/components/OrderForm';
import { BathEditModal } from '@/components/BathEditModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Toast, ToastType } from '@/components/Toast';
import { Search, Plus, Loader2, Users, Upload, Filter, Dog, AlertCircle, FileText, Package, Truck, DollarSign } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { ExpirationWrapper } from '@/components/ExpirationWrapper';
import Link from 'next/link';

export default function Home() {
  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-[#F8F9FA]">
        <Navbar />
        <ExpirationWrapper>
          <HomeContent />
        </ExpirationWrapper>
      </main>
    </ErrorBoundary>
  );
}

function HomeContent() {
  console.log('HomeContent: Renderizando...');
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBanhoTosa, setFilterBanhoTosa] = useState(false);
  const [filterVencidos, setFilterVencidos] = useState(false);
  const [filterPendentes, setFilterPendentes] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerData | null>(null);
  const [creditCustomer, setCreditCustomer] = useState<CustomerData | null>(null);
  const [editingCredit, setEditingCredit] = useState<any | null>(null);
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [editingBath, setEditingBath] = useState<any | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<CustomerData | null>(null);
  const [orderHistoryCustomer, setOrderHistoryCustomer] = useState<CustomerData | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [pendingBaths, setPendingBaths] = useState<any[]>([]);
  const [credits, setCredits] = useState<any[]>([]);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    console.log('HomeContent: Iniciando busca de clientes...');
    const q = query(collection(db, 'clientes'), orderBy('nome', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('HomeContent: Snapshot recebido, docs:', snapshot.size);
      const customersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CustomerData[];
      
      setCustomers(customersData);
      setLoading(false);
      setConnectionError(null);
    }, (err) => {
      console.error('HomeContent: Erro ao buscar clientes:', err);
      setLoading(false);
      if (err.message.includes('the client is offline')) {
        setConnectionError('Erro de conexão: Verifique sua configuração do Firebase.');
      } else {
        setConnectionError(`Erro ao carregar dados: ${err.message}`);
      }
    });

    // Timeout de segurança para não travar no loading infinitamente
    const timeout = setTimeout(() => {
      setLoading(prev => {
        if (prev) {
          console.warn('HomeContent: Timeout de carregamento atingido.');
          return false;
        }
        return prev;
      });
    }, 15000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    const qOrders = query(collection(db, 'pedidos'));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPendingOrders(orders);
    });

    const qBaths = query(collection(db, 'historico_banhos'));
    const unsubBaths = onSnapshot(qBaths, (snapshot) => {
      const baths = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPendingBaths(baths);
    });

    const qCredits = query(collection(db, 'creditos'));
    const unsubCredits = onSnapshot(qCredits, (snapshot) => {
      const creditsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCredits(creditsData);
    });

    return () => {
      unsubOrders();
      unsubBaths();
      unsubCredits();
    };
  }, []);

  const pendingBalances = useMemo(() => {
    const parseCurrency = (val: any): number => {
      if (val === undefined || val === null || val === '') return 0;
      if (typeof val === 'number') return val;
      const cleanVal = String(val).replace(/[R$\s]/g, '').trim();
      if (cleanVal.includes('.') && cleanVal.includes(',')) {
        return parseFloat(cleanVal.replace(/\./g, '').replace(',', '.'));
      }
      if (cleanVal.includes(',')) {
        return parseFloat(cleanVal.replace(',', '.'));
      }
      return parseFloat(cleanVal) || 0;
    };

    const balances: Record<string, number> = {};

    // Initialize all customers with 0
    customers.forEach(customer => {
      if (customer.id) balances[customer.id] = 0;
    });

    // Process Orders
    pendingOrders.forEach(order => {
      const isPaid = String(order.status_pagamento || '').toLowerCase() === 'pago';
      if (!isPaid) {
        const orderCode = String(order.codigo_cliente || '').trim();
        if (!orderCode) return;

        const matchingCustomers = customers.filter(c => 
          String(c.codigo || '').trim() === orderCode
        );
        
        matchingCustomers.forEach(customer => {
          if (customer.id) {
            balances[customer.id] = (balances[customer.id] || 0) + parseCurrency(order.valor_total);
          }
        });
      }
    });

    // Process Baths
    pendingBaths.forEach(bath => {
      const isPaid = bath.pago === true;
      const isCanceled = bath.status === 'Cancelado';
      if (!isPaid && !isCanceled) {
        if (bath.clienteId) {
          balances[bath.clienteId] = (balances[bath.clienteId] || 0) + parseCurrency(bath.valor);
        }
      }
    });

    // Subtract Credits
    credits.forEach(credit => {
      if (credit.clienteId) {
        balances[credit.clienteId] = (balances[credit.clienteId] || 0) - (credit.valor_restante || 0);
      }
    });

    return balances;
  }, [customers, pendingOrders, pendingBaths, credits]);

  const handleSaveCustomer = async (data: Omit<CustomerData, 'id'>) => {
    try {
      if (editingCustomer?.id) {
        const customerRef = doc(db, 'clientes', editingCustomer.id);
        await updateDoc(customerRef, {
          ...data,
        });
      } else {
        await addDoc(collection(db, 'clientes'), {
          ...data,
          createdAt: new Date().toISOString(),
        });
      }
      setIsFormOpen(false);
      setEditingCustomer(null);
    } catch (err) {
      console.error('Erro ao salvar cliente:', err);
    }
  };

  const handleSaveOrder = async (data: any) => {
    try {
      if (editingOrder?.id) {
        const orderRef = doc(db, 'pedidos', editingOrder.id);
        await updateDoc(orderRef, data);
        showToast('Pedido atualizado com sucesso!', 'success');
      } else {
        const { id, ...newData } = data;
        await addDoc(collection(db, 'pedidos'), {
          ...newData,
          createdAt: new Date().toISOString()
        });
        showToast('Pedido salvo com sucesso!', 'success');
      }
      setIsOrderFormOpen(false);
      setEditingOrder(null);
    } catch (err) {
      console.error('Erro ao salvar pedido:', err);
      showToast('Erro ao salvar pedido.', 'error');
    }
  };

  const handleSaveCredit = async (data: any) => {
    try {
      // Find customer name for fallback search
      const customer = customers.find(c => c.id === data.clienteId);
      
      if (data.id) {
        const creditRef = doc(db, 'creditos', data.id);
        const { id, ...updateData } = data;
        
        // Calculate new valor_restante preserving used amount
        let newValorRestante = data.valor;
        if (editingCredit) {
          const usedAmount = (editingCredit.valor || 0) - (editingCredit.valor_restante || 0);
          newValorRestante = Math.max(0, data.valor - usedAmount);
        }

        await updateDoc(creditRef, {
          ...updateData,
          valor: data.valor,
          valor_restante: newValorRestante,
          clienteNome: customer?.nome || '',
        });
        showToast('Crédito atualizado com sucesso!', 'success');
      } else {
        const { id, ...newData } = data;
        await addDoc(collection(db, 'creditos'), {
          ...newData,
          clienteNome: customer?.nome || '',
          valor_restante: data.valor,
          createdAt: new Date().toISOString()
        });
        showToast('Crédito lançado com sucesso!', 'success');
      }
      setCreditCustomer(null);
      setEditingCredit(null);
    } catch (err) {
      console.error('Erro ao salvar crédito:', err);
      showToast('Erro ao salvar crédito.', 'error');
    }
  };

  const handleSaveBath = async (data: any) => {
    try {
      if (data.id) {
        const bathRef = doc(db, 'historico_banhos', data.id);
        const { id, ...updateData } = data;
        await updateDoc(bathRef, updateData);
        showToast('Registro de banho atualizado!', 'success');
      }
      setEditingBath(null);
    } catch (err) {
      console.error('Erro ao salvar banho:', err);
      showToast('Erro ao salvar banho.', 'error');
    }
  };

  const handleImportCustomers = async (data: Omit<CustomerData, 'id'>[]) => {
    try {
      // Import in batch or one by one
      for (const customer of data) {
        await addDoc(collection(db, 'clientes'), customer);
      }
      showToast(`${data.length} clientes importados com sucesso!`, 'success');
    } catch (err) {
      console.error('Erro ao importar clientes:', err);
      showToast('Erro ao importar alguns clientes.', 'error');
    }
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    try {
      await deleteDoc(doc(db, 'clientes', customerToDelete));
      setCustomerToDelete(null);
      showToast('Cliente excluído com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao excluir cliente:', err);
      showToast('Erro ao excluir cliente.', 'error');
    }
  };

  const filteredCustomers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return customers.filter(c => {
      const matchesSearch = 
        c.nome.toLowerCase().includes(term) || 
        c.codigo.toLowerCase().includes(term) ||
        c.telefone.toLowerCase().includes(term);
      
      const matchesFilter = !filterBanhoTosa || c.banho_e_tosa === 'Sim';
      
      const matchesPendente = !filterPendentes || (c.id && pendingBalances[c.id] > 0);
      
      let matchesVencido = true;
      if (filterVencidos) {
        if (!c.data_vencimento) {
          matchesVencido = false;
        } else {
          try {
            const dueDate = new Date(c.data_vencimento);
            dueDate.setHours(0, 0, 0, 0);
            matchesVencido = dueDate < today;
          } catch (e) {
            matchesVencido = false;
          }
        }
      }
      
      return matchesSearch && matchesFilter && matchesVencido && matchesPendente;
    });
  }, [customers, searchTerm, filterBanhoTosa, filterVencidos, filterPendentes, pendingBalances]);

  return (
    <div className="pb-20">
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="animate-spin text-indigo-600" size={48} />
          <div className="text-center">
            <p className="text-gray-600 font-bold">Carregando Clientes...</p>
            <p className="text-gray-400 text-xs mt-1">Isso pode levar alguns segundos.</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all"
          >
            Recarregar Página
          </button>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          {connectionError && (
            <div className="mb-6">
              <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-2xl flex items-center gap-3">
                <AlertCircle size={20} />
                <div>
                  <p className="font-bold">Problema Detectado</p>
                  <p className="text-sm">{connectionError}</p>
                </div>
                <button 
                  onClick={() => window.location.reload()}
                  className="ml-auto bg-red-600 text-white px-4 py-1.5 rounded-xl text-sm font-bold hover:bg-red-700 transition-all"
                >
                  Recarregar
                </button>
              </div>
            </div>
          )}
          
          {/* Sub-Header with Page Title and Actions */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-lg shadow-indigo-100">
                <Users className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Clientes</h1>
                <p className="text-gray-500 text-sm font-medium">Gerenciamento de carteira e banhos</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsImportOpen(true)}
                className="p-3 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all border border-transparent hover:border-indigo-100"
                title="Importar CSV"
              >
                <Upload size={20} />
              </button>
              <button
                onClick={() => {
                  setEditingCustomer(null);
                  setIsFormOpen(true);
                }}
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95"
              >
                <Plus size={20} />
                Novo Cliente
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col lg:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={22} />
              <input
                type="text"
                placeholder="Pesquisar por nome, código ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-14 pr-6 py-4 bg-white rounded-3xl border border-gray-100 shadow-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-lg font-medium"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterBanhoTosa(!filterBanhoTosa)}
                className={`flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-sm font-black transition-all active:scale-95 border ${
                  filterBanhoTosa 
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                    : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Filter size={18} />
                Cliente de Pacote
              </button>
              <button
                onClick={() => setFilterVencidos(!filterVencidos)}
                className={`flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-sm font-black transition-all active:scale-95 border ${
                  filterVencidos 
                    ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-100' 
                    : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <AlertCircle size={18} />
                Vencidos
              </button>
              <button
                onClick={() => setFilterPendentes(!filterPendentes)}
                className={`flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-sm font-black transition-all active:scale-95 border ${
                  filterPendentes 
                    ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-100' 
                    : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <DollarSign size={18} />
                Pendentes
              </button>
            </div>
          </div>

          {/* List */}
          <CustomerList 
            customers={filteredCustomers} 
            pendingBalances={pendingBalances}
            onEdit={(customer) => {
              setEditingCustomer(customer);
              setIsFormOpen(true);
            }}
            onDelete={(id) => setCustomerToDelete(id)}
            onViewHistory={(customer) => setHistoryCustomer(customer)}
            onViewOrderHistory={(customer) => setOrderHistoryCustomer(customer)}
            onAddCredit={(customer) => setCreditCustomer(customer)}
          />
        </div>
      )}

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

        {/* Form Modal */}
        {isFormOpen && (
          <CustomerForm
            customer={editingCustomer}
            customers={customers}
            onSave={handleSaveCustomer}
            onClose={() => {
              setIsFormOpen(false);
              setEditingCustomer(null);
            }}
          />
        )}

        {/* Import Modal */}
        {isImportOpen && (
          <ImportModal
            onImport={handleImportCustomers}
            onClose={() => setIsImportOpen(false)}
          />
        )}

        {/* History Modal */}
        {historyCustomer && (
          <BathHistoryModal
            customer={historyCustomer}
            onClose={() => setHistoryCustomer(null)}
          />
        )}

        {/* Order History Modal */}
        {orderHistoryCustomer && (
          <OrderHistoryModal
            customer={orderHistoryCustomer}
            onEditCredit={(credit) => {
              setEditingCredit(credit);
              setCreditCustomer(orderHistoryCustomer);
            }}
            onEditOrder={(order) => {
              setEditingOrder(order);
              setIsOrderFormOpen(true);
            }}
            onEditBath={(bath) => {
              setEditingBath(bath);
            }}
            onClose={() => setOrderHistoryCustomer(null)}
          />
        )}

        {editingBath && (
          <BathEditModal
            bath={editingBath}
            onSave={handleSaveBath}
            onClose={() => setEditingBath(null)}
          />
        )}

        {isOrderFormOpen && (
          <OrderForm
            order={editingOrder}
            onSave={handleSaveOrder}
            onClose={() => {
              setIsOrderFormOpen(false);
              setEditingOrder(null);
            }}
          />
        )}

        {creditCustomer && (
          <CreditModal
            customerId={creditCustomer.id!}
            customerName={creditCustomer.nome}
            credit={editingCredit}
            onSave={handleSaveCredit}
            onClose={() => {
              setCreditCustomer(null);
              setEditingCredit(null);
            }}
          />
        )}

        {/* Confirm Delete Modal */}
        <ConfirmModal
          isOpen={!!customerToDelete}
          title="Excluir Cliente"
          message="Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita e todos os dados vinculados serão perdidos."
          onConfirm={handleDeleteCustomer}
          onCancel={() => setCustomerToDelete(null)}
          confirmText="Excluir"
          cancelText="Cancelar"
          type="danger"
        />
      </div>
  );
}
