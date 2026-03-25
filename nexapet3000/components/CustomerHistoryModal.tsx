'use client';

import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '@/firebase';
import { X, ShoppingBag, Calendar, Package, DollarSign, Loader2, ShoppingCart, Truck, History, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { CustomerData } from './CustomerForm';

interface CustomerHistoryModalProps {
  customer: CustomerData;
  onClose: () => void;
}

export const CustomerHistoryModal: React.FC<CustomerHistoryModalProps> = ({ customer, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<any[]>([]);
  const [indexMissing, setIndexMissing] = useState(false);
  const [indexBuilding, setIndexBuilding] = useState(false);

  useEffect(() => {
    if (!customer.id) return;

    const q = query(
      collection(db, 'vendas'),
      where('clienteId', '==', customer.id),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
      setIndexMissing(false);
      setIndexBuilding(false);
    }, (error) => {
      console.error('Erro ao buscar histórico:', error);
      setLoading(false);
      if (error.message.includes('requires an index')) {
        if (error.message.includes('currently building')) {
          setIndexBuilding(true);
        } else {
          setIndexMissing(true);
        }
      }
    });

    return () => unsubscribe();
  }, [customer.id]);

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy HH:mm');
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white">
              <History size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Histórico de Compras</h2>
              <p className="text-sm text-gray-500 font-medium">{customer.nome}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
              <p className="text-gray-500 font-medium">Carregando histórico...</p>
            </div>
          ) : indexBuilding ? (
            <div className="text-center py-20 border-2 border-dashed border-blue-100 rounded-3xl bg-blue-50">
              <Loader2 className="mx-auto text-blue-500 mb-4 animate-spin" size={64} />
              <p className="text-blue-700 font-bold text-lg">Índice em Construção</p>
              <p className="text-blue-600 max-w-md mx-auto mt-2">
                O Firestore está criando o índice necessário para esta consulta. Isso pode levar alguns minutos. Por favor, aguarde.
              </p>
            </div>
          ) : indexMissing ? (
            <div className="text-center py-20 border-2 border-dashed border-amber-100 rounded-3xl bg-amber-50">
              <AlertCircle className="mx-auto text-amber-500 mb-4" size={64} />
              <p className="text-amber-700 font-bold text-lg">Índice Necessário</p>
              <p className="text-amber-600 max-w-md mx-auto mt-2">
                O Firestore requer um índice para esta consulta. Por favor, clique no link fornecido no console do navegador para criá-lo.
              </p>
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-gray-100 rounded-3xl">
              <ShoppingBag className="mx-auto text-gray-200 mb-4" size={64} />
              <p className="text-gray-500 font-bold text-lg">Nenhuma compra encontrada</p>
              <p className="text-gray-400">Este cliente ainda não realizou compras no PDV.</p>
            </div>
          ) : (
            sales.map((sale) => (
              <div key={sale.id} className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                <div className="p-4 bg-white border-b border-gray-100 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg font-bold text-sm">
                      #{sale.numeroVenda}
                    </span>
                    <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
                      <Calendar size={14} />
                      {formatDate(sale.createdAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total</p>
                    <p className="font-black text-indigo-600">R$ {(sale.valorTotal || 0).toFixed(2)}</p>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {sale.itens.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <div className="bg-white p-1.5 rounded-lg border border-gray-100 text-gray-400">
                          <Package size={14} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{item.nome}</p>
                          <p className="text-xs text-gray-500">
                            {item.quantidade} {item.unidade} x R$ {(item.precoVenda || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <p className="font-bold text-gray-700">R$ {(item.subtotal || 0).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-indigo-50/50 border-t border-indigo-50 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-indigo-600">
                  <div className="flex items-center gap-2">
                    <DollarSign size={14} />
                    {sale.formaPagamento.replace('_', ' ')}
                  </div>
                  <div className="flex items-center gap-2">
                    {sale.tipoVenda === 'BALCAO' ? <ShoppingCart size={14} /> : <Truck size={14} />}
                    {sale.tipoVenda}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
