'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';

export interface SupplierData {
  id?: string;
  codigo: string;
  nome: string;
  endereco: string;
  cnpj: string;
  nomeVendedor: string;
  contatoVendedor: string;
  createdAt?: string;
}

interface SupplierFormProps {
  supplier?: SupplierData | null;
  suppliers: SupplierData[];
  onSave: (data: Omit<SupplierData, 'id'>) => void;
  onClose: () => void;
}

export const SupplierForm: React.FC<SupplierFormProps> = ({ supplier, suppliers, onSave, onClose }) => {
  const [formData, setFormData] = useState<Omit<SupplierData, 'id'>>({
    codigo: supplier?.codigo || '',
    nome: supplier?.nome || '',
    endereco: supplier?.endereco || '',
    cnpj: supplier?.cnpj || '',
    nomeVendedor: supplier?.nomeVendedor || '',
    contatoVendedor: supplier?.contatoVendedor || '',
  });

  const generateAutoCode = () => {
    const numericCodes = suppliers
      .map(s => parseInt(s.codigo))
      .filter(code => !isNaN(code) && code >= 10000);
    
    const nextCode = numericCodes.length > 0 
      ? Math.max(...numericCodes) + 1 
      : 10000;
    
    setFormData(prev => ({ ...prev, codigo: nextCode.toString() }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60] backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900">
            {supplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
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
                {!supplier && (
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
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Nome do Fornecedor</label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="Nome da empresa"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Endereço</label>
            <input
              type="text"
              value={formData.endereco}
              onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="Rua, Número, Bairro, Cidade"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">CNPJ</label>
              <input
                type="text"
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Nome do Vendedor</label>
              <input
                type="text"
                value={formData.nomeVendedor}
                onChange={(e) => setFormData({ ...formData, nomeVendedor: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="Nome do contato"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Contato do Vendedor</label>
            <input
              type="text"
              value={formData.contatoVendedor}
              onChange={(e) => setFormData({ ...formData, contatoVendedor: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="Telefone ou Email"
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
