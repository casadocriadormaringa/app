'use client';

import React, { useState } from 'react';
import { X, Loader2, DollarSign, Calendar, CheckCircle2 } from 'lucide-react';

interface BathEditModalProps {
  bath: any;
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
}

export const BathEditModal: React.FC<BathEditModalProps> = ({ bath, onSave, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    data: bath.data?.split('T')[0] || '',
    valor: bath.valor || 0,
    status: bath.status || 'Concluído',
    pago: bath.pago || false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({
        ...bath,
        ...formData,
        data: formData.data + (bath.data?.includes('T') ? 'T' + bath.data.split('T')[1] : 'T12:00:00.000Z')
      });
      onClose();
    } catch (err) {
      console.error('Erro ao salvar banho:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60] backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-600 text-white">
          <h2 className="text-xl font-bold">Editar Registro de Banho</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
              <Calendar size={16} className="text-indigo-500" /> Data
            </label>
            <input
              type="date"
              required
              value={formData.data}
              onChange={(e) => setFormData({ ...formData, data: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
              <DollarSign size={16} className="text-green-500" /> Valor
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={isNaN(formData.valor) ? '' : formData.valor}
              onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            >
              <option value="Concluído">Concluído</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>

          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
            <input
              type="checkbox"
              id="pago"
              checked={formData.pago}
              onChange={(e) => setFormData({ ...formData, pago: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="pago" className="text-sm font-bold text-gray-700 cursor-pointer">
              Marcar como Pago
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
