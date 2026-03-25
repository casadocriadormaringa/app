'use client';

import React, { useState } from 'react';
import { X, DollarSign, Calendar, FileText, CreditCard } from 'lucide-react';

interface CreditModalProps {
  customerName: string;
  customerId: string;
  credit?: any; // Optional credit for editing
  onSave: (data: {
    clienteId: string;
    data_recebimento: string;
    tipo_pagamento: string;
    valor: number;
    descricao: string;
    id?: string;
  }) => void;
  onClose: () => void;
}

export function CreditModal({ customerName, customerId, credit, onSave, onClose }: CreditModalProps) {
  const [data, setData] = useState({
    data_recebimento: credit?.data_recebimento || new Date().toISOString().split('T')[0],
    tipo_pagamento: credit?.tipo_pagamento || 'Pix',
    valor: credit?.valor ? String(credit.valor) : '',
    descricao: credit?.descricao || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valorNum = parseFloat(data.valor);
    if (isNaN(valorNum) || valorNum <= 0) {
      alert('Por favor, insira um valor válido.');
      return;
    }
    onSave({
      ...data,
      clienteId: customerId,
      valor: valorNum,
      id: credit?.id
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <DollarSign size={20} />
            <h2 className="font-bold text-lg">{credit ? 'Editar Crédito' : 'Lançar Crédito'}</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-indigo-50 p-4 rounded-2xl mb-4">
            <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider mb-1">Cliente</p>
            <p className="font-bold text-gray-900">{customerName}</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
                <Calendar size={16} className="text-indigo-500" />
                Data de Recebimento
              </label>
              <input
                type="date"
                required
                value={data.data_recebimento}
                onChange={(e) => setData({ ...data, data_recebimento: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
                <CreditCard size={16} className="text-indigo-500" />
                Tipo de Pagamento
              </label>
              <select
                value={data.tipo_pagamento}
                onChange={(e) => setData({ ...data, tipo_pagamento: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              >
                <option value="Pix">Pix</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Cartão de Crédito">Cartão de Crédito</option>
                <option value="Cartão de Débito">Cartão de Débito</option>
                <option value="Transferência">Transferência</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
                <DollarSign size={16} className="text-indigo-500" />
                Valor do Crédito
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0,00"
                value={data.valor}
                onChange={(e) => setData({ ...data, valor: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
                <FileText size={16} className="text-indigo-500" />
                Descrição
              </label>
              <textarea
                placeholder="Ex: Pagamento antecipado de banhos"
                value={data.descricao}
                onChange={(e) => setData({ ...data, descricao: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none h-24"
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95"
            >
              {credit ? 'Salvar Alterações' : 'Lançar Crédito'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
