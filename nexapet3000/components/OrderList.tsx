'use client';

import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Calendar, User, Hash, Share2, MessageCircle, DollarSign, QrCode } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { OrderData } from '@/types/order';
import { CustomerData } from './CustomerForm';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';

interface OrderListProps {
  orders: OrderData[];
  onEdit: (order: OrderData) => void;
  onDelete: (id: string) => void;
  onUpdateSentDate: (id: string, date: string) => void;
  onManualReceipt: (order: OrderData) => void;
}

export const OrderList: React.FC<OrderListProps> = ({ orders, onEdit, onDelete, onUpdateSentDate, onManualReceipt }) => {
  const [companyConfig, setCompanyConfig] = useState<any>(null);

  useEffect(() => {
    const docRef = doc(db, 'config', 'empresa');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setCompanyConfig(docSnap.data());
      }
    });
    return () => unsubscribe();
  }, []);

  const getStatusColor = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('pago')) return 'bg-green-100 text-green-700 border-green-200';
    if (s.includes('pendente')) return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  };

  const handleWhatsAppChat = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const handleShareWhatsApp = (order: OrderData) => {
    const message = `*Olá ${order.cliente_nome} , Segue os Valores Para Pagamento.*
*## Fechamento Casa do Criador ##*

*Total a Pagar: R$ ${order.valor_total}*

*Descrição da Cobrança :* 
🛒🐶 ${order.descricao_cobranca || 'Sem descrição'}

*Para Efetuar o Pagamento Click no Link Abaixo e Siga os Passos* 👇👇

${order.link_de_pagamento || 'Link não gerado'}

R$ ${order.valor_total}

FAVOR ENVIAR O COMPROVANTE !

Obrigado ✅
Cobrança Nº ${order.id || 'N/A'}`;

    const encodedMessage = encodeURIComponent(message);
    const phone = String(order.telefone_cliente || '').replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
    
    // Update sent date in Firestore
    if (order.id) {
      onUpdateSentDate(order.id, new Date().toISOString());
    }
    
    window.open(whatsappUrl, '_blank');
  };

  const handleSharePix = (order: OrderData) => {
    const message = `*Olá ${order.cliente_nome} , Segue os Valores Para Pagamento.*
*## Fechamento Casa do Criador ##*

*Total a Pagar: R$ ${order.valor_total}*

*Descrição da Cobrança :* 
🛒🐶 ${order.descricao_cobranca || 'Sem descrição'}

*Segue Chave Pix Para Pagamento 👇👇*
*Chave Pix : ${companyConfig?.chavePix || 'Não cadastrada'}*
*Banco: ${companyConfig?.bancoPix || 'Não cadastrado'}*
*Nome: ${companyConfig?.nomePix || 'Não cadastrado'}*

R$ ${order.valor_total}

FAVOR ENVIAR O COMPROVANTE !

Obrigado ✅
Cobrança Nº ${order.id || 'N/A'}`;

    const encodedMessage = encodeURIComponent(message);
    const phone = String(order.telefone_cliente || '').replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
    
    // Update sent date in Firestore
    if (order.id) {
      onUpdateSentDate(order.id, new Date().toISOString());
    }
    
    window.open(whatsappUrl, '_blank');
  };

  const formatDate = (dateVal: any) => {
    if (!dateVal) return '-';
    try {
      let date: Date;
      
      // Handle Firestore Timestamp
      if (typeof dateVal === 'object' && 'seconds' in dateVal) {
        date = new Date(dateVal.seconds * 1000);
      } 
      // Handle ISO String or other date strings
      else if (typeof dateVal === 'string') {
        date = dateVal.includes('T') ? parseISO(dateVal) : new Date(dateVal);
      }
      // Handle Date object
      else if (dateVal instanceof Date) {
        date = dateVal;
      }
      else {
        return String(dateVal);
      }

      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    } catch (e) {
      return typeof dateVal === 'string' ? dateVal : '-';
    }
  };

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

  if (orders.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
        <p className="text-gray-400 font-medium">Nenhum pedido encontrado.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {/* Desktop Header */}
      <div className="hidden lg:grid grid-cols-9 gap-4 px-6 py-3 bg-gray-50 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-500">
        <div className="col-span-3">Cliente</div>
        <div>Valor</div>
        <div>Tipo</div>
        <div>Cobrança</div>
        <div>Enviado</div>
        <div>Pago em</div>
        <div className="text-right">Ações</div>
      </div>

      {orders.map((order) => (
        <div 
          key={order.id} 
          className="bg-white p-4 lg:p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group"
        >
          <div className="lg:grid lg:grid-cols-9 lg:gap-4 lg:items-center">
            {/* Mobile Layout Header (Status) */}
            <div className="flex justify-between items-center lg:hidden mb-4">
              <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-tight border ${getStatusColor(order.status_pagamento)}`}>
                {String(order.status_pagamento || '')}
              </span>
            </div>

            <div className="col-span-3 mb-4 lg:mb-0">
              <div className="flex items-center gap-2">
                <span className="lg:hidden text-gray-400"><User size={14} /></span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 truncate">
                      <span className="text-indigo-600 font-bold">({String(order.codigo_cliente || '0')})</span> {String(order.cliente_nome || 'Sem Nome')}
                    </h3>
                    <span className={`hidden lg:inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-tight border ${getStatusColor(order.status_pagamento)}`}>
                      {String(order.status_pagamento || '')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {order.telefone_cliente ? (
                      <a 
                        href={`https://wa.me/${String(order.telefone_cliente).replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-green-600 hover:underline transition-colors flex items-center gap-1"
                      >
                        {String(order.telefone_cliente)}
                      </a>
                    ) : (
                      'Sem Telefone'
                    )}
                  </p>
                  {order.endereco_cliente && (
                    <p className="text-[10px] text-gray-400 mt-1 truncate max-w-[200px]">
                      {order.endereco_cliente}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 lg:hidden">
              <div>
                <span className="block text-[10px] uppercase text-gray-400 font-bold">Valor</span>
                <span className="font-bold text-gray-900">R$ {parseCurrency(order.valor_total).toFixed(2)}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase text-gray-400 font-bold">Tipo</span>
                <span className="text-sm text-gray-600">{String(order.tipodepagamentopixcartao || '')}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4 lg:hidden">
              <div>
                <span className="block text-[10px] uppercase text-gray-400 font-bold">Cobrança</span>
                <div className="flex items-center gap-1 text-[11px] text-gray-600">
                  {formatDate(order.data_cobranca)}
                </div>
              </div>
              <div>
                <span className="block text-[10px] uppercase text-gray-400 font-bold">Enviado</span>
                <div className="flex items-center gap-1 text-[11px] text-gray-600">
                  {formatDate(order.pgtoenviado_dia)}
                </div>
              </div>
              <div>
                <span className="block text-[10px] uppercase text-gray-400 font-bold">Pago em</span>
                <div className="flex items-center gap-1 text-[11px] text-gray-600">
                  {formatDate(order.pago_em)}
                </div>
              </div>
            </div>

            {/* Desktop View Fields (Hidden on Mobile) */}
            <div className="hidden lg:block font-bold text-gray-900">
              R$ {parseCurrency(order.valor_total).toFixed(2)}
            </div>

            <div className="hidden lg:block text-sm text-gray-600 truncate">
              {String(order.tipodepagamentopixcartao || '')}
            </div>

            <div className="hidden lg:block text-sm text-gray-600">
              {formatDate(order.data_cobranca)}
            </div>

            <div className="hidden lg:block text-sm text-gray-600">
              {formatDate(order.pgtoenviado_dia)}
            </div>

            <div className="hidden lg:block text-sm text-gray-600">
              {formatDate(order.pago_em)}
            </div>

            <div className="flex flex-wrap justify-end gap-1 sm:gap-2 pt-4 lg:pt-0 border-t lg:border-t-0 border-gray-50">
              {order.telefone_cliente && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleWhatsAppChat(order.telefone_cliente!);
                  }}
                  className="p-2 text-green-500 hover:bg-green-50 rounded-xl transition-all border border-transparent hover:border-green-100"
                  title="Abrir WhatsApp"
                >
                  <MessageCircle size={18} />
                </button>
              )}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onManualReceipt(order);
                }}
                className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl transition-all border border-transparent hover:border-amber-100"
                title="Recebimento Manual"
              >
                <DollarSign size={18} />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleSharePix(order);
                }}
                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all border border-transparent hover:border-emerald-100"
                title="Cobrar por Pix"
              >
                <QrCode size={18} />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleShareWhatsApp(order);
                }}
                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-transparent hover:border-indigo-100"
                title="Compartilhar Cobrança"
              >
                <Share2 size={18} />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(order);
                }}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100"
                title="Editar"
              >
                <Edit2 size={18} />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (order.id) onDelete(order.id);
                }}
                className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                title="Excluir"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
