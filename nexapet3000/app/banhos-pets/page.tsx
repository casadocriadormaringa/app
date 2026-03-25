'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  collection, 
  onSnapshot, 
  updateDoc, 
  doc, 
  query, 
  where,
  addDoc 
} from 'firebase/firestore';
import { db } from '@/firebase';
import { CustomerData, Pet } from '@/components/CustomerForm';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ExpirationWrapper } from '@/components/ExpirationWrapper';
import { Navbar } from '@/components/Navbar';
import { 
  Calendar, 
  Search, 
  Loader2, 
  CheckCircle2, 
  Truck, 
  Clock, 
  RotateCcw, 
  XCircle, 
  Check,
  Edit2,
  AlertCircle,
  Dog,
  History,
  MessageCircle,
  DollarSign,
  FileText,
  MapPin
} from 'lucide-react';
import { format, addDays, isBefore, parseISO, startOfDay } from 'date-fns';
import { CustomerForm } from '@/components/CustomerForm';
import { BathHistoryModal } from '@/components/BathHistoryModal';
import { OrderHistoryModal } from '@/components/OrderHistoryModal';
import { CreditModal } from '@/components/CreditModal';
import { OrderForm } from '@/components/OrderForm';
import { BathEditModal } from '@/components/BathEditModal';
import { Toast, ToastType } from '@/components/Toast';

interface PetBathEntry {
  id: string; // customerId_petId
  customerId: string;
  customer: CustomerData;
  pet: Pet;
  status_banho?: 'pendente' | 'em_rota' | 'ok';
}

export default function BanhosPetsPage() {
  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-[#F8F9FA]">
        <Navbar />
        <ExpirationWrapper>
          <BanhosPetsContent />
        </ExpirationWrapper>
      </main>
    </ErrorBoundary>
  );
}

function BanhosPetsContent() {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [startDate, setStartDate] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('banhos_pets_startDate') || format(new Date(), 'yyyy-MM-dd');
    }
    return format(new Date(), 'yyyy-MM-dd');
  });
  const [endDate, setEndDate] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('banhos_pets_endDate') || format(new Date(), 'yyyy-MM-dd');
    }
    return format(new Date(), 'yyyy-MM-dd');
  });

  useEffect(() => {
    localStorage.setItem('banhos_pets_startDate', startDate);
    localStorage.setItem('banhos_pets_endDate', endDate);
  }, [startDate, endDate]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerData | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<CustomerData | null>(null);
  const [orderHistoryCustomer, setOrderHistoryCustomer] = useState<CustomerData | null>(null);
  const [creditCustomer, setCreditCustomer] = useState<CustomerData | null>(null);
  const [editingCredit, setEditingCredit] = useState<any | null>(null);
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [editingBath, setEditingBath] = useState<any | null>(null);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [pendingBaths, setPendingBaths] = useState<any[]>([]);
  const [pendingCredits, setPendingCredits] = useState<any[]>([]);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ message, type });
  }, []);

  const handleWhatsAppChat = (phone: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/55${cleanPhone}`;
    window.open(whatsappUrl, '_blank');
  };

  useEffect(() => {
    const q = query(
      collection(db, 'clientes'), 
      where('banho_e_tosa', '==', 'Sim')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const customersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CustomerData[];
      
      setCustomers(customersData);
      setLoading(false);
    }, (err) => {
      console.error('Erro ao buscar clientes para banhos de pets:', err);
      setLoading(false);
    });

    return () => unsubscribe();
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
      const credits = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((c: any) => (c.valor_restante || 0) > 0);
      setPendingCredits(credits);
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
    customers.forEach(customer => {
      if (customer.id) balances[customer.id] = 0;
    });

    pendingOrders.forEach(order => {
      const isPaid = String(order.status_pagamento || '').toLowerCase() === 'pago';
      if (!isPaid) {
        const orderCode = String(order.codigo_cliente || '').trim();
        if (!orderCode) return;
        const matchingCustomers = customers.filter(c => String(c.codigo || '').trim() === orderCode);
        matchingCustomers.forEach(customer => {
          if (customer.id) {
            balances[customer.id] = (balances[customer.id] || 0) + parseCurrency(order.valor_total);
          }
        });
      }
    });

    pendingBaths.forEach(bath => {
      const isPaid = bath.pago === true;
      const isCanceled = bath.status === 'Cancelado';
      if (!isPaid && !isCanceled) {
        if (bath.clienteId) {
          balances[bath.clienteId] = (balances[bath.clienteId] || 0) + parseCurrency(bath.valor);
        }
      }
    });

    pendingCredits.forEach(credit => {
      if (credit.clienteId) {
        balances[credit.clienteId] = (balances[credit.clienteId] || 0) - (credit.valor_restante || 0);
      }
    });

    return balances;
  }, [customers, pendingOrders, pendingBaths, pendingCredits]);

  const petBathEntries = useMemo(() => {
    const entries: PetBathEntry[] = [];
    customers.forEach(customer => {
      if (customer.pets && customer.pets.length > 0) {
        customer.pets.forEach(pet => {
          if (pet.proximo_banho && pet.proximo_banho >= startDate && pet.proximo_banho <= endDate) {
            entries.push({
              id: `${customer.id}_${pet.id}`,
              customerId: customer.id!,
              customer,
              pet,
              // For status, we might need a way to track per-pet status if needed, 
              // but for now we can use the customer's status or a derived one.
              // The user asked for same logic, so let's check if we should add status to Pet.
              status_banho: (pet as any).status_banho || 'pendente'
            });
          }
        });
      }
    });

    return entries.sort((a, b) => {
      const statusOrder = { 'em_rota': 1, 'pendente': 2, 'ok': 3 };
      const orderA = statusOrder[a.status_banho || 'pendente'];
      const orderB = statusOrder[b.status_banho || 'pendente'];
      if (orderA !== orderB) return orderA - orderB;
      return a.pet.proximo_banho!.localeCompare(b.pet.proximo_banho!);
    });
  }, [customers, startDate, endDate]);

  const handleUpdatePetStatus = async (customerId: string, petId: string, status: 'pendente' | 'em_rota' | 'ok') => {
    try {
      const customer = customers.find(c => c.id === customerId);
      if (!customer) return;

      const updatedPets = customer.pets?.map(p => 
        p.id === petId ? { ...p, status_banho: status } : p
      );

      const customerRef = doc(db, 'clientes', customerId);
      await updateDoc(customerRef, {
        pets: updatedPets
      });
    } catch (err) {
      console.error('Erro ao atualizar status do pet:', err);
    }
  };

  const handleFinalizeOrCancelPet = async (entry: PetBathEntry, isCancel: boolean = false) => {
    try {
      const { customer, pet, customerId } = entry;
      const customerRef = doc(db, 'clientes', customerId);
      
      const currentDate = parseISO(pet.proximo_banho!);
      let nextDate: Date;

      if (pet.tipo_pacote === 'Mensal') {
        nextDate = addDays(currentDate, 7);
      } else if (pet.tipo_pacote === 'Quinzenal') {
        nextDate = addDays(currentDate, 14);
      } else if (pet.tipo_pacote === 'Customizado' && pet.intervalo_customizado) {
        nextDate = addDays(currentDate, pet.intervalo_customizado);
      } else {
        nextDate = addDays(currentDate, 7);
      }

      // Create history record with pet info
      await addDoc(collection(db, 'historico_banhos'), {
        clienteId: customerId,
        clienteNome: customer.nome,
        petNome: pet.nome,
        data: new Date().toISOString(),
        status: isCancel ? 'Cancelado' : 'Concluído',
        tipo_pacote: pet.tipo_pacote,
        descricao: `Pacote (${pet.tipo_pacote}) do pet ${pet.nome}`,
        valor: isCancel ? 0 : (pet.valor_banho_avulso || 0),
        pago: false,
        faturado: false,
        createdAt: new Date().toISOString()
      });

      const updatedPets = customer.pets?.map(p => 
        p.id === pet.id ? { 
          ...p, 
          proximo_banho: format(nextDate, 'yyyy-MM-dd'),
          status_banho: 'pendente' 
        } : p
      );

      await updateDoc(customerRef, {
        pets: updatedPets
      });

      showToast(isCancel ? `Banho de ${pet.nome} cancelado!` : `Banho de ${pet.nome} finalizado! Próximo agendado.`, 'success');
    } catch (err) {
      console.error('Erro ao finalizar/cancelar banho do pet:', err);
      showToast('Erro ao processar operação.', 'error');
    }
  };

  const handleSaveCredit = async (data: any) => {
    try {
      const customer = customers.find(c => c.id === data.clienteId);
      if (data.id) {
        const creditRef = doc(db, 'creditos', data.id);
        const { id, ...updateData } = data;
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

  const getStatusStyles = (status?: string) => {
    switch (status) {
      case 'ok':
        return {
          bg: 'bg-green-50',
          border: 'border-green-100',
          icon: <div className="bg-green-100 p-3 rounded-full text-green-600"><CheckCircle2 size={32} /></div>
        };
      case 'em_rota':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-100',
          icon: <div className="bg-blue-100 p-3 rounded-full text-blue-600"><Truck size={32} /></div>
        };
      default:
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-100',
          icon: <div className="bg-amber-100 p-3 rounded-full text-amber-600"><Clock size={32} /></div>
        };
    }
  };

  const isVencido = (dateStr: string) => {
    const date = parseISO(dateStr);
    const today = startOfDay(new Date());
    return isBefore(date, today);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
        <div className="text-center">
          <p className="text-gray-600 font-bold">Carregando Banhos dos Pets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-600 p-1.5 rounded-lg">
              <Dog className="text-white" size={20} />
            </div>
            <h1 className="text-lg font-bold text-gray-900">Banhos por Pet</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                <Calendar size={14} /> Data Inicial
              </label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                <Calendar size={14} /> Data Final
              </label>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {petBathEntries.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-dashed border-gray-200 text-center">
              <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="text-gray-300" size={32} />
              </div>
              <p className="text-gray-500 font-medium">Nenhum banho de pet agendado para este período.</p>
            </div>
          ) : (
            petBathEntries.map((entry) => {
              const styles = getStatusStyles(entry.status_banho);
              const customer = entry.customer;
              const pet = entry.pet;

              return (
                <div 
                  key={entry.id} 
                  className={`${styles.bg} ${styles.border} p-5 rounded-3xl border shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-center gap-6`}
                >
                  <div className="flex-shrink-0">
                    {styles.icon}
                  </div>

                  <div className="flex-1 text-center md:text-left">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1">
                      <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                        #{customer.codigo}
                      </span>
                      <h3 className="text-lg font-bold text-gray-900">
                        <span className="text-indigo-600">{pet.nome}</span> - {customer.nome}
                      </h3>
                      {pet.proximo_banho && isVencido(pet.proximo_banho) && (
                        <span className="flex items-center gap-1 text-[10px] font-bold bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-100 uppercase tracking-tighter">
                          <AlertCircle size={10} /> Vencido
                        </span>
                      )}
                    </div>
                    {customer.endereco && (
                      <p className="text-xs text-gray-500 mb-2 flex items-center justify-center md:justify-start gap-1">
                        <MapPin size={12} className="text-indigo-400" />
                        {customer.endereco}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 mb-1">
                      Próximo Banho: <span className="font-semibold text-indigo-600">{format(parseISO(pet.proximo_banho!), 'dd/MM/yyyy')}</span>
                    </p>
                    <div className="flex flex-wrap justify-center md:justify-start gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg">
                        {pet.tipo_pacote}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-50 text-gray-500 px-2 py-1 rounded-lg">
                        {pet.dia_semana}
                      </span>
                      {pendingBalances[customer.id!] !== undefined && (
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg flex items-center gap-1 ${
                          pendingBalances[customer.id!] > 0 
                            ? 'bg-red-50 text-red-600' 
                            : pendingBalances[customer.id!] < 0 
                              ? 'bg-green-50 text-green-600' 
                              : 'bg-blue-50 text-blue-600'
                        }`}>
                          <DollarSign size={10} /> 
                          {pendingBalances[customer.id!] >= 0 ? 'Pendente' : 'Crédito'}: R$ {Math.abs(pendingBalances[customer.id!]).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-center gap-2">
                    {customer.telefone && (
                      <button 
                        onClick={() => handleWhatsAppChat(customer.telefone)}
                        className="p-3 bg-green-50 text-green-600 rounded-2xl hover:bg-green-100 transition-colors"
                        title="Abrir WhatsApp"
                      >
                        <MessageCircle size={20} />
                      </button>
                    )}
                    <button 
                      onClick={() => setOrderHistoryCustomer(customer)}
                      className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition-colors"
                      title="Histórico Unificado"
                    >
                      <FileText size={20} />
                    </button>
                    <button 
                      onClick={() => setHistoryCustomer(customer)}
                      className="p-3 bg-amber-50 text-amber-600 rounded-2xl hover:bg-amber-100 transition-colors"
                      title="Ver Histórico"
                    >
                      <History size={20} />
                    </button>
                    <button 
                      onClick={() => handleUpdatePetStatus(customer.id!, pet.id, 'ok')}
                      className="p-3 bg-green-50 text-green-600 rounded-2xl hover:bg-green-100 transition-colors"
                      title="Marcar como OK"
                    >
                      <Check size={20} />
                    </button>
                    <button 
                      onClick={() => handleUpdatePetStatus(customer.id!, pet.id, 'em_rota')}
                      className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 transition-colors"
                      title="Em Rota"
                    >
                      <Truck size={20} />
                    </button>
                    <button 
                      onClick={() => handleUpdatePetStatus(customer.id!, pet.id, 'pendente')}
                      className="p-3 bg-gray-50 text-gray-500 rounded-2xl hover:bg-gray-100 transition-colors"
                      title="Voltar Status"
                    >
                      <RotateCcw size={20} />
                    </button>
                    <button 
                      onClick={() => {
                        setEditingCustomer(customer);
                        setIsFormOpen(true);
                      }}
                      className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition-colors"
                      title="Editar Cliente"
                    >
                      <Edit2 size={20} />
                    </button>
                    <button 
                      onClick={() => handleFinalizeOrCancelPet(entry)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-2xl font-bold text-xs hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
                    >
                      Finalizar Pacote
                    </button>
                    <button 
                      onClick={() => handleFinalizeOrCancelPet(entry, true)}
                      className="p-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-colors"
                      title="Cancelar Banho"
                    >
                      <XCircle size={20} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      {isFormOpen && (
        <CustomerForm
          customer={editingCustomer}
          customers={customers}
          onSave={async (data) => {
            try {
              const customerRef = doc(db, 'clientes', editingCustomer!.id!);
              await updateDoc(customerRef, data);
              setIsFormOpen(false);
              setEditingCustomer(null);
            } catch (err) {
              console.error('Erro ao salvar cliente:', err);
            }
          }}
          onClose={() => {
            setIsFormOpen(false);
            setEditingCustomer(null);
          }}
        />
      )}

      {historyCustomer && (
        <BathHistoryModal
          customer={historyCustomer}
          onClose={() => setHistoryCustomer(null)}
        />
      )}

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

      {editingBath && (
        <BathEditModal
          bath={editingBath}
          onSave={handleSaveBath}
          onClose={() => setEditingBath(null)}
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
    </div>
  );
}
