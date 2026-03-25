'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc,
  updateDoc,
  addDoc
} from 'firebase/firestore';
import { db } from '@/firebase';
import { X, Loader2, CheckCircle2, Clock, Calendar, FileText, DollarSign, Check, RotateCcw, Dog, ShoppingCart, Edit2, Trash2, Printer } from 'lucide-react';
import { format, parseISO, addWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CustomerData } from './CustomerForm';
import { OrderData } from '@/types/order';
import { useRouter } from 'next/navigation';
import { deleteDoc, onSnapshot as onSnapshotDoc } from 'firebase/firestore';

interface OrderHistoryModalProps {
  customer: CustomerData;
  onClose: () => void;
  onEditCredit?: (credit: any) => void;
  onEditOrder?: (order: any) => void;
  onEditBath?: (bath: any) => void;
}

interface UnifiedItem {
  id: string;
  type: 'order' | 'bath' | 'credit';
  date: any;
  description: string;
  value: number;
  status: 'pago' | 'pendente' | 'credito';
  originalData: any;
}

export const OrderHistoryModal: React.FC<OrderHistoryModalProps> = ({ 
  customer, 
  onClose, 
  onEditCredit,
  onEditOrder,
  onEditBath
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<UnifiedItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: string } | null>(null);
  const [companyConfig, setCompanyConfig] = useState<any>(null);

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

  useEffect(() => {
    setLoading(true);
    
    // Query orders
    const qOrders = query(
      collection(db, 'pedidos'),
      where('codigo_cliente', '==', customer.codigo)
    );

    // Query baths
    const qBaths = query(
      collection(db, 'historico_banhos'),
      where('clienteId', '==', customer.id)
    );

    // Query credits
    const qCredits = query(
      collection(db, 'creditos'),
      where('clienteId', '==', customer.id)
    );

    let ordersData: UnifiedItem[] = [];
    let bathsData: UnifiedItem[] = [];
    let creditsData: UnifiedItem[] = [];

    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      ordersData = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          type: 'order',
          date: d.data_cobranca || d.createdAt,
          description: d.descricao_cobranca || 'Pedido sem descrição',
          value: parseCurrency(d.valor_total),
          status: String(d.status_pagamento).toLowerCase() === 'pago' ? 'pago' : 'pendente',
          originalData: { ...d, id: doc.id }
        };
      });
      combineAndSet();
    });

    const unsubBaths = onSnapshot(qBaths, (snapshot) => {
      bathsData = snapshot.docs.map(doc => {
        const d = doc.data();
        const isCanceled = d.status === 'Cancelado';
        const dateStr = d.data ? format(parseISO(d.data), 'dd/MM/yyyy') : '';
        const desc = isCanceled 
          ? `❌ ${dateStr} - CANCELADO: ${d.tipo_pacote || 'Normal'}${d.petNome ? ` - ${d.petNome}` : ''}`
          : `✅ ${dateStr} - ${d.tipo_pacote || 'Normal'} OK${d.petNome ? ` - ${d.petNome}` : ''}`;

        return {
          id: doc.id,
          type: 'bath',
          date: d.data,
          description: desc,
          value: parseCurrency(d.valor),
          status: d.pago ? 'pago' : 'pendente',
          originalData: { ...d, id: doc.id }
        };
      });
      combineAndSet();
    });

    const unsubCredits = onSnapshot(qCredits, (snapshot) => {
      creditsData = snapshot.docs.map(doc => {
        const d = doc.data();
        const valorRestante = d.valor_restante || 0;
        return {
          id: doc.id,
          type: 'credit',
          date: d.data_recebimento,
          description: `Crédito: ${d.descricao || 'Sem descrição'} (${d.tipo_pagamento})`,
          value: valorRestante,
          status: valorRestante > 0 ? 'pendente' : 'pago', // pendente means still has balance
          originalData: { ...d, id: doc.id }
        };
      });
      combineAndSet();
    });

    const combineAndSet = () => {
      const combined = [...ordersData, ...bathsData, ...creditsData].sort((a, b) => {
        // Sort by status (pendente first)
        if (a.status !== b.status) {
          return a.status === 'pendente' ? -1 : 1;
        }
        // Then by date descending
        const dateA = a.date?.seconds ? a.date.seconds * 1000 : (a.date ? new Date(a.date).getTime() : 0);
        const dateB = b.date?.seconds ? b.date.seconds * 1000 : (b.date ? new Date(b.date).getTime() : 0);
        return (dateB || 0) - (dateA || 0);
      });
      setItems(combined);
      setLoading(false);
    };

    return () => {
      unsubOrders();
      unsubBaths();
      unsubCredits();
    };
  }, [customer.codigo, customer.id]);

  useEffect(() => {
    const unsubConfig = onSnapshotDoc(doc(db, 'config', 'empresa'), (docSnap) => {
      if (docSnap.exists()) {
        setCompanyConfig(docSnap.data());
      }
    });
    return () => unsubConfig();
  }, []);

  const toggleStatus = async (item: UnifiedItem) => {
    setUpdatingId(item.id);
    try {
      const collectionName = item.type === 'order' ? 'pedidos' : 'historico_banhos';
      const docRef = doc(db, collectionName, item.id);
      
      if (item.type === 'order') {
        await updateDoc(docRef, {
          status_pagamento: item.status === 'pago' ? 'pendente' : 'Pago',
          pago_em: item.status === 'pago' ? null : new Date().toISOString()
        });
      } else {
        await updateDoc(docRef, {
          pago: item.status !== 'pago',
          dataPagamento: item.status === 'pago' ? null : new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePrintItem = (item: UnifiedItem) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const d = item.originalData;
    const dateStr = item.date ? format(new Date(item.date), 'dd/MM/yyyy HH:mm') : format(new Date(), 'dd/MM/yyyy HH:mm');
    const companyName = companyConfig?.nomeEmpresa || 'CASA DO CRIADOR';
    const companyPhone = companyConfig?.telefoneEmpresa || '';

    let contentHtml = '';
    if (item.type === 'order') {
      const itemsHtml = (d.itens || []).map((it: any) => `
        <div style="display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 14px;">
          <span style="flex: 1;">${it.quantidade}x ${it.nome}</span>
          <span>R$ ${(it.subtotal || 0).toFixed(2)}</span>
        </div>
      `).join('');

      contentHtml = `
        <div class="header">
          <div style="font-size: 18px; font-weight: bold;">${companyName}</div>
          <div style="font-size: 16px; font-weight: bold;">PEDIDO #${d.numeroVenda || item.id.slice(-6)}</div>
          <div style="font-size: 12px;">Data: ${dateStr}</div>
        </div>
        <div class="section">
          <div class="label">Cliente:</div>
          <div class="value-large">${customer.nome}</div>
          <div class="value">Cód: ${customer.codigo}</div>
          ${customer.telefone ? `<div class="value">Tel: ${customer.telefone}</div>` : ''}
        </div>
        
        ${customer.endereco ? `
        <div class="section highlight">
          <div class="label">Endereço de Entrega:</div>
          <div class="address-large">${customer.endereco}</div>
        </div>
        ` : ''}

        <div class="items">
          ${itemsHtml}
        </div>

        <div class="total-section">
          <div class="label">Total da Venda:</div>
          <div class="total-value">R$ ${item.value.toFixed(2)}</div>
        </div>

        <div class="section">
          <div class="label">Forma de Pagamento:</div>
          <div class="value-large">${d.forma_pagamento || d.tipo_pagamento || 'A PRAZO'}</div>
        </div>
      `;
    } else if (item.type === 'bath') {
      contentHtml = `
        <div class="header">
          <div style="font-size: 18px; font-weight: bold;">${companyName}</div>
          <div style="font-size: 18px; font-weight: bold;">BANHO / TOSA</div>
          <div style="font-size: 12px;">Data: ${dateStr}</div>
        </div>
        <div class="section">
          <div class="label">Cliente:</div>
          <div class="value-large">${customer.nome}</div>
          <div class="value">Cód: ${customer.codigo}</div>
        </div>
        
        ${customer.endereco ? `
        <div class="section highlight">
          <div class="label">Endereço:</div>
          <div class="address-large">${customer.endereco}</div>
        </div>
        ` : ''}

        <div class="section">
          <div class="label">Descrição:</div>
          <div class="value" style="font-size: 14px;">${item.description}</div>
        </div>

        <div class="total-section">
          <div class="label">Valor:</div>
          <div class="total-value">R$ ${item.value.toFixed(2)}</div>
        </div>

        <div class="section">
          <div class="label">Status:</div>
          <div class="value-large">${item.status === 'pago' ? 'PAGO' : 'PENDENTE'}</div>
        </div>
      `;
    } else {
      contentHtml = `
        <div class="header">
          <div style="font-size: 18px; font-weight: bold;">${companyName}</div>
          <div style="font-size: 18px; font-weight: bold;">COMPROVANTE DE CRÉDITO</div>
          <div style="font-size: 12px;">Data: ${dateStr}</div>
        </div>
        <div class="section">
          <div class="label">Cliente:</div>
          <div class="value-large">${customer.nome}</div>
          <div class="value">Cód: ${customer.codigo}</div>
        </div>
        <div class="section">
          <div class="label">Descrição:</div>
          <div class="value" style="font-size: 14px;">${item.description}</div>
        </div>
        <div class="total-section">
          <div class="label">Valor do Crédito:</div>
          <div class="total-value">R$ ${item.value.toFixed(2)}</div>
        </div>
      `;
    }

    const html = `
      <html>
        <head>
          <title>Impressão - ${item.type}</title>
          <style>
            @page { margin: 0; }
            body { 
              font-family: 'Helvetica', 'Arial', sans-serif; 
              width: 58mm; 
              margin: 0; 
              padding: 4mm;
              font-size: 14px;
              line-height: 1.3;
              color: #000;
            }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 3mm; margin-bottom: 4mm; }
            .section { margin-bottom: 4mm; }
            .highlight { background: #f0f0f0; padding: 2mm; border: 1px solid #000; }
            .label { font-weight: bold; text-transform: uppercase; font-size: 11px; color: #333; margin-bottom: 1mm; }
            .value { display: block; font-size: 14px; }
            .value-large { display: block; font-size: 18px; font-weight: bold; text-transform: uppercase; line-height: 1.1; margin-bottom: 1mm; }
            .address-large { display: block; font-size: 20px; font-weight: 800; text-transform: uppercase; line-height: 1.1; word-wrap: break-word; }
            .items { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 2mm 0; margin: 3mm 0; }
            .total-section { border-top: 2px solid #000; padding-top: 2mm; margin-top: 2mm; text-align: right; }
            .total-value { font-size: 24px; font-weight: 900; }
            .footer { text-align: center; margin-top: 6mm; font-size: 11px; border-top: 1px dashed #000; padding-top: 3mm; }
          </style>
        </head>
        <body>
          ${contentHtml}
          <div class="footer">
            <div style="margin-bottom: 5px;">
              ${companyName}<br/>
              Sempre que Precisar<br/>
              Conte com a Gente !
            </div>
            <div style="font-size: 20px; font-weight: 900; margin: 10px 0;">ZapPet</div>
            <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">${companyPhone}</div>
            <div>Obrigado pela preferência!</div>
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const selectedItems = useMemo(() => {
    return items.filter(item => selectedIds.has(item.id));
  }, [items, selectedIds]);

  const totalSelected = useMemo(() => {
    return selectedItems.reduce((sum, item) => {
      if (item.type === 'credit') {
        return sum - item.value;
      }
      return sum + item.value;
    }, 0);
  }, [selectedItems]);

  const [showDueDatePrompt, setShowDueDatePrompt] = useState(false);
  const [dueDateStep, setDueDateStep] = useState<'ask' | 'option' | 'manual'>('ask');
  const [manualDate, setManualDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const finishGenerateBilling = async (nextDueDate?: string) => {
    if (selectedItems.length === 0) return;

    const description = selectedItems
      .map(item => {
        if (item.type === 'bath') {
          return `${item.description} (R$ ${(item.value || 0).toFixed(2)})`;
        }
        return `${formatDate(item.date)} - ${item.description} (R$ ${(item.value || 0).toFixed(2)})`;
      })
      .join('\n');

    // Update customer due date if provided
    if (nextDueDate && customer.id) {
      try {
        const customerRef = doc(db, 'clientes', customer.id);
        await updateDoc(customerRef, {
          data_vencimento: nextDueDate
        });
      } catch (err) {
        console.error('Error updating customer due date:', err);
      }
    }

    // Mark items as paid
    for (const item of selectedItems) {
      if (item.type === 'credit') {
        const docRef = doc(db, 'creditos', item.id);
        await updateDoc(docRef, {
          valor_restante: 0
        });
      } else {
        const collectionName = item.type === 'order' ? 'pedidos' : 'historico_banhos';
        const docRef = doc(db, collectionName, item.id);
        if (item.type === 'order') {
          await updateDoc(docRef, {
            status_pagamento: 'Pago',
            pago_em: new Date().toISOString()
          });
        } else {
          await updateDoc(docRef, {
            pago: true,
            dataPagamento: new Date().toISOString()
          });
        }
      }
    }

    // Redirect to new order page with pre-filled data
    const params = new URLSearchParams({
      new_order: 'true',
      codigo: customer.codigo,
      nome: customer.nome,
      telefone: customer.telefone || '',
      valor: (totalSelected || 0).toFixed(2).replace('.', ','),
      descricao: description
    });

    router.push(`/pedidos?${params.toString()}`);
    onClose();
  };

  const handleGenerateBilling = () => {
    if (selectedItems.length === 0) return;
    setShowDueDatePrompt(true);
    setDueDateStep('ask');
  };

  const handleAutomaticDueDate = () => {
    let baseDate = new Date();
    if (customer.data_vencimento) {
      try {
        baseDate = parseISO(customer.data_vencimento);
      } catch (e) {
        baseDate = new Date();
      }
    }
    const nextDate = addWeeks(baseDate, 4);
    finishGenerateBilling(format(nextDate, 'yyyy-MM-dd'));
  };

  const formatDate = (dateVal: any) => {
    if (!dateVal) return '-';
    try {
      let date: Date;
      if (typeof dateVal === 'object' && 'seconds' in dateVal) {
        date = new Date(dateVal.seconds * 1000);
      } else if (typeof dateVal === 'string') {
        date = dateVal.includes('T') ? parseISO(dateVal) : parseISO(`${dateVal}T12:00:00Z`);
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

  const handleDeleteCredit = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'creditos', id));
      setItemToDelete(null);
    } catch (err) {
      console.error('Erro ao excluir crédito:', err);
    }
  };

  const handleDeleteOrder = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'pedidos', id));
      setItemToDelete(null);
    } catch (err) {
      console.error('Erro ao excluir pedido:', err);
    }
  };

  const handleDeleteBath = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'historico_banhos', id));
      setItemToDelete(null);
    } catch (err) {
      console.error('Erro ao excluir banho:', err);
    }
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === 'credit') handleDeleteCredit(itemToDelete.id);
    else if (itemToDelete.type === 'order') handleDeleteOrder(itemToDelete.id);
    else if (itemToDelete.type === 'bath') handleDeleteBath(itemToDelete.id);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="text-indigo-600" size={24} />
              Histórico Unificado
            </h2>
            <p className="text-sm text-gray-500">{customer.nome} (#{customer.codigo})</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-indigo-600" size={32} />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="text-gray-300" size={32} />
              </div>
              <p className="font-medium">Nenhum registro encontrado.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div 
                  key={`${item.type}-${item.id}`}
                  className={`p-4 rounded-2xl border transition-all flex items-center gap-4 ${
                    selectedIds.has(item.id) 
                      ? 'bg-indigo-50 border-indigo-200 shadow-md' 
                      : item.type === 'credit' && item.status === 'pendente'
                        ? 'bg-emerald-50 border-emerald-100 hover:border-emerald-200'
                        : item.status === 'pendente'
                          ? 'bg-red-50 border-red-100 hover:border-red-200'
                          : 'bg-white border-gray-100 hover:border-gray-200'
                  }`}
                >
                  {/* Selection Checkbox */}
                  {item.status === 'pendente' && (
                    <button 
                      onClick={() => toggleSelection(item.id)}
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                        selectedIds.has(item.id)
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-gray-200 hover:border-indigo-400'
                      }`}
                    >
                      {selectedIds.has(item.id) && <Check size={14} strokeWidth={3} />}
                    </button>
                  )}

                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${
                        (item.type === 'bath' && !item.description.includes('PDV')) ? 'bg-amber-100 text-amber-600' : 
                        item.type === 'credit' ? 'bg-emerald-100 text-emerald-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {(item.type === 'bath' && !item.description.includes('PDV')) ? <Dog size={18} /> : 
                         item.type === 'credit' ? <DollarSign size={18} /> :
                         <ShoppingCart size={18} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                            item.status === 'pago' 
                              ? 'text-green-600 bg-green-50 border-green-100' 
                              : item.type === 'credit'
                                ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
                                : 'text-amber-600 bg-amber-50 border-amber-100'
                          }`}>
                            {item.type === 'credit' && item.status === 'pendente' ? 'Disponível' : item.status}
                          </span>
                          {item.type === 'bath' && item.originalData.status === 'Cancelado' && (
                            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border text-red-600 bg-red-50 border-red-100">
                              Cancelado
                            </span>
                          )}
                          <span className="text-[10px] text-gray-400 font-bold uppercase">{formatDate(item.date)}</span>
                        </div>
                        <p className="text-sm font-bold text-gray-800">{item.description}</p>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                       {item.status === 'pago' && (
                         <div className="text-[10px] text-gray-400 font-medium italic">
                           {item.type === 'credit' ? 'Crédito totalmente utilizado' : `Pago em: ${formatDate(item.type === 'order' ? item.originalData.pago_em : item.originalData.dataPagamento)}`}
                         </div>
                       )}
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4">
                      <div className={`text-lg font-black ${item.type === 'credit' ? 'text-emerald-600' : 'text-gray-900'}`}>
                        {item.type === 'credit' ? '-' : ''} R$ {(item.value || 0).toFixed(2)}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handlePrintItem(item)}
                          className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all"
                          title="Imprimir Comanda"
                        >
                          <Printer size={18} />
                        </button>
                        {item.type === 'order' && (
                          <>
                            {onEditOrder && (
                              <button
                                onClick={() => onEditOrder(item.originalData)}
                                className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all"
                                title="Editar Pedido"
                              >
                                <Edit2 size={18} />
                              </button>
                            )}
                            <button
                              onClick={() => setItemToDelete({ id: item.id, type: 'order' })}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                              title="Excluir Pedido"
                            >
                              <Trash2 size={18} />
                            </button>
                            <button
                              onClick={() => toggleStatus(item)}
                              disabled={updatingId === item.id}
                              className={`p-2 rounded-xl transition-all ${
                                item.status === 'pago'
                                  ? 'text-amber-500 hover:bg-amber-50'
                                  : 'text-green-500 hover:bg-green-50'
                              }`}
                              title={item.status === 'pago' ? "Voltar para Pendente" : "Marcar como Pago"}
                            >
                              {updatingId === item.id ? (
                                <Loader2 size={18} className="animate-spin" />
                              ) : item.status === 'pago' ? (
                                <RotateCcw size={18} />
                              ) : (
                                <CheckCircle2 size={18} />
                              )}
                            </button>
                          </>
                        )}

                        {item.type === 'bath' && (
                          <>
                            {onEditBath && (
                              <button
                                onClick={() => onEditBath(item.originalData)}
                                className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all"
                                title="Editar Banho"
                              >
                                <Edit2 size={18} />
                              </button>
                            )}
                            <button
                              onClick={() => setItemToDelete({ id: item.id, type: 'bath' })}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                              title="Excluir Banho"
                            >
                              <Trash2 size={18} />
                            </button>
                            <button
                              onClick={() => toggleStatus(item)}
                              disabled={updatingId === item.id}
                              className={`p-2 rounded-xl transition-all ${
                                item.status === 'pago'
                                  ? 'text-amber-500 hover:bg-amber-50'
                                  : 'text-green-500 hover:bg-green-50'
                              }`}
                              title={item.status === 'pago' ? "Voltar para Pendente" : "Marcar como Pago"}
                            >
                              {updatingId === item.id ? (
                                <Loader2 size={18} className="animate-spin" />
                              ) : item.status === 'pago' ? (
                                <RotateCcw size={18} />
                              ) : (
                                <CheckCircle2 size={18} />
                              )}
                            </button>
                          </>
                        )}

                        {item.type === 'credit' && (
                          <>
                            {onEditCredit && (
                              <button
                                onClick={() => onEditCredit(item.originalData)}
                                className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all"
                                title="Editar Crédito"
                              >
                                <Edit2 size={18} />
                              </button>
                            )}
                            <button
                              onClick={() => setItemToDelete({ id: item.id, type: 'credit' })}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                              title="Excluir Crédito"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 bg-white border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col">
            <div className="text-sm text-gray-500 font-medium">
              Selecionados: <span className="font-bold text-indigo-600">{selectedIds.size}</span> itens
            </div>
            <div className="text-2xl font-black text-gray-900">
              Total: <span className="text-green-600">R$ {(totalSelected || 0).toFixed(2)}</span>
            </div>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
            <button 
              onClick={onClose}
              className="flex-1 md:flex-none px-6 py-3 bg-white border border-gray-200 text-gray-600 rounded-2xl font-bold hover:bg-gray-50 transition-all"
            >
              Fechar
            </button>
            <button 
              onClick={handleGenerateBilling}
              disabled={selectedIds.size === 0}
              className={`flex-1 md:flex-none px-8 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                selectedIds.size > 0
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
                  : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed shadow-none'
              }`}
            >
              <DollarSign size={20} />
              Gerar Cobrança
            </button>
          </div>
        </div>
      </div>

      {itemToDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[70] backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Confirmar Exclusão</h3>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setItemToDelete(null)}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Due Date Prompt Modal */}
      {showDueDatePrompt && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="p-3 rounded-2xl bg-indigo-50">
                  <Calendar className="text-indigo-600" size={24} />
                </div>
                <button 
                  onClick={() => setShowDueDatePrompt(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"
                >
                  <X size={20} />
                </button>
              </div>
              
              {dueDateStep === 'ask' && (
                <>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Próximo Vencimento</h3>
                  <p className="text-gray-500 leading-relaxed">Deseja marcar a próxima data de vencimento para este cliente?</p>
                  <div className="mt-8 flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => finishGenerateBilling()}
                      className="flex-1 px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold hover:bg-gray-100 transition-all active:scale-95"
                    >
                      Não
                    </button>
                    <button
                      onClick={() => setDueDateStep('option')}
                      className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100"
                    >
                      Sim
                    </button>
                  </div>
                </>
              )}

              {dueDateStep === 'option' && (
                <>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Tipo de Vencimento</h3>
                  <p className="text-gray-500 leading-relaxed">Como deseja definir a próxima data?</p>
                  <div className="mt-8 flex flex-col gap-3">
                    <button
                      onClick={handleAutomaticDueDate}
                      className="w-full px-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100 flex items-center justify-between"
                    >
                      <span>Automático (4 semanas)</span>
                      <RotateCcw size={20} />
                    </button>
                    <button
                      onClick={() => setDueDateStep('manual')}
                      className="w-full px-6 py-4 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold hover:bg-gray-100 transition-all active:scale-95 flex items-center justify-between"
                    >
                      <span>Manual (Selecionar data)</span>
                      <Calendar size={20} />
                    </button>
                  </div>
                </>
              )}

              {dueDateStep === 'manual' && (
                <>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Selecionar Data</h3>
                  <p className="text-gray-500 leading-relaxed mb-4">Escolha a data do próximo vencimento:</p>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none mb-6"
                  />
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => setDueDateStep('option')}
                      className="flex-1 px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold hover:bg-gray-100 transition-all active:scale-95"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={() => finishGenerateBilling(manualDate)}
                      className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100"
                    >
                      Confirmar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
