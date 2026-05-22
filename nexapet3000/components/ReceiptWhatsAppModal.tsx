'use client';

import React from 'react';
import { X, Copy, MessageCircle, DollarSign, Calendar, User, FileText, CheckCircle2 } from 'lucide-react';
import { OrderData } from '@/types/order';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReceiptWhatsAppModalProps {
  order: OrderData;
  onClose: () => void;
  onCopy: () => void;
}

export const ReceiptWhatsAppModal: React.FC<ReceiptWhatsAppModalProps> = ({ order, onClose, onCopy }) => {
  const formatDate = (dateVal: any) => {
    if (!dateVal) return '-';
    try {
      let date: Date;
      if (typeof dateVal === 'object' && 'seconds' in dateVal) {
        date = new Date(dateVal.seconds * 1000);
      } else if (typeof dateVal === 'string') {
        date = dateVal.includes('T') ? parseISO(dateVal) : new Date(dateVal);
      } else if (dateVal instanceof Date) {
        date = dateVal;
      } else {
        return String(dateVal);
      }
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    } catch (e) {
      return '-';
    }
  };

  const parseCurrency = (val: any): number => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    const cleanVal = String(val).replace(/[R$\s]/g, '');
    if (cleanVal.includes('.') && cleanVal.includes(',')) {
      return parseFloat(cleanVal.replace(/\./g, '').replace(',', '.'));
    }
    if (cleanVal.includes(',')) {
      return parseFloat(cleanVal.replace(',', '.'));
    }
    return parseFloat(cleanVal) || 0;
  };

  const billed = parseCurrency(order.valor_total);
  // No campo 'valor_pago' direto na OrderData, mas podemos assumir que se está pago o valor recebido é o total ou o que foi gravado
  // No entanto, o sistema parece atualizar 'valor_total' para o valor recebido no handleManualReceipt
  // Para exibir o "restante" precisariamos do valor original. 
  // Baseado na lógica do handleManualReceipt, se houve parcial, foi criado um novo registro em historico_banhos.
  // Como não temos acesso fácil a esse "original" aqui sem mudar o estado, vamos usar o que temos.
  
  const receiptText = `*Agradecemos o pagamento!* 🙏
  
*RECIBO DE PAGAMENTO* 📄

👤 *Cliente:* (${order.codigo_cliente}) ${order.cliente_nome}
📝 *Descrição:* ${order.descricao_cobranca || 'Serviços/Produtos'}

📅 *Data da Cobrança:* ${formatDate(order.data_cobranca)}
✅ *Data do Pagamento:* ${formatDate(order.pago_em)}

💰 *Valor Cobrado:* R$ ${billed.toFixed(2)}
💵 *Valor Pago:* R$ ${billed.toFixed(2)}
💳 *Forma:* ${order.tipodepagamentopixcartao || 'Não informada'}

*Pagamento realizado com sucesso, obrigado!* ✅`;

  const handleCopy = () => {
    navigator.clipboard.writeText(receiptText);
    onCopy();
  };

  const handleSendWhatsApp = () => {
    const phone = String(order.telefone_cliente || '').replace(/\D/g, '');
    const encoded = encodeURIComponent(receiptText);
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="text-green-600" size={24} />
              Recibo para WhatsApp
            </h2>
            <p className="text-sm text-gray-500">Copie ou envie diretamente</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 font-mono text-sm whitespace-pre-wrap text-gray-700">
            {receiptText}
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-6 py-4 rounded-2xl font-bold hover:bg-gray-100 transition-all active:scale-95 shadow-sm"
          >
            <Copy size={20} />
            Copiar Texto
          </button>
          <button
            onClick={handleSendWhatsApp}
            className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-4 rounded-2xl font-bold hover:bg-green-700 transition-all active:scale-95 shadow-lg shadow-green-100"
          >
            <MessageCircle size={20} />
            Enviar WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
};
