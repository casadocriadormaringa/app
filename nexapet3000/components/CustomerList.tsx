'use client';

import React, { useState } from 'react';
import { Edit2, Trash2, Calendar, User, MapPin, Phone, Clock, CheckCircle, AlertCircle, History, MessageCircle, FileText, DollarSign, Dog, Copy, ExternalLink } from 'lucide-react';
import { format, isBefore, startOfDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CustomerData } from './CustomerForm';

interface CustomerListProps {
  customers: CustomerData[];
  pendingBalances?: Record<string, number>;
  onEdit: (customer: CustomerData) => void;
  onDelete: (id: string) => void;
  onViewHistory?: (customer: CustomerData) => void;
  onViewOrderHistory?: (customer: CustomerData) => void;
  onAddCredit?: (customer: CustomerData) => void;
}

export const CustomerList: React.FC<CustomerListProps> = ({ 
  customers, 
  pendingBalances = {}, 
  onEdit, 
  onDelete, 
  onViewHistory, 
  onViewOrderHistory,
  onAddCredit
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getStatusInfo = (dueDateStr: string) => {
    if (!dueDateStr) return { label: 'Sem data', color: 'text-gray-400', icon: <AlertCircle size={16} />, isExpired: false };
    
    const today = startOfDay(new Date());
    const dueDate = startOfDay(parseISO(dueDateStr));
    const isExpired = isBefore(dueDate, today);

    if (isExpired) {
      return {
        label: 'VENCIDO',
        color: 'text-red-600 bg-red-50 border-red-100',
        icon: <AlertCircle className="text-red-600" size={20} />,
        isExpired: true
      };
    }

    return {
      label: 'EM DIA',
      color: 'text-green-600 bg-green-50 border-green-100',
      icon: <CheckCircle className="text-green-600" size={20} />,
      isExpired: false
    };
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

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const handleCopyLink = (codigoConsulta: string, id: string) => {
    if (!codigoConsulta) return;
    const origin = window.location.origin;
    const link = `${origin}/consulta?code=${codigoConsulta}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (customers.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
        <p className="text-gray-400 font-medium">Nenhum cliente encontrado.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {customers.map((customer) => {
        const status = getStatusInfo(customer.data_vencimento);
        
        return (
          <div 
            key={customer.id} 
            className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all group relative"
          >
            {/* Status Badge */}
            <div className={`absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${status.color}`}>
              {status.icon}
              {status.label}
            </div>

            <div className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600">
                  <User size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-indigo-600 font-black text-sm">#{customer.codigo}</span>
                    <h3 className="font-bold text-gray-900 truncate text-lg">{customer.nome}</h3>
                  </div>
                  <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                    <Phone size={14} />
                    {customer.telefone || 'Sem telefone'}
                  </div>
                </div>
              </div>

              {/* Consultation Code Section */}
              {customer.codigoConsulta && (
                <div className="mb-4 bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block">Código de Consulta</span>
                    <span className="text-sm font-black text-indigo-700">{customer.codigoConsulta}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleCopyLink(customer.codigoConsulta!, customer.id!)}
                      className={`p-2 rounded-xl transition-all ${copiedId === customer.id ? 'bg-emerald-500 text-white' : 'bg-white text-indigo-600 hover:bg-indigo-100'}`}
                      title="Copiar Link de Consulta"
                    >
                      {copiedId === customer.id ? <CheckCircle size={16} /> : <Copy size={16} />}
                    </button>
                    <a
                      href={`/consulta?code=${customer.codigoConsulta}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-white text-indigo-600 hover:bg-indigo-100 rounded-xl transition-all"
                      title="Abrir Consulta"
                    >
                      <ExternalLink size={16} />
                    </a>
                  </div>
                </div>
              )}

              {/* Pending Balance Badge */}
              {pendingBalances[customer.id!] !== undefined && (
                <div className={`mb-4 flex items-center gap-2 px-4 py-2 rounded-2xl border ${
                  pendingBalances[customer.id!] > 0 
                    ? 'bg-red-50 border-red-100' 
                    : pendingBalances[customer.id!] < 0 
                      ? 'bg-green-50 border-green-100' 
                      : 'bg-blue-50 border-blue-100'
                }`}>
                  <DollarSign size={16} className={
                    pendingBalances[customer.id!] > 0 
                      ? 'text-red-600' 
                      : pendingBalances[customer.id!] < 0 
                        ? 'text-green-600' 
                        : 'text-blue-600'
                  } />
                  <div className="flex flex-col">
                    <span className={`text-[9px] font-black uppercase tracking-wider ${
                      pendingBalances[customer.id!] > 0 
                        ? 'text-red-400' 
                        : pendingBalances[customer.id!] < 0 
                          ? 'text-green-400' 
                          : 'text-blue-400'
                    }`}>
                      {pendingBalances[customer.id!] >= 0 
                        ? 'Pendente' 
                        : 'Crédito'}
                    </span>
                    <span className={`text-sm font-black ${
                      pendingBalances[customer.id!] > 0 
                        ? 'text-red-600' 
                        : pendingBalances[customer.id!] < 0 
                          ? 'text-green-600' 
                          : 'text-blue-600'
                    }`}>
                      R$ {(Math.abs(pendingBalances[customer.id!]) || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3 text-sm text-gray-600">
                  <MapPin size={16} className="text-gray-400 mt-0.5 shrink-0" />
                  <span className="line-clamp-2">{customer.endereco || 'Endereço não informado'}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Próximo Banho</span>
                    <div className="flex items-center gap-1.5 text-gray-700 font-semibold">
                      <Clock size={14} className="text-indigo-400" />
                      {formatDate(customer.proximo_banho)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Vencimento</span>
                    <div className={`flex items-center gap-1.5 font-bold ${status.isExpired ? 'text-red-600' : 'text-gray-700'}`}>
                      <Calendar size={14} className={status.isExpired ? 'text-red-400' : 'text-indigo-400'} />
                      {formatDate(customer.data_vencimento)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Pets Section */}
              {customer.pets && customer.pets.length > 0 && (
                <div className="mb-6 space-y-3">
                  <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    <Dog size={12} />
                    Pets ({customer.pets.length})
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {customer.pets.map(pet => (
                      <div key={pet.id} className="bg-white border border-gray-100 p-3 rounded-2xl flex flex-col gap-2 group/pet hover:border-indigo-200 transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-900 leading-none">{pet.nome}</span>
                            <span className="text-[10px] text-indigo-600 font-medium">{pet.raca} • {pet.porte}</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-gray-400 uppercase">{pet.dia_semana}</span>
                            <span className="text-xs font-black text-indigo-600">R$ {(Number(pet.valor_pacote) || 0).toFixed(2)}</span>
                          </div>
                        </div>

                        {pet.proximo_banho && (
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50/50 px-2 py-1 rounded-lg w-fit">
                            <Clock size={12} />
                            Próximo Banho: {formatDate(pet.proximo_banho)}
                          </div>
                        )}
                        
                        {(pet.vacinas?.length! > 0 || pet.vermifugos?.length! > 0) && (
                          <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-50 mt-1">
                            {pet.vacinas?.slice(-1).map((v, i) => (
                              <div key={i} className="flex items-center gap-1 text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                <AlertCircle size={10} />
                                Vacina: {v.proxima_dose || v.data}
                              </div>
                            ))}
                            {pet.vermifugos?.slice(-1).map((v, i) => (
                              <div key={i} className="flex items-center gap-1 text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                <AlertCircle size={10} />
                                Vermífugo: {v.proxima_dose || v.data}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-2xl p-4 mb-6 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] uppercase font-bold text-gray-400 block mb-1">Pacote {customer.tipo_pacote}</span>
                  <span className="text-lg font-black text-gray-900">R$ {(Number(customer.valor_pacote) || 0).toFixed(2)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase font-bold text-gray-400 block mb-1">Banho Avulso</span>
                  <span className="text-lg font-black text-indigo-600">R$ {(Number(customer.valor_banho_avulso) || 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-50">
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-500 bg-gray-100 px-3 py-1 rounded-full uppercase tracking-wider">
                    <Calendar size={12} />
                    {customer.dia_semana}
                  </div>
                  {customer.banho_e_tosa === 'Sim' && (
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wider">
                      <CheckCircle size={12} />
                      Cliente de Pacote
                    </div>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-1 ml-auto">
                  {customer.telefone && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleWhatsApp(customer.telefone);
                      }}
                      className="p-2 text-green-500 hover:bg-green-50 rounded-xl transition-all border border-transparent hover:border-green-100"
                      title="WhatsApp"
                    >
                      <MessageCircle size={18} />
                    </button>
                  )}
                  {onViewOrderHistory && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewOrderHistory(customer);
                      }}
                      className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all border border-transparent hover:border-indigo-100"
                      title="Histórico de Pedidos"
                    >
                      <FileText size={18} />
                    </button>
                  )}
                  {onViewHistory && customer.banho_e_tosa === 'Sim' && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewHistory(customer);
                      }}
                      className="p-2 text-amber-500 hover:bg-amber-50 rounded-xl transition-all border border-transparent hover:border-amber-100"
                      title="Histórico de Pacotes"
                    >
                      <History size={18} />
                    </button>
                  )}
                  {onAddCredit && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddCredit(customer);
                      }}
                      className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all border border-transparent hover:border-emerald-100"
                      title="Lançar Crédito"
                    >
                      <DollarSign size={18} />
                    </button>
                  )}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(customer);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100"
                    title="Editar"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (customer.id) onDelete(customer.id);
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                    title="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
