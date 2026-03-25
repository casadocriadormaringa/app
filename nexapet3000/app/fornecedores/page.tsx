'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { SupplierForm, SupplierData } from '@/components/SupplierForm';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Toast, ToastType } from '@/components/Toast';
import { Search, Plus, Loader2, Truck, ArrowLeft, Edit2, Trash2, MapPin, Phone, User } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import Link from 'next/link';

export default function FornecedoresPage() {
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierData | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'fornecedores'), orderBy('nome', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SupplierData[];
      setSuppliers(data);
      setLoading(false);
    }, (err) => {
      console.error('Erro ao buscar fornecedores:', err);
      setLoading(false);
    });

    // Timeout de segurança
    const timeout = setTimeout(() => {
      setLoading(prev => {
        if (prev) {
          console.warn('FornecedoresPage: Timeout de carregamento atingido.');
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

  const handleSaveSupplier = async (data: Omit<SupplierData, 'id'>) => {
    try {
      if (editingSupplier?.id) {
        const ref = doc(db, 'fornecedores', editingSupplier.id);
        await updateDoc(ref, data);
        showToast('Fornecedor atualizado com sucesso!');
      } else {
        await addDoc(collection(db, 'fornecedores'), {
          ...data,
          createdAt: new Date().toISOString(),
        });
        showToast('Fornecedor cadastrado com sucesso!');
      }
      setIsFormOpen(false);
      setEditingSupplier(null);
    } catch (err) {
      console.error('Erro ao salvar fornecedor:', err);
      showToast('Erro ao salvar fornecedor.', 'error');
    }
  };

  const handleDeleteSupplier = async () => {
    if (!supplierToDelete) return;
    try {
      await deleteDoc(doc(db, 'fornecedores', supplierToDelete));
      setSupplierToDelete(null);
      showToast('Fornecedor excluído com sucesso!');
    } catch (err) {
      console.error('Erro ao excluir fornecedor:', err);
      showToast('Erro ao excluir fornecedor.', 'error');
    }
  };

  const filteredSuppliers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return suppliers.filter(s => 
      s.nome.toLowerCase().includes(term) || 
      s.codigo.toLowerCase().includes(term) ||
      s.cnpj.toLowerCase().includes(term)
    );
  }, [suppliers, searchTerm]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
        <div className="text-center">
          <p className="text-gray-600 font-bold">Carregando Fornecedores...</p>
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
        <Navbar />

        {/* Sub-Header */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-600 p-1.5 rounded-lg">
                <Truck className="text-white" size={20} />
              </div>
              <h1 className="text-lg font-bold text-gray-900">Fornecedores</h1>
            </div>
            <button
              onClick={() => {
                setEditingSupplier(null);
                setIsFormOpen(true);
              }}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95 text-sm"
            >
              <Plus size={18} />
              Novo Fornecedor
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Pesquisar por nome, código ou CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSuppliers.map((supplier) => (
              <div key={supplier.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500 px-2 py-1 rounded-md mb-2 inline-block">
                      #{supplier.codigo}
                    </span>
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{supplier.nome}</h3>
                    <p className="text-xs text-gray-400 font-medium">{supplier.cnpj}</p>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => {
                        setEditingSupplier(supplier);
                        setIsFormOpen(true);
                      }}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
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
                  {supplier.endereco && (
                    <div className="flex items-start gap-3 text-sm text-gray-500">
                      <MapPin size={16} className="text-gray-400 mt-0.5" />
                      <span>{supplier.endereco}</span>
                    </div>
                  )}
                  {supplier.nomeVendedor && (
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <User size={16} className="text-gray-400" />
                      <span>{supplier.nomeVendedor}</span>
                    </div>
                  )}
                  {supplier.contatoVendedor && (
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <Phone size={16} className="text-gray-400" />
                      <span>{supplier.contatoVendedor}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredSuppliers.length === 0 && (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
              <Truck className="mx-auto text-gray-200 mb-4" size={48} />
              <p className="text-gray-500 font-medium">Nenhum fornecedor encontrado.</p>
            </div>
          )}
        </div>

        {isFormOpen && (
          <SupplierForm
            supplier={editingSupplier}
            suppliers={suppliers}
            onSave={handleSaveSupplier}
            onClose={() => {
              setIsFormOpen(false);
              setEditingSupplier(null);
            }}
          />
        )}

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
      </main>
    </ErrorBoundary>
  );
}
