'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Search } from 'lucide-react';
import { SupplierData } from './SupplierForm';

export interface ProductData {
  id?: string;
  codigo: string;
  nome: string;
  unidade: 'UNIDADE' | 'SACO' | 'GRANEL';
  tipo: 'PRODUTO' | 'SERVICO';
  fornecedorId: string;
  fornecedorNome: string;
  codigoBarras: string;
  precoCusto: number;
  margemLucro: number;
  precoVenda: number;
  estoqueAtual: number;
  estoqueCritico: number;
  linkCatalogo?: string;
  createdAt?: string;
}

interface ProductFormProps {
  product?: ProductData | null;
  products: ProductData[];
  suppliers: SupplierData[];
  onSave: (data: Omit<ProductData, 'id'>) => void;
  onClose: () => void;
  onNewSupplier: () => void;
}

export const ProductForm: React.FC<ProductFormProps> = ({ 
  product, 
  products, 
  suppliers, 
  onSave, 
  onClose,
  onNewSupplier
}) => {
  const [formData, setFormData] = useState<Omit<ProductData, 'id'>>({
    codigo: product?.codigo || '',
    nome: product?.nome || '',
    unidade: product?.unidade || 'UNIDADE',
    tipo: product?.tipo || 'PRODUTO',
    fornecedorId: product?.fornecedorId || '',
    fornecedorNome: product?.fornecedorNome || '',
    codigoBarras: product?.codigoBarras || '',
    precoCusto: product?.precoCusto || 0,
    margemLucro: product?.margemLucro || 0,
    precoVenda: product?.precoVenda || 0,
    estoqueAtual: product?.estoqueAtual || 0,
    estoqueCritico: product?.estoqueCritico || 0,
    linkCatalogo: product?.linkCatalogo || '',
  });

  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierResults, setShowSupplierResults] = useState(false);

  const generateAutoCode = () => {
    const numericCodes = products
      .map(p => parseInt(p.codigo))
      .filter(code => !isNaN(code) && code >= 10000);
    
    const nextCode = numericCodes.length > 0 
      ? Math.max(...numericCodes) + 1 
      : 10000;
    
    setFormData(prev => ({ ...prev, codigo: nextCode.toString() }));
  };

  const handleCostChange = (val: number) => {
    const cost = val;
    const margin = formData.margemLucro;
    const selling = cost * (1 + margin / 100);
    setFormData(prev => ({ ...prev, precoCusto: cost, precoVenda: Number((selling || 0).toFixed(2)) }));
  };

  const handleMarginChange = (val: number) => {
    const margin = val;
    const cost = formData.precoCusto;
    const selling = cost * (1 + margin / 100);
    setFormData(prev => ({ ...prev, margemLucro: margin, precoVenda: Number((selling || 0).toFixed(2)) }));
  };

  const handleSellingChange = (val: number) => {
    const selling = val;
    const cost = formData.precoCusto;
    if (cost > 0) {
      const margin = ((selling / cost) - 1) * 100;
      setFormData(prev => ({ ...prev, precoVenda: selling, margemLucro: Number((margin || 0).toFixed(2)) }));
    } else {
      setFormData(prev => ({ ...prev, precoVenda: selling }));
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.nome.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    s.codigo.toLowerCase().includes(supplierSearch.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900">
            {product ? 'Editar Produto' : 'Novo Produto'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Tipo de Cadastro */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Tipo de Cadastro</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, tipo: 'PRODUTO' })}
                className={`flex-1 py-3 rounded-xl font-bold transition-all border ${
                  formData.tipo === 'PRODUTO'
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100'
                    : 'bg-white border-gray-100 text-gray-500 hover:border-indigo-200'
                }`}
              >
                Produto
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, tipo: 'SERVICO' })}
                className={`flex-1 py-3 rounded-xl font-bold transition-all border ${
                  formData.tipo === 'SERVICO'
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100'
                    : 'bg-white border-gray-100 text-gray-500 hover:border-indigo-200'
                }`}
              >
                Serviço
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Código</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  placeholder="Ex: 10000"
                />
                {!product && (
                  <button
                    type="button"
                    onClick={generateAutoCode}
                    className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-100 transition-colors whitespace-nowrap"
                  >
                    Auto
                  </button>
                )}
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Nome do Produto/Serviço</label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="Descrição do item"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Unidade</label>
              <select
                value={formData.unidade}
                onChange={(e) => setFormData({ ...formData, unidade: e.target.value as any })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-white"
              >
                <option value="UNIDADE">UNIDADE</option>
                <option value="SACO">SACO</option>
                <option value="GRANEL">GRANEL</option>
              </select>
            </div>
            <div className="space-y-1 relative">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Fornecedor</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={formData.fornecedorNome || supplierSearch}
                    onChange={(e) => {
                      setSupplierSearch(e.target.value);
                      setFormData(prev => ({ ...prev, fornecedorNome: '', fornecedorId: '' }));
                      setShowSupplierResults(true);
                    }}
                    onFocus={() => setShowSupplierResults(true)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    placeholder="Buscar fornecedor..."
                  />
                  {showSupplierResults && supplierSearch && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                      {filteredSuppliers.map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, fornecedorId: s.id!, fornecedorNome: s.nome }));
                            setSupplierSearch(s.nome);
                            setShowSupplierResults(false);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm"
                        >
                          <span className="font-bold">#{s.codigo}</span> - {s.nome}
                        </button>
                      ))}
                      {filteredSuppliers.length === 0 && (
                        <div className="px-4 py-2 text-sm text-gray-500 italic">Nenhum fornecedor encontrado</div>
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onNewSupplier}
                  className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                  title="Novo Fornecedor"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Código de Barras</label>
              <input
                type="text"
                value={formData.codigoBarras}
                onChange={(e) => setFormData({ ...formData, codigoBarras: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="EAN-13, etc"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Preço de Custo (R$)</label>
              <input
                type="number"
                step="0.01"
                value={isNaN(formData.precoCusto) ? '' : formData.precoCusto}
                onChange={(e) => handleCostChange(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Margem de Lucro (%)</label>
              <input
                type="number"
                step="0.1"
                value={isNaN(formData.margemLucro) ? '' : formData.margemLucro}
                onChange={(e) => handleMarginChange(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="0.0"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Preço de Venda (R$)</label>
              <input
                type="number"
                step="0.01"
                value={isNaN(formData.precoVenda) ? '' : formData.precoVenda}
                onChange={(e) => handleSellingChange(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Estoque Atual</label>
              <input
                type="number"
                value={isNaN(formData.estoqueAtual) ? '' : formData.estoqueAtual}
                onChange={(e) => setFormData({ ...formData, estoqueAtual: Number(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="0"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Estoque Crítico</label>
              <input
                type="number"
                value={isNaN(formData.estoqueCritico) ? '' : formData.estoqueCritico}
                onChange={(e) => setFormData({ ...formData, estoqueCritico: Number(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Link Catálogo WhatsApp</label>
            <input
              type="url"
              value={formData.linkCatalogo}
              onChange={(e) => setFormData({ ...formData, linkCatalogo: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="https://wa.me/p/..."
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl border border-gray-200 font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
