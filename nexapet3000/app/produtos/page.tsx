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
  orderBy 
} from 'firebase/firestore';
import { db } from '@/firebase';
import { ProductForm, ProductData } from '@/components/ProductForm';
import { SupplierForm, SupplierData } from '@/components/SupplierForm';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Toast, ToastType } from '@/components/Toast';
import { Search, Plus, Loader2, Package, ArrowLeft, Edit2, Trash2, Tag, Truck, Barcode, AlertTriangle, ExternalLink } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { ExpirationWrapper } from '@/components/ExpirationWrapper';
import Link from 'next/link';

export default function ProdutosPage() {
  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-[#F8F9FA]">
        <Navbar />
        <ExpirationWrapper>
          <ProdutosContent />
        </ExpirationWrapper>
      </main>
    </ErrorBoundary>
  );
}

function ProdutosContent() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSupplierFormOpen, setIsSupplierFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductData | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    const qProd = query(collection(db, 'produtos'), orderBy('nome', 'asc'));
    const unsubProd = onSnapshot(qProd, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ProductData[];
      setProducts(data);
      setLoading(false);
    });

    const qSupp = query(collection(db, 'fornecedores'), orderBy('nome', 'asc'));
    const unsubSupp = onSnapshot(qSupp, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SupplierData[];
      setSuppliers(data);
    });

    // Timeout de segurança
    const timeout = setTimeout(() => {
      setLoading(prev => {
        if (prev) {
          console.warn('ProdutosContent: Timeout de carregamento atingido.');
          return false;
        }
        return prev;
      });
    }, 15000);

    return () => {
      unsubProd();
      unsubSupp();
      clearTimeout(timeout);
    };
  }, []);

  const handleSaveProduct = async (data: Omit<ProductData, 'id'>) => {
    try {
      if (editingProduct?.id) {
        const ref = doc(db, 'produtos', editingProduct.id);
        await updateDoc(ref, data);
        showToast('Produto atualizado com sucesso!');
      } else {
        await addDoc(collection(db, 'produtos'), {
          ...data,
          createdAt: new Date().toISOString(),
        });
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
      await addDoc(collection(db, 'fornecedores'), {
        ...data,
        createdAt: new Date().toISOString(),
      });
      showToast('Fornecedor cadastrado com sucesso!');
      setIsSupplierFormOpen(false);
    } catch (err) {
      console.error('Erro ao salvar fornecedor:', err);
      showToast('Erro ao salvar fornecedor.', 'error');
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      await deleteDoc(doc(db, 'produtos', productToDelete));
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
      {/* Sub-Header */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-1.5 rounded-lg">
                <Package className="text-white" size={20} />
              </div>
              <h1 className="text-lg font-bold text-gray-900">Produtos e Serviços</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setIsFormOpen(true);
                }}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95 text-sm"
              >
                <Plus size={18} />
                Novo Produto
              </button>
              <Link
                href="/fornecedores"
                className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl font-bold hover:bg-gray-50 transition-all active:scale-95 text-sm"
              >
                <Truck size={18} />
                Fornecedores
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Pesquisar por nome, código ou código de barras..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <div key={product.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500 px-2 py-1 rounded-md mb-2 inline-block">
                      #{product.codigo}
                    </span>
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{product.nome}</h3>
                    <div className="flex items-center gap-2 mt-1">
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
                  </div>
                  <div className="flex gap-1">
                    {product.linkCatalogo && (
                      <a 
                        href={product.linkCatalogo} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
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
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => setProductToDelete(product.id!)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-50 p-3 rounded-2xl">
                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Preço Venda</p>
                    <p className="text-lg font-bold text-indigo-600">R$ {(product.precoVenda || 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-2xl">
                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Estoque</p>
                    <p className={`text-lg font-bold ${product.estoqueAtual <= product.estoqueCritico ? 'text-red-600' : 'text-gray-900'}`}>
                      {product.estoqueAtual}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-gray-50">
                  {product.fornecedorNome && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Truck size={14} className="text-gray-400" />
                      <span className="font-medium">Fornecedor:</span> {product.fornecedorNome}
                    </div>
                  )}
                  {product.codigoBarras && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Barcode size={14} className="text-gray-400" />
                      <span className="font-medium">EAN:</span> {product.codigoBarras}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Tag size={14} className="text-gray-400" />
                    <span className="font-medium">Custo:</span> R$ {(product.precoCusto || 0).toFixed(2)} ({product.margemLucro}%)
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

        {isSupplierFormOpen && (
          <SupplierForm
            suppliers={suppliers}
            onSave={handleSaveSupplier}
            onClose={() => setIsSupplierFormOpen(false)}
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
