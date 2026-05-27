'use client';

import React, { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  onSnapshot
} from 'firebase/firestore';
import { db } from '@/firebase';
import { useApp } from '@/components/AppContext';
import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';
import { ProductForm, ProductData } from '@/components/ProductForm';
import { SupplierForm, SupplierData } from '@/components/SupplierForm';
import { PurchaseModal, PurchaseData } from '@/components/PurchaseModal';
import { SecurityLock } from '@/components/SecurityLock';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Toast, ToastType } from '@/components/Toast';
import { Search, Plus, Loader2, Package, ArrowLeft, Edit2, Trash2, Tag, Truck, Barcode, AlertTriangle, ExternalLink, FileText, Check, Printer } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { PurchaseOrderPrint } from '@/components/PurchaseOrderPrint';
import { ShelfLabelsPrint } from '@/components/ShelfLabelsPrint';
import { format } from 'date-fns';
import Link from 'next/link';

export default function ProdutosPage() {
  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-[#F8F9FA]">
        <Navbar />
        <ProdutosContent />
      </main>
    </ErrorBoundary>
  );
}

function ProdutosContent() {
  const { companyConfig } = useApp();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);
  const [purchases, setPurchases] = useState<PurchaseData[]>([]);
  const [lastPurchaseDoc, setLastPurchaseDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMorePurchases, setHasMorePurchases] = useState(true);
  const [loadingMorePurchases, setLoadingMorePurchases] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSupplierFormOpen, setIsSupplierFormOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductData | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<PurchaseData | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<SupplierData | null>(null);
  const [printingPurchase, setPrintingPurchase] = useState<PurchaseData | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'PRODUTOS' | 'COMPRAS' | 'FORNECEDORES'>('PRODUTOS');
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isLabelPrintModalOpen, setIsLabelPrintModalOpen] = useState(false);

  const selectedProductsForLabels = useMemo(() => {
    return products.filter(p => p.id && selectedProductIds.includes(p.id));
  }, [products, selectedProductIds]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [productsSnap, suppliersSnap, purchasesSnap] = await Promise.all([
          getDocs(query(collection(db, 'produtos'), orderBy('nome', 'asc'))),
          getDocs(query(collection(db, 'fornecedores'), orderBy('nome', 'asc'))),
          getDocs(query(collection(db, 'compras'), orderBy('createdAt', 'desc'), limit(10)))
        ]);

        setProducts(productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProductData[]);
        setSuppliers(suppliersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SupplierData[]);
        setPurchases(purchasesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PurchaseData[]);
        
        setLastPurchaseDoc(purchasesSnap.docs[purchasesSnap.docs.length - 1] || null);
        setHasMorePurchases(purchasesSnap.docs.length === 10);
      } catch (error) {
        console.error('Erro ao buscar dados iniciais:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    const isPreview = typeof window !== 'undefined' && (
      window.location.hostname.includes('run.app') || 
      window.location.hostname.includes('localhost')
    );
    const timeoutDuration = isPreview ? 5000 : 15000;

    // Timeout de segurança
    const timeout = setTimeout(() => {
      setLoading(prev => {
        if (prev) {
          console.warn(`ProdutosContent: Timeout de carregamento atingido (${timeoutDuration}ms).`);
          return false;
        }
        return prev;
      });
    }, timeoutDuration);

    return () => {
      clearTimeout(timeout);
    };
  }, []);

  const fetchMorePurchases = async () => {
    if (!lastPurchaseDoc || loadingMorePurchases) return;
    
    setLoadingMorePurchases(true);
    try {
      const q = query(
        collection(db, 'compras'),
        orderBy('createdAt', 'desc'),
        startAfter(lastPurchaseDoc),
        limit(10)
      );
      
      const snapshot = await getDocs(q);
      const newPurchases = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PurchaseData[];
      
      setPurchases(prev => [...prev, ...newPurchases]);
      setLastPurchaseDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMorePurchases(snapshot.docs.length === 10);
    } catch (error) {
      console.error('Erro ao buscar mais compras:', error);
      showToast('Erro ao carregar mais compras.', 'error');
    } finally {
      setLoadingMorePurchases(false);
    }
  };

  const handleSavePurchase = async (data: Omit<PurchaseData, 'id'>) => {
    try {
      let isReceivingNow = false;
      
      if (editingPurchase?.id) {
        if (data.status === 'RECEBIDO' && editingPurchase.status !== 'RECEBIDO') {
          isReceivingNow = true;
        }
      } else {
        if (data.status === 'RECEBIDO') {
          isReceivingNow = true;
        }
      }

      if (isReceivingNow) {
        // Atualizar estoque dos produtos correspondentes no Firestore
        for (const item of data.itens) {
          const productRef = doc(db, 'produtos', item.produtoId);
          const product = products.find(p => p.id === item.produtoId);
          if (product) {
            try {
              await updateDoc(productRef, {
                estoqueAtual: (product.estoqueAtual || 0) + (item.quantidadeRecebida || 0),
                precoCusto: item.precoCusto || product.precoCusto
              });
            } catch (err) {
              handleFirestoreError(err, OperationType.UPDATE, `produtos/${item.produtoId}`);
            }
          }
        }

        // Atualizar os produtos no estado local para que a UI reflita imediatamente
        setProducts(prevProducts => prevProducts.map(p => {
          const item = data.itens.find(i => i.produtoId === p.id);
          if (item) {
            return {
              ...p,
              estoqueAtual: (p.estoqueAtual || 0) + (item.quantidadeRecebida || 0),
              precoCusto: item.precoCusto || p.precoCusto
            };
          }
          return p;
        }));
      }

      if (editingPurchase?.id) {
        const ref = doc(db, 'compras', editingPurchase.id);
        try {
          await updateDoc(ref, data);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `compras/${editingPurchase.id}`);
        }
        
        // Atualizar compra no estado local
        const updatedPurchase = { id: editingPurchase.id, ...data } as PurchaseData;
        setPurchases(prevPurchases => prevPurchases.map(p => p.id === editingPurchase.id ? updatedPurchase : p));
        
        if (isReceivingNow) {
          showToast('Compra finalizada e estoque atualizado!');
        } else {
          showToast('Compra atualizada com sucesso!');
        }
      } else {
        let newDocId = '';
        try {
          const docRef = await addDoc(collection(db, 'compras'), {
            ...data,
            createdAt: new Date().toISOString(),
          });
          newDocId = docRef.id;
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'compras');
        }

        // Adicionar nova compra ao estado local
        const newPurchase = { id: newDocId, ...data, createdAt: new Date().toISOString() } as unknown as PurchaseData;
        setPurchases(prevPurchases => [newPurchase, ...prevPurchases]);
        
        if (isReceivingNow) {
          showToast('Compra finalizada e estoque atualizado!');
        } else {
          showToast('Pedido de compra registrado!');
        }
      }
      setIsPurchaseModalOpen(false);
      setEditingPurchase(null);
    } catch (err: any) {
      console.error('Erro ao salvar compra:', err);
      let message = 'Erro ao salvar compra.';
      try {
        const errData = JSON.parse(err.message);
        if (errData.error) {
          message += ` Detalhes: ${errData.error}`;
        }
      } catch (e) {
        // Not a JSON error
      }
      showToast(message, 'error');
    }
  };

  const handleSaveProduct = async (data: Omit<ProductData, 'id'>) => {
    try {
      if (editingProduct?.id) {
        const ref = doc(db, 'produtos', editingProduct.id);
        try {
          await updateDoc(ref, data);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `produtos/${editingProduct.id}`);
        }
        
        // Atualizar produto no estado local
        const updatedProduct = { id: editingProduct.id, ...data } as ProductData;
        setProducts(prevProducts => prevProducts.map(p => p.id === editingProduct.id ? updatedProduct : p));
        showToast('Produto atualizado com sucesso!');
      } else {
        let newDocId = '';
        try {
          const docRef = await addDoc(collection(db, 'produtos'), {
            ...data,
            createdAt: new Date().toISOString(),
          });
          newDocId = docRef.id;
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'produtos');
        }
        
        // Adicionar produto ao estado local (com ordenação alfabética por nome)
        const newProduct = { id: newDocId, ...data, createdAt: new Date().toISOString() } as ProductData;
        setProducts(prevProducts => [...prevProducts, newProduct].sort((a, b) => a.nome.localeCompare(b.nome)));
        showToast('Produto cadastrado com sucesso!');
      }
      setIsFormOpen(false);
      setEditingProduct(null);
    } catch (err) {
      console.error('Erro ao salvar produto:', err);
      showToast('Erro ao salvar produto.', 'error');
    }
  };

  const handleSaveSupplier = async (data: Omit<SupplierData, 'id'>) => {
    try {
      if (editingSupplier?.id) {
        const ref = doc(db, 'fornecedores', editingSupplier.id);
        try {
          await updateDoc(ref, data);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `fornecedores/${editingSupplier.id}`);
        }
        
        // Atualizar fornecedor no estado local
        const updatedSupplier = { id: editingSupplier.id, ...data } as SupplierData;
        setSuppliers(prevSuppliers => prevSuppliers.map(s => s.id === editingSupplier.id ? updatedSupplier : s));
        showToast('Fornecedor atualizado com sucesso!');
      } else {
        let newDocId = '';
        try {
          const docRef = await addDoc(collection(db, 'fornecedores'), {
            ...data,
            createdAt: new Date().toISOString(),
          });
          newDocId = docRef.id;
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'fornecedores');
        }
        
        // Adicionar fornecedor ao estado local (ordenado por nome)
        const newSupplier = { id: newDocId, ...data, createdAt: new Date().toISOString() } as SupplierData;
        setSuppliers(prevSuppliers => [...prevSuppliers, newSupplier].sort((a, b) => a.nome.localeCompare(b.nome)));
        showToast('Fornecedor cadastrado com sucesso!');
      }
      setIsSupplierFormOpen(false);
      setEditingSupplier(null);
    } catch (err) {
      console.error('Erro ao salvar fornecedor:', err);
      showToast('Erro ao salvar fornecedor.', 'error');
    }
  };

  const handleDeleteSupplier = async () => {
    if (!supplierToDelete) return;
    try {
      try {
        await deleteDoc(doc(db, 'fornecedores', supplierToDelete));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `fornecedores/${supplierToDelete}`);
      }
      
      // Remover do estado local
      setSuppliers(prevSuppliers => prevSuppliers.filter(s => s.id !== supplierToDelete));
      setSupplierToDelete(null);
      showToast('Fornecedor excluído com sucesso!');
    } catch (err) {
      console.error('Erro ao excluir fornecedor:', err);
      showToast('Erro ao excluir fornecedor.', 'error');
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      try {
        await deleteDoc(doc(db, 'produtos', productToDelete));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `produtos/${productToDelete}`);
      }
      
      // Remover do estado local
      setProducts(prevProducts => prevProducts.filter(p => p.id !== productToDelete));
      setProductToDelete(null);
      showToast('Produto excluído com sucesso!');
    } catch (err) {
      console.error('Erro ao excluir produto:', err);
      showToast('Erro ao excluir produto.', 'error');
    }
  };

  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return products.filter(p => 
      p.nome.toLowerCase().includes(term) || 
      p.codigo.toLowerCase().includes(term) ||
      p.codigoBarras?.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  const sortedPurchases = useMemo(() => {
    return [...purchases].sort((a, b) => {
      // ABERTO primeiro
      if (a.status === 'ABERTO' && b.status !== 'ABERTO') return -1;
      if (a.status !== 'ABERTO' && b.status === 'ABERTO') return 1;
      
      // Depois por data (mais recente primeiro)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [purchases]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
        <div className="text-center">
          <p className="text-gray-600 font-bold">Carregando Produtos...</p>
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
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:h-20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl">
              <Package className="text-white" size={24} />
            </div>
            <h1 className="text-xl font-black text-gray-900">Produtos e Compras</h1>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
            <button
              onClick={() => setIsSupplierFormOpen(true)}
              className="flex items-center gap-2 bg-white text-gray-600 px-4 py-2.5 rounded-xl font-bold border border-gray-200 hover:bg-gray-50 transition-all active:scale-95 text-xs sm:text-sm whitespace-nowrap"
            >
              <Truck size={16} className="sm:w-[18px] sm:h-[18px]" />
              Fornecedores
            </button>
            
            <button
              onClick={() => setIsPurchaseModalOpen(true)}
              className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2.5 rounded-xl font-bold hover:bg-emerald-100 transition-all active:scale-95 text-xs sm:text-sm whitespace-nowrap"
            >
              <Plus size={16} className="sm:w-[18px] sm:h-[18px]" />
              Nova Compra
            </button>

            <button
              onClick={() => setIsFormOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 sm:px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95 text-xs sm:text-sm whitespace-nowrap"
            >
              <Plus size={16} className="sm:w-[18px] sm:h-[18px]" />
              Mais Produtos
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-fit">
            <button
              onClick={() => setActiveTab('PRODUTOS')}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'PRODUTOS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Produtos e Serviços
            </button>
            <button
              onClick={() => setActiveTab('COMPRAS')}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'COMPRAS' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Compras
            </button>
            <button
              onClick={() => setActiveTab('FORNECEDORES')}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'FORNECEDORES' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Fornecedores
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          {activeTab === 'PRODUTOS' ? (
            <>
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Pesquisar por nome, código ou código de barras..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>

              {/* Barra de Seleção de Etiquetas de Gôndola */}
              <div className="mb-6 bg-white py-3.5 px-4 sm:px-6 rounded-2xl border border-gray-150 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all col-span-full">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const visibleIds = filteredProducts.map(p => p.id!).filter(Boolean);
                      const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedProductIds.includes(id));
                      
                      if (allVisibleSelected) {
                        setSelectedProductIds(prev => prev.filter(id => !visibleIds.includes(id)));
                      } else {
                        setSelectedProductIds(prev => {
                          const combined = new Set([...prev, ...visibleIds]);
                          return Array.from(combined);
                        });
                      }
                    }}
                    className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-gray-650 hover:text-indigo-650 transition-all select-none"
                  >
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                      filteredProducts.length > 0 && filteredProducts.every(p => selectedProductIds.includes(p.id!))
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-gray-300 bg-gray-50'
                    }`}>
                      {filteredProducts.length > 0 && filteredProducts.every(p => selectedProductIds.includes(p.id!)) && (
                        <Check size={12} className="stroke-[3]" />
                      )}
                    </div>
                    {filteredProducts.length > 0 && filteredProducts.every(p => selectedProductIds.includes(p.id!))
                      ? 'Desmarcar Todos da Lista'
                      : 'Selecionar Todos da Lista'}
                  </button>

                  <div className="h-4 w-px bg-gray-200 hidden sm:block" />
                  
                  <span className="text-xs text-gray-500 font-bold">
                    {selectedProductIds.length} {selectedProductIds.length === 1 ? 'produto selecionado' : 'produtos selecionados'} para etiquetas
                  </span>
                </div>

                {selectedProductIds.length > 0 && (
                  <div className="flex items-center justify-end gap-2 shrink-0">
                    <button
                      onClick={() => setSelectedProductIds([])}
                      className="text-xs font-bold text-gray-400 hover:text-red-500 px-3 py-2 rounded-xl hover:bg-red-50 transition-all select-none"
                    >
                      Limpar Seleção
                    </button>
                    
                    <button
                      onClick={() => setIsLabelPrintModalOpen(true)}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-100 select-none"
                    >
                      <Printer size={14} />
                      Gerar Etiquetas ({selectedProductIds.length})
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-4">
                {filteredProducts.map((product) => (
                  <div 
                    key={product.id} 
                    className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    {/* Informações Principais do Produto */}
                    <div className="flex-1 min-w-0 flex items-start gap-3 sm:gap-4">
                      {/* Checkbox para seleção para etiquetas */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const id = product.id!;
                          setSelectedProductIds(prev => 
                            prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
                          );
                        }}
                        className={`mt-1.5 shrink-0 w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                          selectedProductIds.includes(product.id!)
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                            : 'border-gray-200 hover:border-indigo-400 bg-gray-50'
                        }`}
                        title="Selecionar para etiqueta de gôndola"
                      >
                        {selectedProductIds.includes(product.id!) ? (
                          <Check size={14} className="stroke-[3]" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-gray-300 transition-all" />
                        )}
                      </button>

                      <div className="hidden sm:flex bg-indigo-50 text-indigo-600 p-3 rounded-xl shrink-0 mt-1">
                        <Package size={22} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                            #{product.codigo}
                          </span>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            product.tipo === 'SERVICO' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
                          }`}>
                            {product.tipo || 'PRODUTO'}
                          </span>
                          <span className="text-[10px] font-bold uppercase bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">
                            {product.unidade}
                          </span>
                          {product.estoqueAtual <= product.estoqueCritico && (
                            <span className="flex items-center gap-1 text-[10px] font-bold bg-red-50 text-red-600 px-2 py-0.5 rounded animate-pulse">
                              <AlertTriangle size={10} /> Estoque Crítico
                            </span>
                          )}
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                          {product.nome}
                        </h3>
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5 text-xs text-gray-500">
                          {product.fornecedorNome && (
                            <div className="flex items-center gap-1.5">
                              <Truck size={14} className="text-gray-400" />
                              <span className="font-medium text-gray-400">Fornecedor:</span> {product.fornecedorNome}
                            </div>
                          )}
                          {product.codigoBarras && (
                            <div className="flex items-center gap-1.5">
                              <Barcode size={14} className="text-gray-400" />
                              <span className="font-medium text-gray-400">EAN:</span> {product.codigoBarras}
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <Tag size={14} className="text-gray-400" />
                            <span className="font-medium text-gray-400">Custo:</span> R$ {(product.precoCusto || 0).toFixed(2)} ({product.margemLucro}%)
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Financeiro, Estoque e Ações */}
                    <div className="flex flex-wrap lg:flex-nowrap items-center gap-4 sm:gap-6 justify-between lg:justify-end shrink-0 border-t lg:border-t-0 pt-4 lg:pt-0 border-gray-100">
                      <div className="bg-gray-50/50 px-4 py-2.5 rounded-xl border border-gray-100/50 min-w-[120px]">
                        <p className="text-[10px] uppercase font-bold text-gray-400 mb-0.5">Preço Venda</p>
                        <p className="text-base font-bold text-indigo-600">R$ {(product.precoVenda || 0).toFixed(2)}</p>
                      </div>
                      
                      <div className="bg-gray-50/50 px-4 py-2.5 rounded-xl border border-gray-100/50 min-w-[100px]">
                        <p className="text-[10px] uppercase font-bold text-gray-400 mb-0.5">Estoque</p>
                        <p className={`text-base font-bold ${product.estoqueAtual <= product.estoqueCritico ? 'text-red-600' : 'text-gray-900'}`}>
                          {product.estoqueAtual} <span className="text-xs font-normal text-gray-500">{product.unidade}</span>
                        </p>
                      </div>

                      {/* Ações */}
                      <div className="flex items-center gap-1 bg-gray-50 p-1.5 rounded-xl self-end sm:self-center ml-auto lg:ml-0">
                        {product.linkCatalogo && (
                          <a 
                            href={product.linkCatalogo} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-2 text-emerald-500 hover:bg-emerald-100/50 rounded-lg transition-all"
                            title="Ver no Catálogo WhatsApp"
                          >
                            <ExternalLink size={18} />
                          </a>
                        )}
                        <button 
                          onClick={() => {
                            setEditingProduct(product);
                            setIsFormOpen(true);
                          }}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => setProductToDelete(product.id!)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredProducts.length === 0 && (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                  <Package className="mx-auto text-gray-200 mb-4" size={48} />
                  <p className="text-gray-500 font-medium">Nenhum produto encontrado.</p>
                </div>
              )}
            </>
          ) : activeTab === 'FORNECEDORES' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {suppliers.map((supplier) => (
                  <div key={supplier.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500 px-2 py-1 rounded-md mb-2 inline-block">
                          #{supplier.codigo}
                        </span>
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{supplier.nome}</h3>
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => {
                            setEditingSupplier(supplier);
                            setIsSupplierFormOpen(true);
                          }}
                          className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => setSupplierToDelete(supplier.id!)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-gray-50">
                      <div className="flex items-start gap-2 text-xs text-gray-500">
                        <Tag size={14} className="text-gray-400 mt-0.5" />
                        <div>
                          <span className="font-medium">CNPJ:</span> {supplier.cnpj || 'Não informado'}
                        </div>
                      </div>
                      <div className="flex items-start gap-2 text-xs text-gray-500">
                        <Truck size={14} className="text-gray-400 mt-0.5" />
                        <div>
                          <span className="font-medium">Endereço:</span> {supplier.endereco || 'Não informado'}
                        </div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-2xl mt-4">
                        <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Vendedor / Contato</p>
                        <p className="text-sm font-bold text-gray-900">{supplier.nomeVendedor || 'Não informado'}</p>
                        <p className="text-xs text-gray-500">{supplier.contatoVendedor || 'Sem contato'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {suppliers.length === 0 && (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                  <Truck className="mx-auto text-gray-200 mb-4" size={48} />
                  <p className="text-gray-500 font-medium">Nenhum fornecedor cadastrado.</p>
                  <button
                    onClick={() => setIsSupplierFormOpen(true)}
                    className="mt-4 text-orange-600 font-bold hover:underline"
                  >
                    Cadastrar primeiro fornecedor
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                {sortedPurchases.map((purchase) => (
                  <div key={purchase.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${
                          purchase.status === 'ABERTO' ? 'bg-blue-50 text-blue-600' : 
                          purchase.status === 'RECEBIDO' ? 'bg-emerald-50 text-emerald-600' : 
                          'bg-red-50 text-red-600'
                        }`}>
                          <Truck size={24} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-gray-900">Pedido #{purchase.id?.slice(-6).toUpperCase()}</h3>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                              purchase.status === 'ABERTO' ? 'bg-blue-100 text-blue-700' : 
                              purchase.status === 'RECEBIDO' ? 'bg-emerald-100 text-emerald-700' : 
                              'bg-red-100 text-red-700'
                            }`}>
                              {purchase.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">
                            {purchase.fornecedorNome || 'Sem fornecedor'} • {format(new Date(purchase.createdAt), 'dd/MM/yyyy HH:mm')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right mr-4">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Total</p>
                          <p className="text-lg font-black text-gray-900">R$ {purchase.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setPrintingPurchase(purchase);
                              setIsPrintModalOpen(true);
                            }}
                            className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl font-bold hover:bg-indigo-100 transition-all active:scale-95"
                            title="Gerar Pedido de Compra"
                          >
                            <FileText size={18} />
                            Pedido
                          </button>
                          <button
                            onClick={() => {
                              setEditingPurchase(purchase);
                              setIsPurchaseModalOpen(true);
                            }}
                            className="flex items-center gap-2 bg-gray-50 text-gray-600 px-4 py-2 rounded-xl font-bold hover:bg-gray-100 transition-all active:scale-95"
                          >
                            <Edit2 size={18} />
                            {purchase.status === 'ABERTO' ? 'Conferir' : 'Ver Detalhes'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {hasMorePurchases && (
                  <div className="flex justify-center pt-4">
                    <button
                      onClick={fetchMorePurchases}
                      disabled={loadingMorePurchases}
                      className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-8 py-3 rounded-2xl font-bold hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {loadingMorePurchases ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          Carregando...
                        </>
                      ) : (
                        'Carregar Mais'
                      )}
                    </button>
                  </div>
                )}

                {sortedPurchases.length === 0 && (
                  <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                    <Truck className="mx-auto text-gray-200 mb-4" size={48} />
                    <p className="text-gray-500 font-medium">Nenhuma compra registrada.</p>
                    <button
                      onClick={() => setIsPurchaseModalOpen(true)}
                      className="mt-4 text-emerald-600 font-bold hover:underline"
                    >
                      Registrar primeira compra
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {isFormOpen && (
          <ProductForm
            product={editingProduct}
            products={products}
            suppliers={suppliers}
            onSave={handleSaveProduct}
            onClose={() => {
              setIsFormOpen(false);
              setEditingProduct(null);
            }}
            onNewSupplier={() => setIsSupplierFormOpen(true)}
          />
        )}

        {isPurchaseModalOpen && (
          <PurchaseModal
            purchase={editingPurchase}
            products={products}
            suppliers={suppliers}
            onSave={handleSavePurchase}
            onClose={() => {
              setIsPurchaseModalOpen(false);
              setEditingPurchase(null);
            }}
          />
        )}

        {isPrintModalOpen && printingPurchase && companyConfig && (
          <PurchaseOrderPrint
            purchase={printingPurchase}
            companyConfig={companyConfig}
            onClose={() => {
              setIsPrintModalOpen(false);
              setPrintingPurchase(null);
            }}
          />
        )}

        {isSupplierFormOpen && (
          <SupplierForm
            supplier={editingSupplier}
            suppliers={suppliers}
            onSave={handleSaveSupplier}
            onClose={() => {
              setIsSupplierFormOpen(false);
              setEditingSupplier(null);
            }}
          />
        )}

        <ConfirmModal
          isOpen={!!productToDelete}
          title="Excluir Produto"
          message="Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita."
          onConfirm={handleDeleteProduct}
          onCancel={() => setProductToDelete(null)}
          confirmText="Excluir"
          cancelText="Cancelar"
          type="danger"
        />

        <ConfirmModal
          isOpen={!!supplierToDelete}
          title="Excluir Fornecedor"
          message="Tem certeza que deseja excluir este fornecedor? Esta ação não pode ser desfeita."
          onConfirm={handleDeleteSupplier}
          onCancel={() => setSupplierToDelete(null)}
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

        {/* Floating Action Bar for Quick Label Print */}
        {selectedProductIds.length > 0 && activeTab === 'PRODUTOS' && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[40] bg-[#1E293B] border border-gray-800 text-white px-4 py-3.5 sm:px-6 rounded-2xl shadow-2xl flex items-center gap-4 sm:gap-6 w-[92%] max-w-sm sm:max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300 print:hidden">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[10px] uppercase font-black text-gray-400 tracking-wider">Etiquetas de Gôndola</span>
              <span className="text-xs sm:text-sm font-extrabold text-white truncate">
                {selectedProductIds.length} {selectedProductIds.length === 1 ? 'produto marcado' : 'produtos marcados'}
              </span>
            </div>
            <div className="flex items-center gap-2 ml-auto shrink-0">
              <button
                onClick={() => setSelectedProductIds([])}
                className="text-xs font-bold text-gray-400 hover:text-white px-2.5 py-1.5 rounded-xl hover:bg-slate-800 transition-all select-none"
              >
                Limpar
              </button>
              <button
                onClick={() => setIsLabelPrintModalOpen(true)}
                className="flex items-center gap-1.5 bg-indigo-650 hover:bg-indigo-600 active:scale-95 text-white text-xs font-black px-3.5 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-650/10 select-none"
              >
                <Printer size={13} />
                Gerar ({selectedProductIds.length})
              </button>
            </div>
          </div>
        )}

        {isLabelPrintModalOpen && (
          <ShelfLabelsPrint
            selectedProducts={selectedProductsForLabels}
            onClose={() => setIsLabelPrintModalOpen(false)}
            onPrintSuccess={() => {
              setSelectedProductIds([]);
              setIsLabelPrintModalOpen(false);
              showToast('Etiquetas geradas! Seleção desmarcada com sucesso.', 'success');
            }}
          />
        )}
      </div>
  );
}
