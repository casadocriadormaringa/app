'use client';

import React, { useState } from 'react';
import { X, Loader2, DollarSign, Calendar, CreditCard, Banknote, QrCode } from 'lucide-react';
import { OrderData } from '@/types/order';
import { format } from 'date-fns';

interface ManualReceiptModalProps {
  order: OrderData;
  onSave: (orderId: string, paymentData: {
    method: string;
    date: string;
    receivedValue: number;
    billedValue: number;
  }) => Promise<void>;
  onClose: () => void;
}

export const ManualReceiptModal: React.FC<ManualReceiptModalProps> = ({ order, onSave, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState('Pix');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [receivedValue, setReceivedValue] = useState<string>(String(order.valor_total || '0'));

  const parseCurrency = (val: any): number => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    
    // Remove R$, spaces and other non-numeric chars except , and .
    const cleanVal = String(val).replace(/[R$\s]/g, '');
    
    // If it has both . and , (e.g. 1.234,56)
    if (cleanVal.includes('.') && cleanVal.includes(',')) {
      return parseFloat(cleanVal.replace(/\./g, '').replace(',', '.'));
    }
    
    // If it has only , (e.g. 1234,56)
    if (cleanVal.includes(',')) {
      return parseFloat(cleanVal.replace(',', '.'));
    }
    
    return parseFloat(cleanVal) || 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order.id) return;

    const parsedReceived = parseCurrency(receivedValue);
    const parsedBilled = parseCurrency(order.valor_total);

    if (isNaN(parsedReceived)) {
      alert('Por favor, insira um valor de recebimento válido.');
      return;
    }

    setLoading(true);
    try {
      await onSave(order.id, {
        method,
        date,
        receivedValue: parsedReceived,
        billedValue: parsedBilled
      });
      onClose();
    } catch (err) {
      console.error('Erro ao processar recebimento manual:', err);
      alert('Erro ao processar recebimento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const currentReceived = parseCurrency(receivedValue);
  const currentBilled = parseCurrency(order.valor_total);
  const diff = currentBilled - currentReceived;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <DollarSign className="text-green-600" size={24} />
              Recebimento Manual
            </h2>
            <p className="text-sm text-gray-500">{order.cliente_nome} (#{order.codigo_cliente})</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Valor Cobrado Info */}
          <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
            <span className="text-[10px] uppercase font-bold text-indigo-400 block mb-1">Valor Cobrado</span>
            <span className="text-2xl font-black text-indigo-700">R$ {(currentBilled || 0).toFixed(2)}</span>
          </div>

          {/* Forma de Pagamento */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Forma de Pagamento</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'Pix', icon: <QrCode size={18} />, label: 'Pix' },
                { id: 'Dinheiro', icon: <Banknote size={18} />, label: 'Dinheiro' },
                { id: 'Cartão', icon: <CreditCard size={18} />, label: 'Cartão' }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMethod(item.id)}
                  className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                    method === item.id 
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                      : 'bg-white border-gray-100 text-gray-600 hover:border-indigo-200'
                  }`}
                >
                  {item.icon}
                  <span className="text-[10px] font-bold uppercase">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Data de Recebimento */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
              <Calendar size={14} /> Data de Recebimento
            </label>
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>

          {/* Valor Recebido */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
              <DollarSign size={14} /> Valor Recebido
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</span>
              <input 
                type="text" 
                value={receivedValue}
                onChange={(e) => setReceivedValue(e.target.value)}
                required
                placeholder="0,00"
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-lg"
              />
            </div>
            {Math.abs(diff) > 0.01 && (
              <p className="text-[10px] text-amber-600 font-bold mt-1">
                * A diferença de R$ {(diff || 0).toFixed(2)} será lançada como ajuste.
              </p>
            )}
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 shadow-lg shadow-green-100 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
