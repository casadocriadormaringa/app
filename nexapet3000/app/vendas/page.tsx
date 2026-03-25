'use client';

import React, { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  orderBy,
  where,
  getDocs,
  limit,
  deleteDoc
} from 'firebase/firestore';
import { db } from '@/firebase';
import { Navbar } from '@/components/Navbar';
import { ExpirationWrapper } from '@/components/ExpirationWrapper';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Toast, ToastType } from '@/components/Toast';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart, 
  User, 
  Package, 
  Truck, 
  CreditCard, 
  DollarSign, 
  History, 
  CheckCircle2, 
  X, 
  ChevronRight,
  MapPin,
  Phone,
  Calendar as CalendarIcon,
  AlertCircle,
  Loader2,
  UserPlus,
  PackagePlus,
  Eraser,
  FileText
} from 'lucide-react';
import { format, parseISO, isToday } from 'date-fns';
import Link from 'next/link';
import { CustomerData } from '@/components/CustomerForm';
import { ProductData } from '@/components/ProductForm';
import { ConfirmModal } from '@/components/ConfirmModal';
import { CustomerHistoryModal } from '@/components/CustomerHistoryModal';
import { OrderHistoryModal } from '@/components/OrderHistoryModal';

interface SaleItem {
  id: string;
  nome: string;
  precoOriginal: number;
  precoVenda: number;
  quantidade: number;
  unidade: string;
  subtotal: number;
  tipo: 'PRODUTO' | 'SERVICO';
  fornecedorNome?: string;
  petId?: string;
  petNome?: string;
}

export default function VendasPage() {
  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-[#F8F9FA]">
        <Navbar />
        <ExpirationWrapper>
          <VendasContent />
        </ExpirationWrapper>
      </main>
    </ErrorBoundary>
  );
}

function VendasContent() {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<string>('DINHEIRO');
  const [paymentStatus, setPaymentStatus] = useState<'PAGO' | 'A_RECEBER'>('A_RECEBER');
  const [saleType, setSaleType] = useState<'BALCAO' | 'ENTREGA'>('BALCAO');
  const [receivedAmount, setReceivedAmount] = useState<number>(0);
  const [dueDate, setDueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [deliveryDate, setDeliveryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isUnifiedHistoryOpen, setIsUnifiedHistoryOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [showProductResults, setShowProductResults] = useState(false);
  const [granelValue, setGranelValue] = useState<string>('');
  const [selectedGranelProduct, setSelectedGranelProduct] = useState<ProductData | null>(null);
  const [isManualProductModalOpen, setIsManualProductModalOpen] = useState(false);
  const [manualProduct, setManualProduct] = useState({ nome: '', preco: '', quantidade: '1' });
  const [isManualCustomer, setIsManualCustomer] = useState(false);
  const [manualCustomer, setManualCustomer] = useState({ nome: '', telefone: '', endereco: '' });
  const [deliveryInfo, setDeliveryInfo] = useState({ telefone: '', endereco: '' });

  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const q = query(
      collection(db, 'vendas'),
      where('createdAt', '>=', today.toISOString()),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRecentSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error('Erro ao buscar vendas recentes:', error);
      if (error.message.includes('requires an index')) {
        showToast('Erro: Índice do Firestore necessário para vendas recentes.', 'error');
      }
    });

    return () => unsubscribe();
  }, [showToast]);

  const handleDeleteSale = async () => {
    if (!saleToDelete) return;
    try {
      await deleteDoc(doc(db, 'vendas', saleToDelete));
      setSaleToDelete(null);
      showToast('Venda excluída com sucesso!');
    } catch (err) {
      console.error('Erro ao excluir venda:', err);
      showToast('Erro ao excluir venda.', 'error');
    }
  };

  useEffect(() => {
    const unsubCustomers = onSnapshot(query(collection(db, 'clientes'), orderBy('nome', 'asc')), (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CustomerData[]);
    });

    const unsubProducts = onSnapshot(query(collection(db, 'produtos'), orderBy('nome', 'asc')), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProductData[]);
      setLoading(false);
    }, (err) => {
      console.error('VendasContent: Erro ao buscar produtos:', err);
      setLoading(false);
    });

    // Timeout de segurança
    const timeout = setTimeout(() => {
      setLoading(prev => {
        if (prev) {
          console.warn('VendasContent: Timeout de carregamento atingido.');
          return false;
        }
        return prev;
      });
    }, 15000);

    return () => {
      unsubCustomers();
      unsubProducts();
      clearTimeout(timeout);
    };
  }, []);

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return [];
    const term = searchTerm.toLowerCase();
    return customers.filter(c => 
      c.nome.toLowerCase().includes(term) || 
      c.codigo.toLowerCase().includes(term) ||
      c.telefone.toLowerCase().includes(term)
    ).slice(0, 5);
  }, [customers, searchTerm]);

  const filteredProducts = useMemo(() => {
    if (!productSearch) return [];
    const term = productSearch.toLowerCase();
    return products.filter(p => 
      p.nome.toLowerCase().includes(term) || 
      p.codigo.toLowerCase().includes(term) ||
      p.codigoBarras?.toLowerCase().includes(term)
    ).slice(0, 5);
  }, [products, productSearch]);

  const total = useMemo(() => cart.reduce((acc, item) => acc + item.subtotal, 0), [cart]);
  const change = useMemo(() => Math.max(0, receivedAmount - total), [receivedAmount, total]);

  const isBathItem = (item: SaleItem) => {
    return (item.fornecedorNome?.toUpperCase() || '').includes('BANHO') || 
           (item.nome?.toUpperCase() || '').includes('BANHO');
  };

  const addToCart = (product: ProductData, qty: number = 1, price?: number) => {
    const existing = cart.find(item => item.id === product.id);
    const finalPrice = price !== undefined ? price : product.precoVenda;
    
    if (existing) {
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantidade: item.quantidade + qty, subtotal: (item.quantidade + qty) * item.precoVenda }
          : item
      ));
    } else {
      setCart([...cart, {
        id: product.id!,
        nome: product.nome,
        precoOriginal: product.precoVenda,
        precoVenda: finalPrice,
        quantidade: qty,
        unidade: product.unidade,
        subtotal: qty * finalPrice,
        tipo: product.tipo,
        fornecedorNome: product.fornecedorNome
      }]);
    }
    setProductSearch('');
    setShowProductResults(false);
  };

  const updateCartItem = (id: string, updates: Partial<SaleItem>) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newItem = { ...item, ...updates };
        newItem.subtotal = newItem.quantidade * newItem.precoVenda;
        return newItem;
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const handleGranelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGranelProduct || !granelValue) return;
    
    const value = parseFloat(granelValue);
    const qty = value / selectedGranelProduct.precoVenda;
    
    addToCart(selectedGranelProduct, qty, selectedGranelProduct.precoVenda);
    setSelectedGranelProduct(null);
    setGranelValue('');
  };

  const finalizeSale = async () => {
    if (!selectedCustomer && !isManualCustomer) {
      showToast('Selecione um cliente ou preencha os dados do cliente avulso.', 'error');
      return;
    }
    
    if (isManualCustomer && !manualCustomer.nome && !manualCustomer.telefone) {
      showToast('Para cliente avulso, preencha pelo menos o nome ou telefone.', 'error');
      return;
    }

    if (cart.length === 0) {
      showToast('O carrinho está vazio.', 'error');
      return;
    }

    try {
      // Get last sale number
      const salesSnap = await getDocs(query(collection(db, 'vendas'), orderBy('numeroVenda', 'desc'), limit(1)));
      const lastNumber = salesSnap.empty ? 4999 : salesSnap.docs[0].data().numeroVenda;
      const nextNumber = Math.max(lastNumber, 4999) + 1;

      const clienteFinal = selectedCustomer || {
        id: 'AVULSO',
        nome: manualCustomer.nome || 'Consumidor Final',
        telefone: manualCustomer.telefone || '',
        endereco: manualCustomer.endereco || ''
      };

      const hasBanho = cart.some(item => 
        (item.fornecedorNome?.toUpperCase() || '').includes('BANHO') || 
        (item.nome?.toUpperCase() || '').includes('BANHO')
      );
      const initialStatus = hasBanho ? 'NOVO_BANHO' : 'NOVA_ENTREGA';

      const saleData = {
        numeroVenda: nextNumber,
        clienteId: clienteFinal.id || "AVULSO",
        clienteNome: clienteFinal.nome || "Consumidor Final",
        clienteCodigo: (clienteFinal as any).codigo || "",
        clienteCodigoConsulta: (clienteFinal as any).codigoConsulta || "",
        clienteTelefone: saleType === 'ENTREGA' ? (deliveryInfo.telefone || clienteFinal.telefone || "") : (clienteFinal.telefone || ""),
        clienteEndereco: saleType === 'ENTREGA' ? (deliveryInfo.endereco || clienteFinal.endereco || "") : (clienteFinal.endereco || ""),
        itens: cart.map(item => ({
          id: item.id || "MANUAL",
          nome: item.nome || "",
          precoOriginal: item.precoOriginal || 0,
          precoVenda: item.precoVenda || 0,
          quantidade: item.quantidade || 0,
          unidade: item.unidade || "UNIDADE",
          subtotal: item.subtotal || 0,
          tipo: item.tipo || "PRODUTO",
          fornecedorNome: item.fornecedorNome || "",
          petId: item.petId || null,
          petNome: item.petNome || null
        })),
        valorTotal: total || 0,
        valorRecebido: receivedAmount || 0,
        troco: change || 0,
        formaPagamento: paymentMethod || "DINHEIRO",
        statusPagamento: paymentStatus || "A_RECEBER",
        tipoVenda: saleType || "BALCAO",
        statusVenda: saleType === 'BALCAO' ? 'FINALIZADO' : 'ABERTO',
        statusEntrega: saleType === 'ENTREGA' ? initialStatus : null,
        dataVencimento: paymentMethod === 'A_PRAZO' ? (dueDate || null) : null,
        dataEntrega: saleType === 'ENTREGA' ? (deliveryDate || null) : null,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'vendas'), saleData);

      // Record in todas_movimentacoes
      await addDoc(collection(db, 'todas_movimentacoes'), {
        tipo: saleType === 'ENTREGA' ? 'ENTREGA' : 'VENDA_PDV',
        data: new Date().toISOString(),
        clienteId: clienteFinal.id || "AVULSO",
        clienteNome: clienteFinal.nome || "Consumidor Final",
        clienteCodigoConsulta: (clienteFinal as any).codigoConsulta || "",
        detalhes: saleData,
        valor: total || 0,
        createdAt: new Date().toISOString()
      });

      // If A_PRAZO and not AVULSO, add to unified history
      if (paymentMethod === 'A_PRAZO' && clienteFinal.id !== 'AVULSO') {
        const bathItems = cart.filter(item => isBathItem(item));
        const petNames = bathItems.map(item => item.petNome).filter(Boolean).join(', ');
        
        await addDoc(collection(db, 'historico_banhos'), {
          clienteId: clienteFinal.id || "",
          clienteNome: clienteFinal.nome || "",
          clienteCodigoConsulta: (clienteFinal as any).codigoConsulta || "",
          data: format(new Date(), 'yyyy-MM-dd'),
          status: 'Pendente',
          tipo_pacote: `Venda a Prazo no PDV Nº ${nextNumber}`,
          valor: total || 0,
          pago: false,
          faturado: false,
          descricao: `Venda #${nextNumber} - ${cart.length} itens${petNames ? ` (Pets: ${petNames})` : ''}`,
          petId: bathItems.length === 1 ? (bathItems[0].petId || null) : null,
          petNome: bathItems.length === 1 ? (bathItems[0].petNome || null) : null,
          createdAt: new Date().toISOString()
        });
      }

      // Update stock for products (only if they have an ID and are not manual)
      for (const item of cart) {
        if (item.tipo === 'PRODUTO' && item.id !== 'MANUAL') {
          const productRef = doc(db, 'produtos', item.id);
          const product = products.find(p => p.id === item.id);
          if (product) {
            await updateDoc(productRef, {
              estoqueAtual: (product.estoqueAtual || 0) - item.quantidade
            });
          }
        }
      }

      showToast(`Venda #${nextNumber} finalizada com sucesso!`);
      resetSale();
    } catch (err) {
      console.error('Erro ao finalizar venda:', err);
      showToast('Erro ao finalizar venda.', 'error');
    }
  };

  const resetSale = () => {
    setSelectedCustomer(null);
    setIsManualCustomer(false);
    setManualCustomer({ nome: '', telefone: '', endereco: '' });
    setDeliveryInfo({ telefone: '', endereco: '' });
    setCart([]);
    setReceivedAmount(0);
    setPaymentMethod('DINHEIRO');
    setPaymentStatus('A_RECEBER');
    setSaleType('BALCAO');
    setSearchTerm('');
  };

  const handleManualProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualProduct.nome || !manualProduct.preco) return;

    const qty = parseFloat(manualProduct.quantidade) || 1;
    const price = parseFloat(manualProduct.preco) || 0;

    setCart([...cart, {
      id: `MANUAL-${Date.now()}`,
      nome: manualProduct.nome,
      precoOriginal: price,
      precoVenda: price,
      quantidade: qty,
      unidade: 'UN',
      subtotal: qty * price,
      tipo: 'PRODUTO'
    }]);

    setManualProduct({ nome: '', preco: '', quantidade: '1' });
    setIsManualProductModalOpen(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
        <div className="text-center">
          <p className="text-gray-600 font-bold">Carregando PDV...</p>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Customer and Product Selection */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Customer Selection */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
                      <User size={20} />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">Vincular Cliente</h2>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setIsManualCustomer(!isManualCustomer);
                        setSelectedCustomer(null);
                      }}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        isManualCustomer 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {isManualCustomer ? 'Buscar Cliente' : 'Cliente Avulso'}
                    </button>
                    <Link 
                      href="/"
                      className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all"
                      title="Cadastrar Novo Cliente"
                    >
                      <UserPlus size={20} />
                    </Link>
                  </div>
                </div>

                {isManualCustomer ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase">Nome do Cliente</label>
                      <input
                        type="text"
                        placeholder="Nome (Obrigatório se sem telefone)"
                        value={manualCustomer.nome}
                        onChange={(e) => setManualCustomer({ ...manualCustomer, nome: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase">Telefone</label>
                      <input
                        type="text"
                        placeholder="Telefone (Obrigatório se sem nome)"
                        value={manualCustomer.telefone}
                        onChange={(e) => setManualCustomer({ ...manualCustomer, telefone: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase">Endereço (Opcional)</label>
                      <input
                        type="text"
                        placeholder="Endereço completo"
                        value={manualCustomer.endereco}
                        onChange={(e) => setManualCustomer({ ...manualCustomer, endereco: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                ) : !selectedCustomer ? (
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="Buscar por nome, código ou telefone..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setShowCustomerResults(true);
                      }}
                      onFocus={() => setShowCustomerResults(true)}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                    {showCustomerResults && searchTerm && (
                      <div className="absolute z-20 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden">
                        {filteredCustomers.map(c => (
                          <button
                            key={c.id}
                            onClick={() => {
                              setSelectedCustomer(c);
                              setShowCustomerResults(false);
                            }}
                            className="w-full px-6 py-4 text-left hover:bg-indigo-50 flex items-center justify-between group"
                          >
                            <div>
                              <p className="font-bold text-gray-900 group-hover:text-indigo-600">#{c.codigo} - {c.nome}</p>
                              <p className="text-sm text-gray-500">{c.telefone}</p>
                            </div>
                            <ChevronRight size={18} className="text-gray-300 group-hover:text-indigo-400" />
                          </button>
                        ))}
                        {filteredCustomers.length === 0 && (
                          <div className="px-6 py-4 text-gray-500 italic">Nenhum cliente encontrado</div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                    <div className="flex items-center gap-4">
                      <div className="bg-white p-3 rounded-xl text-indigo-600 shadow-sm">
                        <User size={24} />
                      </div>
                      <div>
                        <p className="font-bold text-indigo-900 text-lg">{selectedCustomer.nome}</p>
                        <p className="text-sm text-indigo-600 font-medium">#{selectedCustomer.codigo} • {selectedCustomer.telefone}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setIsUnifiedHistoryOpen(true)}
                        className="p-3 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-all"
                        title="Histórico Unificado"
                      >
                        <FileText size={20} />
                      </button>
                      <button 
                        onClick={() => setIsHistoryOpen(true)}
                        className="p-3 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-all"
                        title="Histórico de Compras"
                      >
                        <History size={20} />
                      </button>
                      <button 
                        onClick={() => setSelectedCustomer(null)}
                        className="p-3 text-red-600 hover:bg-red-100 rounded-xl transition-all"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Product Selection */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
                      <Package size={20} />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">Adicionar Produtos ou Serviços</h2>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setIsManualProductModalOpen(true)}
                      className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-all flex items-center gap-2"
                    >
                      <PackagePlus size={18} /> Produto Manual
                    </button>
                    <Link 
                      href="/produtos"
                      className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all"
                      title="Cadastrar Novo Produto"
                    >
                      <Plus size={20} />
                    </Link>
                  </div>
                </div>

                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Buscar por nome, código ou EAN..."
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setShowProductResults(true);
                    }}
                    onFocus={() => setShowProductResults(true)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                  {showProductResults && productSearch && (
                    <div className="absolute z-20 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden">
                      {filteredProducts.map(p => (
                        <button
                          key={p.id}
                          onClick={() => {
                            if (p.unidade === 'GRANEL') {
                              setSelectedGranelProduct(p);
                              setShowProductResults(false);
                            } else {
                              addToCart(p);
                            }
                          }}
                          className="w-full px-6 py-4 text-left hover:bg-emerald-50 flex items-center justify-between group"
                        >
                          <div>
                            <p className="font-bold text-gray-900 group-hover:text-emerald-600">{p.nome}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-bold uppercase bg-gray-100 text-gray-500 px-2 py-0.5 rounded">#{p.codigo}</span>
                              <span className="text-[10px] font-bold uppercase bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded">{p.unidade}</span>
                              <span className="text-sm font-bold text-emerald-600">R$ {(p.precoVenda || 0).toFixed(2)}</span>
                            </div>
                          </div>
                          <Plus size={18} className="text-gray-300 group-hover:text-emerald-400" />
                        </button>
                      ))}
                      {filteredProducts.length === 0 && (
                        <div className="px-6 py-4 text-gray-500 italic">Nenhum item encontrado</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Cart Items */}
                <div className="mt-8 space-y-4">
                  {cart.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-3xl">
                      <ShoppingCart className="mx-auto text-gray-200 mb-2" size={48} />
                      <p className="text-gray-400 font-medium">Carrinho vazio</p>
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.id} className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100 group">
                        <div className="flex-1">
                          <p className="font-bold text-gray-900">{item.nome}</p>
                          
                          {isBathItem(item) && selectedCustomer?.pets && selectedCustomer.pets.length > 0 && (
                            <div className="mt-2 space-y-1">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Selecionar Pet</label>
                              <select
                                value={item.petId || ''}
                                onChange={(e) => {
                                  const pet = selectedCustomer.pets?.find(p => p.id === e.target.value);
                                  updateCartItem(item.id, { petId: pet?.id, petNome: pet?.nome });
                                }}
                                className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500"
                              >
                                <option value="">Selecione o Pet</option>
                                {selectedCustomer.pets.map(pet => (
                                  <option key={pet.id} value={pet.id}>{pet.nome}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          <div className="flex items-center gap-4 mt-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400 font-bold uppercase">Preço:</span>
                              <input 
                                type="number" 
                                value={isNaN(item.precoVenda) ? '' : item.precoVenda}
                                onChange={(e) => updateCartItem(item.id, { precoVenda: parseFloat(e.target.value) || 0 })}
                                className="w-20 px-2 py-1 bg-white border border-gray-200 rounded-lg text-sm font-bold text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                            <span className="text-xs text-gray-400 font-bold uppercase">Unid: {item.unidade}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                          <button 
                            onClick={() => updateCartItem(item.id, { quantidade: Math.max(0.01, item.quantidade - 1) })}
                            className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-indigo-600 transition-all"
                          >
                            <Minus size={16} />
                          </button>
                          <input 
                            type="number" 
                            value={isNaN(item.quantidade) ? '' : item.quantidade}
                            onChange={(e) => updateCartItem(item.id, { quantidade: parseFloat(e.target.value) || 0 })}
                            className="w-16 text-center font-bold text-gray-900 outline-none"
                          />
                          <button 
                            onClick={() => updateCartItem(item.id, { quantidade: item.quantidade + 1 })}
                            className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-indigo-600 transition-all"
                          >
                            <Plus size={16} />
                          </button>
                        </div>

                        <div className="text-right min-w-[100px]">
                          <p className="text-sm text-gray-400 font-bold uppercase">Subtotal</p>
                          <p className="font-bold text-gray-900">R$ {(item.subtotal || 0).toFixed(2)}</p>
                        </div>

                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="p-3 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Checkout */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm sticky top-24">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-indigo-600 p-2 rounded-xl text-white">
                    <DollarSign size={20} />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">Finalizar Venda</h2>
                </div>

                <div className="space-y-6">
                  {/* Sale Type */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Tipo de Venda</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => setSaleType('BALCAO')}
                        className={`py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all border ${
                          saleType === 'BALCAO' 
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                            : 'bg-white border-gray-100 text-gray-500 hover:border-indigo-200'
                        }`}
                      >
                        <ShoppingCart size={18} /> Balcão
                      </button>
                      <button 
                        onClick={() => setSaleType('ENTREGA')}
                        className={`py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all border ${
                          saleType === 'ENTREGA' 
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                            : 'bg-white border-gray-100 text-gray-500 hover:border-indigo-200'
                        }`}
                      >
                        <Truck size={18} /> Entrega
                      </button>
                    </div>
                  </div>

                  {/* Delivery Info */}
                  {saleType === 'ENTREGA' && (selectedCustomer || isManualCustomer) && (
                    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-amber-600">Endereço de Entrega</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400" size={16} />
                          <input 
                            type="text" 
                            placeholder="Endereço de entrega"
                            value={deliveryInfo.endereco || (selectedCustomer?.endereco || manualCustomer.endereco || '')}
                            onChange={(e) => setDeliveryInfo({ ...deliveryInfo, endereco: e.target.value })}
                            className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-amber-200 text-sm font-medium text-amber-900 outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-amber-600">Telefone para Contato</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400" size={16} />
                          <input 
                            type="text" 
                            placeholder="Telefone para entrega"
                            value={deliveryInfo.telefone || (selectedCustomer?.telefone || manualCustomer.telefone || '')}
                            onChange={(e) => setDeliveryInfo({ ...deliveryInfo, telefone: e.target.value })}
                            className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-amber-200 text-sm font-medium text-amber-900 outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-amber-600">Data da Entrega</label>
                        <div className="relative">
                          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400" size={16} />
                          <input 
                            type="date" 
                            value={deliveryDate}
                            onChange={(e) => setDeliveryDate(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-amber-200 text-sm font-bold text-amber-900 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Payment Method */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Forma de Pagamento</label>
                    <select 
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
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

                  {/* Payment Status Selection */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Status do Pagamento</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setPaymentStatus('PAGO')}
                        className={`py-3 px-4 rounded-2xl font-bold text-sm transition-all border-2 ${
                          paymentStatus === 'PAGO'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                            : 'bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        PAGO
                      </button>
                      <button
                        onClick={() => setPaymentStatus('A_RECEBER')}
                        className={`py-3 px-4 rounded-2xl font-bold text-sm transition-all border-2 ${
                          paymentStatus === 'A_RECEBER'
                            ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-sm'
                            : 'bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        A RECEBER
                      </button>
                    </div>
                  </div>

                  {/* Due Date for A_PRAZO */}
                  {paymentMethod === 'A_PRAZO' && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Data de Vencimento</label>
                      <input 
                        type="date" 
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-700 transition-all"
                      />
                    </div>
                  )}

                  {/* Received and Change */}
                  {paymentMethod === 'DINHEIRO' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Valor Recebido</label>
                        <input 
                          type="number" 
                          value={isNaN(receivedAmount) ? '' : receivedAmount}
                          onChange={(e) => setReceivedAmount(parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-700 transition-all"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2 text-right">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Troco</label>
                        <p className="text-2xl font-black text-emerald-600">R$ {(change || 0).toFixed(2)}</p>
                      </div>
                    </div>
                  )}

                  {/* Totals */}
                  <div className="pt-6 border-t border-gray-100 space-y-2">
                    <div className="flex justify-between items-center text-gray-500 font-bold uppercase text-xs tracking-widest">
                      <span>Subtotal</span>
                      <span>R$ {(total || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-900 font-black text-lg uppercase tracking-tighter">Total</span>
                      <span className="text-3xl font-black text-indigo-600">R$ {(total || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={resetSale}
                      className="py-4 bg-gray-100 text-gray-600 rounded-3xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-all"
                    >
                      <Eraser size={20} /> Limpar
                    </button>
                    <button 
                      onClick={finalizeSale}
                      disabled={cart.length === 0 || (!selectedCustomer && !isManualCustomer)}
                      className="py-4 bg-indigo-600 text-white rounded-3xl font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                      <CheckCircle2 size={24} />
                      {saleType === 'BALCAO' ? 'Finalizar' : 'Agendar'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Sales Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="bg-gray-100 p-2 rounded-xl text-gray-500">
                <History size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Vendas Recentes</h2>
                <p className="text-sm text-gray-500 font-medium">Últimas 10 vendas realizadas hoje</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentSales.map((sale) => (
              <div key={sale.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-all">
                <div className="p-6 space-y-4 flex-1">
                  <div className="flex justify-between items-start">
                    <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-lg font-bold text-xs uppercase tracking-widest">
                      #{sale.numeroVenda}
                    </span>
                    <button 
                      onClick={() => setSaleToDelete(sale.id)}
                      className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{sale.clienteNome}</h3>
                    <p className="text-sm text-gray-500 font-medium">{format(parseISO(sale.createdAt), 'HH:mm')} - {sale.tipoVenda}</p>
                  </div>

                  <div className="space-y-1">
                    {sale.itens.slice(0, 2).map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-xs font-medium text-gray-500">
                        <span>{item.quantidade}x {item.nome}</span>
                        <span>R$ {(item.subtotal || 0).toFixed(2)}</span>
                      </div>
                    ))}
                    {sale.itens.length > 2 && (
                      <p className="text-xs text-indigo-600 font-bold">+{sale.itens.length - 2} outros itens</p>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{sale.formaPagamento.replace('_', ' ')}</span>
                  <span className="text-lg font-black text-indigo-600">R$ {(sale.valorTotal || 0).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>

          {recentSales.length === 0 && (
            <div className="text-center py-12 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
              <ShoppingCart className="mx-auto text-gray-200 mb-4" size={48} />
              <p className="text-gray-500 font-medium">Nenhuma venda realizada recentemente.</p>
            </div>
          )}
        </div>

        {/* Manual Product Modal */}
        {isManualProductModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-xl font-bold text-gray-900">Produto Manual</h2>
                <button onClick={() => setIsManualProductModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleManualProductSubmit} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Descrição do Produto</label>
                  <input 
                    type="text" 
                    required
                    autoFocus
                    value={manualProduct.nome}
                    onChange={(e) => setManualProduct({ ...manualProduct, nome: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-gray-700 transition-all"
                    placeholder="Ex: Produto não cadastrado"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Preço Unitário (R$)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      value={manualProduct.preco}
                      onChange={(e) => setManualProduct({ ...manualProduct, preco: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-gray-700 transition-all"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Quantidade</label>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      value={manualProduct.quantidade}
                      onChange={(e) => setManualProduct({ ...manualProduct, quantidade: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-gray-700 transition-all"
                      placeholder="1"
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                >
                  Adicionar ao Carrinho
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Granel Modal */}
        {selectedGranelProduct && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-xl font-bold text-gray-900">Venda a Granel</h2>
                <button onClick={() => setSelectedGranelProduct(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleGranelSubmit} className="p-6 space-y-4">
                <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                  <p className="text-xs font-bold uppercase text-indigo-600 mb-1">Produto</p>
                  <p className="font-bold text-indigo-900">{selectedGranelProduct.nome}</p>
                  <p className="text-sm font-medium text-indigo-600">Preço por {selectedGranelProduct.unidade}: R$ {(selectedGranelProduct.precoVenda || 0).toFixed(2)}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Quanto o cliente quer pagar? (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    autoFocus
                    value={granelValue}
                    onChange={(e) => setGranelValue(e.target.value)}
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-black text-2xl text-indigo-600 transition-all"
                    placeholder="0.00"
                  />
                </div>
                {granelValue && (
                  <div className="flex items-center gap-2 text-indigo-600 font-bold bg-indigo-50 p-3 rounded-xl">
                    <AlertCircle size={18} />
                    <p className="text-sm">Quantidade calculada: {(parseFloat(granelValue) / (selectedGranelProduct.precoVenda || 1)).toFixed(3)} {selectedGranelProduct.unidade}</p>
                  </div>
                )}
                <button 
                  type="submit"
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                  Adicionar ao Carrinho
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Customer History Modal */}
        {isHistoryOpen && selectedCustomer && (
          <CustomerHistoryModal 
            customer={selectedCustomer}
            onClose={() => setIsHistoryOpen(false)}
          />
        )}

        {/* Unified History Modal */}
        {isUnifiedHistoryOpen && selectedCustomer && (
          <OrderHistoryModal 
            customer={selectedCustomer}
            onClose={() => setIsUnifiedHistoryOpen(false)}
          />
        )}

        <ConfirmModal
          isOpen={!!saleToDelete}
          title="Excluir Venda"
          message="Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita."
          onConfirm={handleDeleteSale}
          onCancel={() => setSaleToDelete(null)}
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
      </main>
    </ErrorBoundary>
  );
}
