'use client';

import React, { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { 
  collection, 
  onSnapshot, 
  updateDoc, 
  doc, 
  query, 
  where,
  orderBy,
  addDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '@/firebase';
import { Navbar } from '@/components/Navbar';
import { ExpirationWrapper } from '@/components/ExpirationWrapper';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Toast, ToastType } from '@/components/Toast';
import { ConfirmModal } from '@/components/ConfirmModal';
import { 
  Truck, 
  Package, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Phone, 
  Calendar as CalendarIcon, 
  Search, 
  Loader2, 
  ArrowRight,
  DollarSign,
  X,
  Edit2,
  Trash2,
  AlertCircle,
  Plus,
  Minus,
  RotateCcw,
  Printer,
  FileText
} from 'lucide-react';
import { format, parseISO, addDays } from 'date-fns';
import { useRouter } from 'next/navigation';

export default function EntregasPage() {
  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-[#F8F9FA]">
        <Navbar />
        <ExpirationWrapper>
          <EntregasContent />
        </ExpirationWrapper>
      </main>
    </ErrorBoundary>
  );
}

function EntregasContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customersMap, setCustomersMap] = useState<Record<string, { codigo: string; codigoConsulta: string }>>({});
  const [indexMissing, setIndexMissing] = useState(false);
  const [indexBuilding, setIndexBuilding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [deliveryToFinalize, setDeliveryToFinalize] = useState<any | null>(null);
  const [showPixConfirm, setShowPixConfirm] = useState(false);
  const [deliveryForPix, setDeliveryForPix] = useState<any | null>(null);
  const [deliveryToDelete, setDeliveryToDelete] = useState<string | null>(null);
  const [deliveryToEdit, setDeliveryToEdit] = useState<any | null>(null);
  const [finalPaymentMethod, setFinalPaymentMethod] = useState<string>('DINHEIRO');
  const [finalDueDate, setFinalDueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [productSearch, setProductSearch] = useState('');
  const [granelValue, setGranelValue] = useState<string>('');
  const [selectedGranelProduct, setSelectedGranelProduct] = useState<any | null>(null);
  const [companyConfig, setCompanyConfig] = useState<any>(null);

  // Scheduled filter states
  const [scheduledStartDate, setScheduledStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [scheduledEndDate, setScheduledEndDate] = useState(format(addDays(new Date(), 30), 'yyyy-MM-dd'));

  const [editForm, setEditForm] = useState({
    clienteNome: '',
    clienteTelefone: '',
    clienteEndereco: '',
    dataEntrega: '',
    formaPagamento: '',
    statusPagamento: 'A_RECEBER' as 'PAGO' | 'A_RECEBER',
    itens: [] as any[],
    valorTotal: 0
  });

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, 'vendas'),
      where('tipoVenda', '==', 'ENTREGA')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort client-side by createdAt desc
      data.sort((a: any, b: any) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      setDeliveries(data);
      setLoading(false);
      setIndexMissing(false);
      setIndexBuilding(false);
    }, (error) => {
      console.error('Erro ao buscar entregas:', error);
      setLoading(false);
      if (error.message.includes('requires an index')) {
        if (error.message.includes('currently building')) {
          setIndexBuilding(true);
        } else {
          setIndexMissing(true);
        }
      }
    });

    // Fetch products for editing
    const unsubProducts = onSnapshot(collection(db, 'produtos'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch customers for code mapping
    const unsubCustomers = onSnapshot(collection(db, 'clientes'), (snapshot) => {
      const map: Record<string, { codigo: string; codigoConsulta: string }> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        map[doc.id] = { 
          codigo: data.codigo || '', 
          codigoConsulta: data.codigoConsulta || '' 
        };
      });
      setCustomersMap(map);
    });

    const unsubConfig = onSnapshot(doc(db, 'config', 'empresa'), (docSnap) => {
      if (docSnap.exists()) {
        setCompanyConfig(docSnap.data());
      }
    });

    // Timeout de segurança
    const timeout = setTimeout(() => {
      setLoading(prev => {
        if (prev) {
          console.warn('EntregasContent: Timeout de carregamento atingido.');
          return false;
        }
        return prev;
      });
    }, 15000);

    return () => {
      unsubscribe();
      unsubProducts();
      unsubCustomers();
      unsubConfig();
      clearTimeout(timeout);
    };
  }, []);

  const filteredDeliveries = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const filtered = deliveries.filter(d => {
      const matchesSearch = 
        d.clienteNome.toLowerCase().includes(term) || 
        d.numeroVenda.toString().includes(term) ||
        d.clienteTelefone?.toLowerCase().includes(term);
      
      const matchesStatus = statusFilter === 'TODOS' || d.statusEntrega === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    // Separate and sort
    const today = format(new Date(), 'yyyy-MM-dd');
    const forToday = filtered.filter(d => d.dataEntrega === today);
    const scheduled = filtered.filter(d => {
      const isNotToday = d.dataEntrega !== today;
      const matchesDateRange = (!scheduledStartDate || d.dataEntrega >= scheduledStartDate) && 
                               (!scheduledEndDate || d.dataEntrega <= scheduledEndDate);
      return isNotToday && matchesDateRange;
    }).sort((a, b) => (a.dataEntrega || '').localeCompare(b.dataEntrega || ''));

    return { forToday, scheduled };
  }, [deliveries, searchTerm, statusFilter, scheduledStartDate, scheduledEndDate]);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const delivery = deliveries.find(d => d.id === id);
      if (newStatus === 'ENTREGA_CONCLUIDA') {
        setDeliveryToFinalize(delivery);
        setFinalPaymentMethod(delivery.formaPagamento || 'DINHEIRO');
        return;
      }

      await updateDoc(doc(db, 'vendas', id), {
        statusEntrega: newStatus
      });
      showToast('Status da entrega atualizado!');
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      showToast('Erro ao atualizar status.', 'error');
    }
  };

  const finalizeDelivery = async () => {
    if (!deliveryToFinalize) return;

    try {
      const updates: any = {
        statusEntrega: 'ENTREGA_CONCLUIDA',
        statusVenda: 'FINALIZADO',
        formaPagamento: finalPaymentMethod
      };

      if (finalPaymentMethod === 'A_PRAZO') {
        updates.dataVencimento = finalDueDate;
        
        // Add to unified history
        await addDoc(collection(db, 'historico_banhos'), {
          clienteId: deliveryToFinalize.clienteId,
          clienteNome: deliveryToFinalize.clienteNome,
          clienteCodigoConsulta: deliveryToFinalize.clienteCodigoConsulta || '',
          data: format(new Date(), 'yyyy-MM-dd'),
          status: 'Pendente',
          tipo_pacote: `Venda a Prazo no PDV (Entrega) Nº ${deliveryToFinalize.numeroVenda}`,
          valor: deliveryToFinalize.valorTotal,
          pago: false,
          faturado: false,
          descricao: `Venda #${deliveryToFinalize.numeroVenda} - Entrega Finalizada`,
          createdAt: new Date().toISOString()
        });
      }

      await updateDoc(doc(db, 'vendas', deliveryToFinalize.id), updates);

      // Record in unified transaction log
      await addDoc(collection(db, 'todas_movimentacoes'), {
        tipo: 'ENTREGA',
        data: new Date().toISOString(),
        clienteId: deliveryToFinalize.clienteId,
        clienteNome: deliveryToFinalize.clienteNome,
        clienteCodigoConsulta: deliveryToFinalize.clienteCodigoConsulta || '',
        detalhes: {
          numeroVenda: deliveryToFinalize.numeroVenda,
          formaPagamento: finalPaymentMethod,
          itens: deliveryToFinalize.itens || []
        },
        valor: deliveryToFinalize.valorTotal,
        createdAt: new Date().toISOString()
      });

      showToast('Entrega finalizada com sucesso!');
      
      const finalizedDelivery = { ...deliveryToFinalize, formaPagamento: finalPaymentMethod };
      setDeliveryToFinalize(null);

      // Check for PIX charge generation
      if (finalPaymentMethod === 'PIX') {
        setDeliveryForPix(finalizedDelivery);
        setShowPixConfirm(true);
      }
    } catch (err) {
      console.error('Erro ao finalizar entrega:', err);
      showToast('Erro ao finalizar entrega.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deliveryToDelete) return;
    try {
      const delivery = deliveries.find(d => d.id === deliveryToDelete);
      if (delivery?.agendaId) {
        // Update agenda item to remove deliveryId
        await updateDoc(doc(db, 'agenda', delivery.agendaId), {
          deliveryId: null
        });
      }
      await deleteDoc(doc(db, 'vendas', deliveryToDelete));
      setDeliveryToDelete(null);
      showToast('Venda/Entrega excluída com sucesso!');
    } catch (err) {
      console.error('Erro ao excluir:', err);
      showToast('Erro ao excluir.', 'error');
    }
  };

  const handlePixRedirect = () => {
    if (!deliveryForPix) return;
    
    const isBanho = deliveryForPix.statusEntrega === 'CONCLUIR_BANHO';
    const description = isBanho 
      ? `🐶 BANHOS Nº (${deliveryForPix.numeroVenda})` 
      : `🛒 VENDA Nº (${deliveryForPix.numeroVenda})`;
    
    const customerCode = (customersMap[deliveryForPix.clienteId]?.codigo) || deliveryForPix.clienteCodigo || '';
    
    const params = new URLSearchParams({
      new_order: 'true',
      codigo: customerCode,
      nome: deliveryForPix.clienteNome,
      telefone: deliveryForPix.clienteTelefone || '',
      valor: deliveryForPix.valorTotal.toString(),
      descricao: description
    });

    router.push(`/pedidos?${params.toString()}`);
    setShowPixConfirm(false);
    setDeliveryForPix(null);
  };

  const handleEdit = (delivery: any) => {
    setDeliveryToEdit(delivery);
    setEditForm({
      clienteNome: delivery.clienteNome,
      clienteTelefone: delivery.clienteTelefone || '',
      clienteEndereco: delivery.clienteEndereco || '',
      dataEntrega: delivery.dataEntrega || '',
      formaPagamento: delivery.formaPagamento || 'DINHEIRO',
      statusPagamento: delivery.statusPagamento || 'A_RECEBER',
      itens: (delivery.itens || []).map((item: any) => ({
        ...item,
        precoUnitario: item.precoUnitario || item.precoVenda || 0,
        subtotal: item.subtotal || (item.precoUnitario || item.precoVenda || 0) * item.quantidade
      })),
      valorTotal: delivery.valorTotal || 0
    });
    setProductSearch('');
  };

  const updateEditItemQuantity = (index: number, delta: number) => {
    const newItems = [...editForm.itens];
    const item = newItems[index];
    const newQty = Math.max(0.01, item.quantidade + delta);
    
    item.quantidade = newQty;
    item.subtotal = item.precoUnitario * newQty;
    
    const newTotal = newItems.reduce((acc, curr) => acc + curr.subtotal, 0);
    
    setEditForm({
      ...editForm,
      itens: newItems,
      valorTotal: newTotal
    });
  };

  const updateEditItemPrice = (index: number, newPrice: number) => {
    const newItems = [...editForm.itens];
    const item = newItems[index];
    
    item.precoUnitario = newPrice;
    item.subtotal = newPrice * item.quantidade;
    
    const newTotal = newItems.reduce((acc, curr) => acc + curr.subtotal, 0);
    
    setEditForm({
      ...editForm,
      itens: newItems,
      valorTotal: newTotal
    });
  };

  const removeEditItem = (index: number) => {
    const newItems = editForm.itens.filter((_, i) => i !== index);
    const newTotal = newItems.reduce((acc, curr) => acc + curr.subtotal, 0);
    
    setEditForm({
      ...editForm,
      itens: newItems,
      valorTotal: newTotal
    });
  };

  const addProductToEdit = (product: any, qty: number = 1, price?: number) => {
    const existingIndex = editForm.itens.findIndex(item => item.id === product.id);
    const newItems = [...editForm.itens];
    const finalPrice = price !== undefined ? price : product.precoVenda;

    if (existingIndex >= 0) {
      newItems[existingIndex].quantidade += qty;
      newItems[existingIndex].subtotal = newItems[existingIndex].quantidade * newItems[existingIndex].precoUnitario;
    } else {
      newItems.push({
        id: product.id,
        nome: product.nome,
        precoUnitario: finalPrice,
        quantidade: qty,
        unidade: product.unidade,
        subtotal: qty * finalPrice
      });
    }

    const newTotal = newItems.reduce((acc, curr) => acc + curr.subtotal, 0);
    setEditForm({
      ...editForm,
      itens: newItems,
      valorTotal: newTotal
    });
    setProductSearch('');
  };

  const handleGranelEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGranelProduct || !granelValue) return;
    
    const value = parseFloat(granelValue);
    const qty = value / selectedGranelProduct.precoVenda;
    
    addProductToEdit(selectedGranelProduct, qty, selectedGranelProduct.precoVenda);
    setSelectedGranelProduct(null);
    setGranelValue('');
  };

  const saveEdit = async () => {
    if (!deliveryToEdit) return;
    try {
      await updateDoc(doc(db, 'vendas', deliveryToEdit.id), {
        ...editForm
      });

      if (deliveryToEdit.agendaId) {
        // Reflect changes back to agenda
        await updateDoc(doc(db, 'agenda', deliveryToEdit.agendaId), {
          valor: editForm.valorTotal,
          data: editForm.dataEntrega
        });
      }

      showToast('Venda atualizada com sucesso!');
      setDeliveryToEdit(null);
    } catch (err) {
      console.error('Erro ao editar:', err);
      showToast('Erro ao editar venda.', 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NOVA_ENTREGA':
      case 'NOVO_BANHO': return 'bg-purple-50 text-purple-600 border-purple-100';
      case 'EM_SEPARACAO':
      case 'PET_NO_BANHO': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'EM_ROTA':
      case 'CONCLUIR_BANHO': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'ENTREGA_CONCLUIDA': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      default: return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'NOVA_ENTREGA': return 'Nova Entrega';
      case 'NOVO_BANHO': return 'Novo Banho';
      case 'EM_SEPARACAO': return 'Em Separação';
      case 'PET_NO_BANHO': return 'Pet no Banho';
      case 'EM_ROTA': return 'Em Rota';
      case 'CONCLUIR_BANHO': return 'Concluir Banho';
      case 'ENTREGA_CONCLUIDA': return 'Concluída';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
        <div className="text-center">
          <p className="text-gray-600 font-bold">Carregando Entregas...</p>
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
    <ErrorBoundary>
      <main className="min-h-screen bg-[#F8F9FA] pb-20">
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-1.5 rounded-lg">
                <Truck className="text-white" size={20} />
              </div>
              <h1 className="text-lg font-bold text-gray-900">Gerenciamento de Entregas</h1>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Pesquisar por cliente ou número da venda..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
              {['TODOS', 'EM_SEPARACAO', 'EM_ROTA', 'ENTREGA_CONCLUIDA'].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all border whitespace-nowrap ${
                    statusFilter === status 
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                      : 'bg-white border-gray-100 text-gray-500 hover:border-indigo-200'
                  }`}
                >
                  {status === 'TODOS' ? 'Todos' : getStatusLabel(status)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-12">
            {indexBuilding ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-blue-200">
                <Loader2 className="mx-auto text-blue-500 mb-4 animate-spin" size={48} />
                <p className="text-blue-700 font-bold text-lg">Índice em Construção</p>
                <p className="text-blue-600 max-w-md mx-auto mt-2">
                  O Firestore está criando o índice necessário para listar as entregas. Isso pode levar alguns minutos.
                </p>
              </div>
            ) : indexMissing ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-amber-200">
                <AlertCircle className="mx-auto text-amber-500 mb-4" size={48} />
                <p className="text-amber-700 font-bold text-lg">Índice Necessário</p>
                <p className="text-amber-600 max-w-md mx-auto mt-2">
                  O Firestore requer um índice para listar as entregas. Por favor, clique no link fornecido no console do navegador para criá-lo.
                </p>
              </div>
            ) : (
              <>
                {/* Entregas para Hoje */}
                {filteredDeliveries.forToday.length > 0 && (
                  <section className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
                        <Clock size={20} />
                      </div>
                      <h2 className="text-xl font-bold text-gray-900">Entregas para Hoje</h2>
                      <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold">
                        {filteredDeliveries.forToday.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredDeliveries.forToday.map((delivery, index) => (
                        <DeliveryCard 
                          key={delivery.id} 
                          delivery={delivery} 
                          index={index}
                          customerCode={customersMap[delivery.clienteId]?.codigo || delivery.clienteCodigo}
                          customerPortalCode={customersMap[delivery.clienteId]?.codigoConsulta || delivery.clienteCodigoConsulta}
                          companyConfig={companyConfig}
                          onEdit={handleEdit}
                          onDelete={setDeliveryToDelete}
                          onUpdateStatus={updateStatus}
                          getStatusColor={getStatusColor}
                          getStatusLabel={getStatusLabel}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Entregas Agendadas */}
                <section className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
                        <CalendarIcon size={20} />
                      </div>
                      <h2 className="text-xl font-bold text-gray-900">Entregas Agendadas</h2>
                      <span className="bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full text-xs font-bold">
                        {filteredDeliveries.scheduled.length}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-2 px-3 border-r border-gray-100">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">De</span>
                        <input 
                          type="date" 
                          value={scheduledStartDate}
                          onChange={(e) => setScheduledStartDate(e.target.value)}
                          className="bg-transparent border-none text-xs font-bold text-gray-600 focus:ring-0 p-0"
                        />
                      </div>
                      <div className="flex items-center gap-2 px-3">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Até</span>
                        <input 
                          type="date" 
                          value={scheduledEndDate}
                          onChange={(e) => setScheduledEndDate(e.target.value)}
                          className="bg-transparent border-none text-xs font-bold text-gray-600 focus:ring-0 p-0"
                        />
                      </div>
                    </div>
                  </div>

                  {filteredDeliveries.scheduled.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredDeliveries.scheduled.map((delivery, index) => (
                        <DeliveryCard 
                          key={delivery.id} 
                          delivery={delivery} 
                          index={index}
                          customerCode={customersMap[delivery.clienteId]?.codigo || delivery.clienteCodigo}
                          customerPortalCode={customersMap[delivery.clienteId]?.codigoConsulta || delivery.clienteCodigoConsulta}
                          companyConfig={companyConfig}
                          onEdit={handleEdit}
                          onDelete={setDeliveryToDelete}
                          onUpdateStatus={updateStatus}
                          getStatusColor={getStatusColor}
                          getStatusLabel={getStatusLabel}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-100">
                      <CalendarIcon className="mx-auto text-gray-200 mb-2" size={32} />
                      <p className="text-gray-400 font-medium text-sm">Nenhuma entrega agendada para este período.</p>
                    </div>
                  )}
                </section>

                {filteredDeliveries.forToday.length === 0 && filteredDeliveries.scheduled.length === 0 && (
                  <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                    <Truck className="mx-auto text-gray-200 mb-4" size={48} />
                    <p className="text-gray-500 font-medium">Nenhuma entrega encontrada.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Edit Sale Modal */}
        {deliveryToEdit && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col relative">
              
              {/* Granel Value Modal Overlay */}
              {selectedGranelProduct && (
                <div className="absolute inset-0 bg-white/95 z-[60] flex items-center justify-center p-6 animate-in fade-in zoom-in duration-200">
                  <div className="w-full max-w-sm space-y-6">
                    <div className="text-center">
                      <div className="bg-emerald-100 w-16 h-16 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto mb-4">
                        <DollarSign size={32} />
                      </div>
                      <h3 className="text-xl font-black text-gray-900">Venda por Valor</h3>
                      <p className="text-gray-500 font-medium">{selectedGranelProduct.nome}</p>
                    </div>

                    <form onSubmit={handleGranelEditSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Quanto o cliente quer pagar?</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-emerald-600 text-xl">R$</span>
                          <input
                            autoFocus
                            type="number"
                            step="0.01"
                            placeholder="0,00"
                            value={granelValue}
                            onChange={(e) => setGranelValue(e.target.value)}
                            className="w-full pl-12 pr-4 py-5 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none text-2xl font-black text-gray-900 transition-all"
                          />
                        </div>
                        <p className="text-xs text-gray-400 text-center">
                          Preço do KG: R$ {selectedGranelProduct.precoVenda.toFixed(2)}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGranelProduct(null);
                            setGranelValue('');
                          }}
                          className="py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={!granelValue || parseFloat(granelValue) <= 0}
                          className="py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50 disabled:shadow-none"
                        >
                          Adicionar
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-xl font-bold text-gray-900">Editar Venda/Entrega</h2>
                <button onClick={() => setDeliveryToEdit(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-gray-400">Cliente</label>
                    <input 
                      type="text" 
                      value={editForm.clienteNome}
                      onChange={(e) => setEditForm({ ...editForm, clienteNome: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-700 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-gray-400">Telefone</label>
                    <input 
                      type="text" 
                      value={editForm.clienteTelefone}
                      onChange={(e) => setEditForm({ ...editForm, clienteTelefone: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-700 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-gray-400">Endereço</label>
                  <input 
                    type="text" 
                    value={editForm.clienteEndereco}
                    onChange={(e) => setEditForm({ ...editForm, clienteEndereco: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-700 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-gray-400">Data Entrega</label>
                    <input 
                      type="date" 
                      value={editForm.dataEntrega}
                      onChange={(e) => setEditForm({ ...editForm, dataEntrega: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-700 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-gray-400">Pagamento</label>
                    <select 
                      value={editForm.formaPagamento}
                      onChange={(e) => setEditForm({ ...editForm, formaPagamento: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-700 transition-all"
                    >
                      <option value="DINHEIRO">Dinheiro</option>
                      <option value="PIX">PIX</option>
                      <option value="C_CREDITO">Cartão de Crédito</option>
                      <option value="C_DEBITO">Cartão de Débito</option>
                      <option value="A_PRAZO">Venda a Prazo</option>
                      <option value="A_COMBINAR">A Combinar</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-gray-400">Status Pagamento</label>
                    <select 
                      value={editForm.statusPagamento}
                      onChange={(e) => setEditForm({ ...editForm, statusPagamento: e.target.value as 'PAGO' | 'A_RECEBER' })}
                      className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-700 transition-all"
                    >
                      <option value="PAGO">PAGO</option>
                      <option value="A_RECEBER">A RECEBER</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4 border-t pt-6">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-gray-900">Produtos da Venda</h3>
                    <span className="text-indigo-600 font-black">Total: R$ {(editForm.valorTotal || 0).toFixed(2)}</span>
                  </div>

                  {/* Add Product Search */}
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      placeholder="Adicionar novo produto..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-2xl border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-700 transition-all"
                    />
                    
                    {productSearch && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-10 max-h-48 overflow-y-auto custom-scrollbar">
                        {products
                          .filter(p => p.nome.toLowerCase().includes(productSearch.toLowerCase()))
                          .map(product => (
                            <button
                              key={product.id}
                              onClick={() => {
                                if (product.unidade === 'GRANEL') {
                                  setSelectedGranelProduct(product);
                                  setProductSearch('');
                                } else {
                                  addProductToEdit(product);
                                }
                              }}
                              className="w-full px-4 py-3 text-left hover:bg-indigo-50 flex justify-between items-center transition-colors border-b border-gray-50 last:border-0"
                            >
                              <div>
                                <p className="font-bold text-gray-800">{product.nome}</p>
                                <p className="text-xs text-gray-500">Estoque: {product.estoqueAtual || 0} • {product.unidade}</p>
                              </div>
                              <span className="font-black text-indigo-600">R$ {(product.precoVenda || 0).toFixed(2)}</span>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Items List */}
                  <div className="space-y-2">
                    {editForm.itens.map((item, idx) => (
                      <div key={idx} className="flex flex-col bg-gray-50 p-3 rounded-2xl gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-bold text-gray-800 text-sm">{item.nome}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-400 font-bold uppercase">Preço:</span>
                              <input 
                                type="number" 
                                value={isNaN(item.precoUnitario) ? '' : item.precoUnitario}
                                onChange={(e) => updateEditItemPrice(idx, parseFloat(e.target.value) || 0)}
                                className="w-20 px-2 py-1 bg-white border border-gray-200 rounded-lg text-sm font-bold text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                              <span className="text-xs text-gray-400 font-bold uppercase ml-2">Unid: {item.unidade}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center bg-white rounded-xl border border-gray-100 px-2 py-1">
                              <button 
                                onClick={() => updateEditItemQuantity(idx, item.unidade === 'GRANEL' ? -0.1 : -1)}
                                className="p-1 hover:text-indigo-600 transition-colors"
                              >
                                <Minus size={14} />
                              </button>
                              <input 
                                type="number" 
                                value={isNaN(item.quantidade) ? '' : item.quantidade}
                                onChange={(e) => updateEditItemQuantity(idx, (parseFloat(e.target.value) || 0) - item.quantidade)}
                                className="w-12 text-center font-bold text-sm outline-none"
                              />
                              <button 
                                onClick={() => updateEditItemQuantity(idx, item.unidade === 'GRANEL' ? 0.1 : 1)}
                                className="p-1 hover:text-indigo-600 transition-colors"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                            <button 
                              onClick={() => removeEditItem(idx)}
                              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="flex justify-end border-t border-gray-200 pt-2">
                          <span className="text-xs font-bold text-gray-400 uppercase mr-2">Subtotal:</span>
                          <span className="text-sm font-black text-gray-700">R$ {(item.subtotal || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50/50">
                <button 
                  onClick={saveEdit}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                  Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Finalize Delivery Modal */}
        {deliveryToFinalize && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-xl font-bold text-gray-900">Finalizar Entrega</h2>
                <button onClick={() => setDeliveryToFinalize(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                  <p className="text-xs font-bold uppercase text-indigo-600 mb-1">Venda #{deliveryToFinalize.numeroVenda}</p>
                  <p className="font-bold text-indigo-900 text-lg">{deliveryToFinalize.clienteNome}</p>
                  <p className="text-2xl font-black text-indigo-600 mt-2">Total: R$ {(deliveryToFinalize.valorTotal || 0).toFixed(2)}</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Confirmar Forma de Pagamento</label>
                    <select 
                      value={finalPaymentMethod}
                      onChange={(e) => setFinalPaymentMethod(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-700 transition-all"
                    >
                      <option value="DINHEIRO">Dinheiro</option>
                      <option value="PIX">PIX</option>
                      <option value="C_CREDITO">Cartão de Crédito</option>
                      <option value="C_DEBITO">Cartão de Débito</option>
                      <option value="A_PRAZO">Venda a Prazo</option>
                      <option value="A_COMBINAR">A Combinar</option>
                    </select>
                  </div>

                  {finalPaymentMethod === 'A_PRAZO' && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Data de Vencimento</label>
                      <input 
                        type="date" 
                        value={finalDueDate}
                        onChange={(e) => setFinalDueDate(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-700 transition-all"
                      />
                    </div>
                  )}
                </div>

                <button 
                  onClick={finalizeDelivery}
                  className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={20} /> Confirmar e Finalizar Venda
                </button>
              </div>
            </div>
          </div>
        )}

        <ConfirmModal
          isOpen={!!deliveryToDelete}
          title="Excluir Venda/Entrega"
          message="Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita."
          onConfirm={handleDelete}
          onCancel={() => setDeliveryToDelete(null)}
          confirmText="Excluir"
          cancelText="Cancelar"
          type="danger"
        />

        <ConfirmModal
          isOpen={showPixConfirm}
          title="Gerar Cobrança PIX"
          message="Deseja gerar uma cobrança pix para esta venda?"
          onConfirm={handlePixRedirect}
          onCancel={() => {
            setShowPixConfirm(false);
            setDeliveryForPix(null);
          }}
          confirmText="Sim, Gerar"
          cancelText="Não"
        />

        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}
      </main>
    </ErrorBoundary>
  );
}

function DeliveryCard({ delivery, customerCode, customerPortalCode, companyConfig, onEdit, onDelete, onUpdateStatus, getStatusColor, getStatusLabel, index }: any) {
  const router = useRouter();
  const isEven = index % 2 === 0;
  const companyName = companyConfig?.nomeEmpresa || 'CASA DO CRIADOR';
  const companyPhone = companyConfig?.telefoneEmpresa || '';

  const displayStatus = (delivery.origem === 'Agendamento' && delivery.statusEntrega === 'NOVA_ENTREGA') ? 'NOVO_BANHO' : delivery.statusEntrega;

  const sendWhatsApp = (message: string) => {
    if (delivery.clienteTelefone) {
      const phone = delivery.clienteTelefone.replace(/\D/g, '');
      const url = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    }
  };

  const handleConfirm = () => {
    const isBanho = delivery.statusEntrega === 'NOVO_BANHO' || delivery.origem === 'Agendamento';
    const nextStatus = isBanho ? 'PET_NO_BANHO' : 'EM_SEPARACAO';
    
    onUpdateStatus(delivery.id, nextStatus);

    let message = '';
    const portalLink = `${window.location.origin}/consulta?code=${customerPortalCode || delivery.clienteCodigoConsulta || ''}`;
    
    if (isBanho) {
      message = `🟢Oieeeee !, (${customerCode || ''}) *${delivery.clienteNome}*, o Banho do seu Pet 🐕 foi Confirmado aqui na *${companyName}* 😍 - Para mantermos a pontualidade dos nossos serviços, por gentileza nos avisar com antecedência se ocorrer algum imprevisto.  Será cobrado valor adicional se não tiver ninguém em casa, na hora da retirada ou na hora de entrega do Pet – Favor não deixar o Pet se molhar antes do banho. Combinar os detalhes, como horários, procedimentos e valores, com a pessoa que for buscar, ou nesse Whats App. ❤️ Agradecemos muito a preferência e vamos fazer nosso melhor para ter você como nosso cliente. Para duvidas reclamações ou sugestões, e só chamar nesse whats app.🐕\n\n(Para mais informaçoes sobre o pedido acesse : ${portalLink})`;
    } else {
      message = `🛑Olá (${customerCode || ''}) *${delivery.clienteNome}* seu pedido N° (${delivery.numeroVenda}) foi confirmado e já está em ✅ Separação. Logo Atualizaremos Aguarde !.\n\n(Para mais informaçoes sobre o pedido acesse : ${portalLink})`;
    }
    sendWhatsApp(message);
  };

  const handleSairParaEntregas = () => {
    onUpdateStatus(delivery.id, 'EM_ROTA');
    const message = `🛑Olá, *${delivery.clienteNome}*, seu Pedido já está em ✅ *Rota de Entrega*, logo chegaremos !.`;
    sendWhatsApp(message);
  };

  const handleConcluir = () => {
    const isBanho = delivery.statusEntrega === 'CONCLUIR_BANHO' || delivery.origem === 'Agendamento';
    onUpdateStatus(delivery.id, 'ENTREGA_CONCLUIDA');

    let message = '';
    if (isBanho) {
      message = `Olá, *${delivery.clienteNome}* entregamos seu pet, agradecemos muito a preferencia e aguardamos você e seu pet para uma próxima, e sempre que precisar conte com a gente!! se puder avaliar nosso atendimento agradecemos, leva menos que 20 segundos e é muito importante para nos, click no link a baixo e nos avalie por gentileza obrigado https://g.page/r/CccGP8EJCitbEBM/review`;
    } else {
      message = `🛑*${delivery.clienteNome}* , seu Pedido foi ✅ *Entregue*, Obrigado por comprar com a gente. Agradecemos muito e esperamos por você no próximo pedido. Sempre Que precisar estamos a disposição 😀.`;
    }
    sendWhatsApp(message);
  };

  const whatsappUrl = delivery.clienteTelefone 
    ? `https://wa.me/55${delivery.clienteTelefone.replace(/\D/g, '')}` 
    : null;
  
  const mapsUrl = delivery.clienteEndereco 
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(delivery.clienteEndereco)}` 
    : null;

  const handleEmitirCobranca = () => {
    const params = new URLSearchParams({
      new_order: 'true',
      codigo: customerCode || '',
      nome: delivery.clienteNome || '',
      endereco: delivery.clienteEndereco || '',
      telefone: delivery.clienteTelefone || '',
      valor: delivery.valorTotal?.toString() || '0',
      descricao: `cobrança gerada pdv venda nº ${delivery.numeroVenda}`
    });
    router.push(`/pedidos?${params.toString()}`);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (!printWindow) return;

    const itemsHtml = delivery.itens.map((item: any) => `
      <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 2px;">
        <span>${item.quantidade}x ${item.nome}</span>
        <span>R$ ${item.subtotal.toFixed(2)}</span>
      </div>
    `).join('');

    const html = `
      <html>
        <head>
          <title>Impressão de Entrega</title>
          <style>
            @page { margin: 0; }
            body { 
              font-family: 'Helvetica', 'Arial', sans-serif; 
              width: 58mm; 
              padding: 4mm; 
              margin: 0;
              font-size: 14px;
              line-height: 1.3;
              color: #000;
            }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 3mm; margin-bottom: 4mm; }
            .section { margin-bottom: 4mm; border-bottom: 1px dashed #000; padding-bottom: 3mm; }
            .highlight { background: #f0f0f0; padding: 2mm; border: 1px solid #000; }
            .label { font-weight: bold; text-transform: uppercase; font-size: 11px; color: #333; margin-bottom: 1mm; }
            .value-large { display: block; font-size: 18px; font-weight: bold; text-transform: uppercase; line-height: 1.1; margin-bottom: 1mm; }
            .address-large { display: block; font-size: 22px; font-weight: 900; text-transform: uppercase; line-height: 1.1; word-wrap: break-word; }
            .total-section { border-top: 2px solid #000; padding-top: 2mm; margin-top: 2mm; text-align: right; }
            .total-value { font-size: 26px; font-weight: 900; }
            .footer { text-align: center; margin-top: 6mm; font-size: 11px; border-top: 1px dashed #000; padding-top: 3mm; }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="font-size: 18px; font-weight: bold;">${companyName}</div>
            <div style="font-size: 14px; font-weight: bold;">PEDIDO: #${delivery.numeroVenda}</div>
          </div>
          
          <div class="section">
            <div class="label">CLIENTE:</div>
            <div class="value-large">${delivery.clienteNome}</div>
            <div style="font-size: 12px;">Cód: ${customerCode || 'N/A'}</div>
            <div style="font-size: 12px;">Tel: ${delivery.clienteTelefone || 'N/A'}</div>
          </div>

          <div class="section highlight">
            <div class="label">ENDEREÇO DE ENTREGA:</div>
            <div class="address-large">${delivery.clienteEndereco || 'NÃO INFORMADO'}</div>
          </div>

          <div class="section">
            <div class="label">ITENS:</div>
            ${itemsHtml}
          </div>

          <div class="total-section">
            <div class="label">TOTAL A PAGAR:</div>
            <div class="total-value">R$ ${delivery.valorTotal.toFixed(2)}</div>
          </div>

          <div class="section">
            <div class="label">FORMA DE PAGAMENTO:</div>
            <div class="value-large">${delivery.formaPagamento || 'NÃO DEFINIDO'}</div>
          </div>

          <div class="section highlight">
            <div class="label">STATUS DO PAGAMENTO:</div>
            <div class="value-large" style="color: ${delivery.statusPagamento === 'PAGO' ? '#059669' : '#d97706'}">
              ${delivery.statusPagamento === 'PAGO' ? 'PAGO' : 'A RECEBER'}
            </div>
          </div>

          <div class="footer">
            <div style="margin-bottom: 5px;">
              ${companyName}<br/>
              Sempre que Precisar<br/>
              Conte com a Gente !
            </div>
            <div style="font-size: 20px; font-weight: 900; margin: 10px 0;">ZapPet</div>
            <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">${companyPhone}</div>
            <div>Obrigado pela preferência!</div>
            <div>${format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
          </div>

          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className={`rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-all ${isEven ? 'bg-white' : 'bg-gray-100'}`}>
      <div className="p-6 space-y-4 flex-1">
        {delivery.origem === 'Agendamento' && (
          <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-600 rounded-xl text-[10px] font-black uppercase tracking-wider border border-amber-100 mb-2 w-fit">
            <CalendarIcon size={12} />
            Entrega origem agendamento
          </div>
        )}
        <div className="flex flex-wrap justify-between items-start gap-2">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-lg font-bold text-[10px] uppercase tracking-widest ${isEven ? 'bg-gray-100 text-gray-500' : 'bg-white text-gray-600'}`}>
              #{delivery.numeroVenda}
            </span>
            <span className={`px-2 py-1 rounded-lg font-bold text-[10px] uppercase tracking-widest border ${getStatusColor(displayStatus)}`}>
              {getStatusLabel(displayStatus)}
            </span>
          </div>
          <div className="flex gap-1 ml-auto">
            <button 
              onClick={() => onEdit(delivery)}
              className={`p-2 rounded-lg transition-all ${isEven ? 'text-gray-300 hover:text-indigo-600 hover:bg-indigo-50' : 'text-gray-400 hover:text-indigo-700 hover:bg-white'}`}
            >
              <Edit2 size={18} />
            </button>
            <button 
              onClick={() => onDelete(delivery.id)}
              className={`p-2 rounded-lg transition-all ${isEven ? 'text-gray-300 hover:text-red-600 hover:bg-red-50' : 'text-gray-400 hover:text-red-700 hover:bg-white'}`}
            >
              <Trash2 size={18} />
            </button>
            <button 
              onClick={handlePrint}
              className={`p-2 rounded-lg transition-all ${isEven ? 'text-gray-300 hover:text-blue-600 hover:bg-blue-50' : 'text-gray-400 hover:text-blue-700 hover:bg-white'}`}
              title="Imprimir Entrega"
            >
              <Printer size={18} />
            </button>
            <button 
              onClick={handleEmitirCobranca}
              className={`p-2 rounded-lg transition-all ${isEven ? 'text-gray-300 hover:text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:text-emerald-700 hover:bg-white'}`}
              title="Emitir Cobrança"
            >
              <FileText size={18} />
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            {customerCode && (
              <span className={`${isEven ? 'bg-indigo-50 text-indigo-600' : 'bg-white text-indigo-700'} px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider`}>
                Cód: {customerCode}
              </span>
            )}
            <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">{delivery.clienteNome}</h3>
          </div>
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Phone size={14} className="text-emerald-500" />
            {whatsappUrl ? (
              <a 
                href={whatsappUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-emerald-600 hover:underline font-medium transition-colors"
              >
                {delivery.clienteTelefone}
              </a>
            ) : (
              <span>{delivery.clienteTelefone || 'Sem telefone'}</span>
            )}
          </div>
        </div>

        <div className={`${isEven ? 'bg-gray-50' : 'bg-white/60'} p-4 rounded-2xl space-y-3`}>
          <div className="flex items-start gap-3">
            <MapPin size={16} className="text-blue-500 mt-1 flex-shrink-0" />
            {mapsUrl ? (
              <a 
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-600 font-medium hover:text-blue-600 hover:underline transition-colors"
              >
                {delivery.clienteEndereco || 'Endereço não cadastrado'}
              </a>
            ) : (
              <p className="text-sm text-gray-600 font-medium">{delivery.clienteEndereco || 'Endereço não cadastrado'}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <CalendarIcon size={16} className="text-gray-400" />
            <p className="text-sm text-gray-600 font-medium">Entrega: {delivery.dataEntrega ? format(parseISO(delivery.dataEntrega), 'dd/MM/yyyy') : 'Não definida'}</p>
          </div>
          <div className="flex items-center gap-3">
            <DollarSign size={16} className="text-gray-400" />
            <p className="text-sm text-gray-600 font-medium">Pagamento: <span className="font-bold">{delivery.formaPagamento || 'Não definido'}</span></p>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle2 size={16} className={delivery.statusPagamento === 'PAGO' ? 'text-emerald-500' : 'text-amber-500'} />
            <p className="text-sm font-bold uppercase tracking-wider">
              Status: <span className={delivery.statusPagamento === 'PAGO' ? 'text-emerald-600' : 'text-amber-600'}>
                {delivery.statusPagamento === 'PAGO' ? 'PAGO' : 'A RECEBER'}
              </span>
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Itens da Venda</p>
          <div className="max-h-32 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
            {delivery.itens.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-gray-600 font-medium">{item.quantidade}x {item.nome}</span>
                <span className="text-gray-900 font-bold">R$ {(item.subtotal || 0).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 bg-gray-50 border-t border-gray-100 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-500 font-bold uppercase text-xs tracking-widest">Total</span>
          <span className="text-xl font-black text-indigo-600">R$ {(delivery.valorTotal || 0).toFixed(2)}</span>
        </div>

        {delivery.statusEntrega !== 'ENTREGA_CONCLUIDA' && (
          <div className="grid grid-cols-2 gap-2">
            {(delivery.statusEntrega === 'NOVA_ENTREGA' || delivery.statusEntrega === 'NOVO_BANHO') && (
              <button 
                onClick={handleConfirm}
                className="col-span-2 py-3 bg-purple-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-purple-700 transition-all shadow-lg shadow-purple-100"
              >
                <CheckCircle2 size={18} /> Confirmar
              </button>
            )}

            {delivery.statusEntrega === 'EM_SEPARACAO' && (
              <>
                <button 
                  onClick={() => onUpdateStatus(delivery.id, 'NOVA_ENTREGA')}
                  className="py-3 bg-white border border-gray-200 text-gray-500 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-all"
                >
                  <RotateCcw size={18} /> Voltar
                </button>
                <button 
                  onClick={handleSairParaEntregas}
                  className="py-3 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                >
                  <Truck size={18} /> Sair para Entregas
                </button>
              </>
            )}

            {delivery.statusEntrega === 'PET_NO_BANHO' && (
              <>
                <button 
                  onClick={() => onUpdateStatus(delivery.id, 'NOVO_BANHO')}
                  className="py-3 bg-white border border-gray-200 text-gray-500 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-all"
                >
                  <RotateCcw size={18} /> Voltar
                </button>
                <button 
                  onClick={() => onUpdateStatus(delivery.id, 'CONCLUIR_BANHO')}
                  className="py-3 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                >
                  <CheckCircle2 size={18} /> Finalizar Banho
                </button>
              </>
            )}

            {(delivery.statusEntrega === 'EM_ROTA' || delivery.statusEntrega === 'CONCLUIR_BANHO') && (
              <>
                <button 
                  onClick={() => onUpdateStatus(delivery.id, delivery.statusEntrega === 'EM_ROTA' ? 'EM_SEPARACAO' : 'PET_NO_BANHO')}
                  className="py-3 bg-white border border-gray-200 text-gray-500 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-all"
                >
                  <RotateCcw size={18} /> Voltar
                </button>
                <button 
                  onClick={handleConcluir}
                  className="py-3 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                >
                  <CheckCircle2 size={18} /> Concluir
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
