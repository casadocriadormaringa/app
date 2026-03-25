'use client';

import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  doc 
} from 'firebase/firestore';
import { db } from '@/firebase';
import { X, Loader2, CheckCircle2, Clock, DollarSign, Calendar, Check, XCircle, RotateCcw } from 'lucide-react';
import { format, parseISO, addWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { CustomerData } from './CustomerForm';

interface BathRecord {
  id: string;
  clienteId: string;
  clienteNome: string;
  petNome?: string;
  data: string;
  status: string;
  tipo_pacote: string;
  valor: number;
  pago: boolean;
  faturado: boolean;
  dataPagamento?: string;
}

interface BathHistoryModalProps {
  customer: CustomerData;
  onClose: () => void;
}

export const BathHistoryModal: React.FC<BathHistoryModalProps> = ({ customer, onClose }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<BathRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
        date = dateVal.includes('T') ? parseISO(dateVal) : parseISO(`${dateVal}T12:00:00Z`);
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

  useEffect(() => {
    const q = query(
      collection(db, 'historico_banhos'),
      where('clienteId', '==', customer.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BathRecord[];
      
      // Sort in memory to avoid index requirement
      const sortedData = data.sort((a, b) => b.data.localeCompare(a.data));
      
      setRecords(sortedData);
      setLoading(false);
    }, (err) => {
      console.error('Erro ao buscar histórico:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [customer.id]);

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const [showDueDatePrompt, setShowDueDatePrompt] = useState(false);
  const [dueDateStep, setDueDateStep] = useState<'ask' | 'option' | 'manual'>('ask');
  const [manualDate, setManualDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const finishMarkAsPaid = async (nextDueDate?: string) => {
    if (selectedIds.size === 0) return;
    
    try {
      const selectedRecords = records.filter(r => selectedIds.has(r.id));
      const description = selectedRecords.map(r => {
        const dateStr = format(parseISO(r.data), 'dd/MM/yyyy');
        if (r.status === 'Cancelado') {
          return `❌ ${dateStr} - CANCELADO: ${r.tipo_pacote}${r.petNome ? ` - ${r.petNome}` : ''} (R$ ${(r.valor || 0).toFixed(2)})`;
        } else {
          return `✅ ${dateStr} - ${r.tipo_pacote} OK${r.petNome ? ` - ${r.petNome}` : ''} (R$ ${(r.valor || 0).toFixed(2)})`;
        }
      }).join('\n');

      const totalValue = selectedRecords.reduce((acc, r) => acc + r.valor, 0);

      // Mark as paid in history
      const promises = Array.from(selectedIds).map(id => 
        updateDoc(doc(db, 'historico_banhos', id), {
          pago: true,
          dataPagamento: new Date().toISOString()
        })
      );
      await Promise.all(promises);

      // Update customer due date if provided
      if (nextDueDate && customer.id) {
        await updateDoc(doc(db, 'clientes', customer.id), {
          data_vencimento: nextDueDate
        });
      }

      // Redirect to billing page with params
      const params = new URLSearchParams({
        new_order: 'true',
        codigo: customer.codigo,
        nome: customer.nome,
        telefone: customer.telefone,
        valor: (totalValue || 0).toFixed(2),
        descricao: description
      });

      router.push(`/pedidos?${params.toString()}`);
      onClose();
    } catch (err) {
      console.error('Erro ao processar cobrança:', err);
    }
  };

  const handleMarkAsPaid = () => {
    if (selectedIds.size === 0) return;
    setShowDueDatePrompt(true);
    setDueDateStep('ask');
  };

  const handleAutomaticDueDate = () => {
    let baseDate = new Date();
    if (customer.data_vencimento) {
      try {
        baseDate = parseISO(customer.data_vencimento);
        if (isNaN(baseDate.getTime())) baseDate = new Date();
      } catch (e) {
        baseDate = new Date();
      }
    }
    const nextDate = addWeeks(baseDate, 4);
    finishMarkAsPaid(format(nextDate, 'yyyy-MM-dd'));
  };

  const handleRevertToOpen = async (id: string) => {
    try {
      await updateDoc(doc(db, 'historico_banhos', id), {
        pago: false,
        dataPagamento: null
      });
    } catch (err) {
      console.error('Erro ao reverter status:', err);
    }
  };

  const totalSelected = Array.from(selectedIds).reduce((acc, id) => {
    const record = records.find(r => r.id === id);
    return acc + (record?.valor || 0);
  }, 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Histórico de Banhos</h2>
            <p className="text-sm text-gray-500">{customer.nome}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-indigo-600" size={32} />
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Nenhum histórico encontrado para este cliente.
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((record) => (
                <div 
                  key={record.id}
                  className={`p-4 rounded-2xl border transition-all flex items-center gap-4 ${
                    record.pago 
                      ? 'bg-gray-50 border-gray-100' 
                      : selectedIds.has(record.id)
                        ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500/20'
                        : 'bg-white border-gray-100 hover:border-indigo-200 cursor-pointer'
                  }`}
                  onClick={() => !record.pago && toggleSelection(record.id)}
                >
                  {!record.pago && (
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedIds.has(record.id)
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-gray-200'
                    }`}>
                      {selectedIds.has(record.id) && <Check size={14} />}
                    </div>
                  )}

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar size={14} className="text-gray-400" />
                      <span className="text-sm font-bold text-gray-700">
                        {formatDate(record.data)} {record.petNome && `- ${record.petNome}`}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                        {record.tipo_pacote}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {record.status === 'Cancelado' ? (
                        <>
                          <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                            <XCircle size={10} /> Cancelado
                          </span>
                          <span className="text-xs text-gray-400">❌ Banho Cancelado</span>
                        </>
                      ) : record.pago ? (
                        <>
                          <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                            <CheckCircle2 size={10} /> Pago {record.dataPagamento && `em ${formatDate(record.dataPagamento)}`}
                          </span>
                          <span className="text-xs text-gray-400">✅ Banho OK</span>
                        </>
                      ) : (
                        <>
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                            <Clock size={10} /> Em Aberto
                          </span>
                          <span className="text-xs text-gray-400">✅ Banho OK</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-4">
                    <div className="text-lg font-bold text-gray-900">
                      R$ {(record.valor || 0).toFixed(2)}
                    </div>
                    {record.pago && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRevertToOpen(record.id);
                        }}
                        className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                        title="Reverter para Aberto"
                      >
                        <RotateCcw size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedIds.size > 0 && (
          <div className="p-6 bg-indigo-600 text-white flex items-center justify-between">
            <div>
              <p className="text-xs font-medium opacity-80 uppercase tracking-wider">Total Selecionado</p>
              <p className="text-2xl font-bold">R$ {(totalSelected || 0).toFixed(2)}</p>
              <p className="text-xs opacity-80">{selectedIds.size} banho(s) selecionado(s)</p>
            </div>
            <button 
              onClick={handleMarkAsPaid}
              className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-bold hover:bg-gray-100 transition-all flex items-center gap-2 shadow-lg"
            >
              <DollarSign size={20} />
              Gerar Cobrança / Pagar
            </button>
          </div>
        )}
      </div>

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
                      onClick={() => finishMarkAsPaid()}
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
                      onClick={() => finishMarkAsPaid(manualDate)}
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
