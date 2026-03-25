'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, User, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { collection, getDocs, query, orderBy, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { OrderData } from '@/types/order';
import { CustomerData } from './CustomerForm';
import { DollarSign, CheckCircle, AlertCircle } from 'lucide-react';

interface CreditUsage {
  creditId: string;
  amount: number;
}

interface OrderFormProps {
  order?: OrderData | null;
  onSave: (data: Omit<OrderData, 'id'>, creditsUsed?: CreditUsage[]) => void;
  onClose: () => void;
}

export const OrderForm: React.FC<OrderFormProps> = ({ order, onSave, onClose }) => {
  const normalizeDate = (val: any) => {
    if (!val) return '';
    if (typeof val === 'object' && 'seconds' in val) {
      return new Date(val.seconds * 1000).toISOString();
    }
    return String(val);
  };

  const [formData, setFormData] = useState<Omit<OrderData, 'id'>>({
    codigo_cliente: order?.codigo_cliente || '',
    cliente_nome: order?.cliente_nome || '',
    data_cobranca: normalizeDate(order?.data_cobranca),
    descricao_cobranca: order?.descricao_cobranca || '',
    status_pagamento: order?.status_pagamento || 'pendente',
    telefone_cliente: order?.telefone_cliente || '',
    endereco_cliente: order?.endereco_cliente || '',
    valor_total: order?.valor_total ? String(order.valor_total).replace('.', ',') : '',
    link_de_pagamento: order?.link_de_pagamento || '',
    pago_em: normalizeDate(order?.pago_em),
    pgtoenviado_dia: normalizeDate(order?.pgtoenviado_dia),
    pgtogerado_dia: normalizeDate(order?.pgtogerado_dia) || format(new Date(), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
    tipodepagamentopixcartao: order?.tipodepagamentopixcartao || 'Pix',
    clienteCodigoConsulta: order?.clienteCodigoConsulta || '',
  });

  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [creditsById, setCreditsById] = useState<any[]>([]);
  const [creditsByName, setCreditsByName] = useState<any[]>([]);
  const [creditToUse, setCreditToUse] = useState<Record<string, number>>({});

  // Auto-fill name/code when one is entered and matches a customer
  useEffect(() => {
    const code = String(formData.codigo_cliente || '').trim();
    const name = String(formData.cliente_nome || '').trim().toLowerCase();

    if (code && !formData.cliente_nome) {
      const customer = customers.find(c => {
        const cCode = String(c.codigo || '').trim();
        const n1 = Number(cCode);
        const n2 = Number(code);
        return cCode === code || (code !== '' && !isNaN(n1) && !isNaN(n2) && n1 === n2);
      });
      if (customer) {
        setFormData(prev => ({
          ...prev,
          cliente_nome: customer.nome,
          telefone_cliente: customer.telefone || '',
          endereco_cliente: customer.endereco || '',
          clienteCodigoConsulta: customer.codigoConsulta || ''
        }));
      }
    } else if (name && !formData.codigo_cliente) {
      const customer = customers.find(c => {
        const cNome = String(c.nome || '').trim().toLowerCase();
        return cNome === name || cNome.includes(name);
      });
      if (customer) {
        setFormData(prev => ({
          ...prev,
          codigo_cliente: customer.codigo,
          telefone_cliente: customer.telefone || '',
          endereco_cliente: customer.endereco || '',
          clienteCodigoConsulta: customer.codigoConsulta || ''
        }));
      }
    }
  }, [formData.codigo_cliente, formData.cliente_nome, customers]);

  useEffect(() => {
    const clientCode = String(formData.codigo_cliente || '').trim();
    const clientName = String(formData.cliente_nome || '').trim().toLowerCase();
    
    if (!clientCode && !clientName) {
      setCreditsById([]);
      setCreditsByName([]);
      return;
    }
    
    // Find customer by code or name to get ID
    let customer = customers.find(c => {
      const cCode = String(c.codigo || '').trim();
      const targetCode = clientCode;
      
      // Exact match
      if (cCode === targetCode) return true;
      
      // Numeric match (e.g. "01" matches "1")
      const n1 = Number(cCode);
      const n2 = Number(targetCode);
      if (targetCode !== '' && !isNaN(n1) && !isNaN(n2) && n1 === n2) return true;
      
      return false;
    });
    
    // Fallback to name if code doesn't match
    if (!customer && clientName) {
      customer = customers.find(c => {
        const cNome = String(c.nome || '').trim().toLowerCase();
        return cNome === clientName || cNome.includes(clientName);
      });
    }
    
    if (!customer?.id) {
      setCreditsById([]);
      setCreditsByName([]);
      return;
    }

    const qById = query(
      collection(db, 'creditos'),
      where('clienteId', '==', customer.id)
    );

    // Also try by name as a fallback for any legacy or mislinked records
    const qByName = query(
      collection(db, 'creditos'),
      where('clienteNome', '==', customer.nome)
    );

    const unsubById = onSnapshot(qById, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCreditsById(data);
    });

    const unsubByName = onSnapshot(qByName, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCreditsByName(data);
    });

    return () => {
      unsubById();
      unsubByName();
    };
  }, [formData.codigo_cliente, formData.cliente_nome, customers]);

  // Merge and filter credits
  const availableCredits = useMemo(() => {
    const map = new Map();
    
    const addValid = (list: any[]) => {
      list.forEach(c => {
        if ((c.valor_restante || 0) > 0) {
          map.set(c.id, c);
        }
      });
    };

    addValid(creditsById);
    addValid(creditsByName);

    return Array.from(map.values());
  }, [creditsById, creditsByName]);

  const totalAvailableCredit = availableCredits.reduce((sum, c) => sum + (c.valor_restante || 0), 0);
  const totalCreditApplied = Object.values(creditToUse).reduce((sum, val) => sum + val, 0);

  const handleCreditChange = (creditId: string, amount: number, max: number) => {
    const val = Math.min(Math.max(0, amount), max);
    setCreditToUse(prev => ({
      ...prev,
      [creditId]: val
    }));
  };

  useEffect(() => {
    const q = query(collection(db, 'clientes'), orderBy('nome', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const customersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CustomerData[];
      setCustomers(customersData);
      setLoadingCustomers(false);
    }, (error) => {
      console.error('Erro ao buscar clientes:', error);
      setLoadingCustomers(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return [];
    const term = customerSearch.toLowerCase();
    return customers.filter(c => 
      c.nome.toLowerCase().includes(term) || 
      c.codigo.toLowerCase().includes(term)
    ).slice(0, 5);
  }, [customers, customerSearch]);

  const selectCustomer = (customer: CustomerData) => {
    setFormData({
      ...formData,
      cliente_id: customer.id,
      codigo_cliente: customer.codigo,
      cliente_nome: customer.nome,
      telefone_cliente: customer.telefone,
      endereco_cliente: customer.endereco || '',
      clienteCodigoConsulta: customer.codigoConsulta || '',
    });
    setCustomerSearch('');
    setShowResults(false);
  };

  const generatePaymentLink = async () => {
    if (!formData.valor_total || !formData.cliente_nome) {
      alert('Por favor, preencha o valor e o nome do cliente antes de gerar o link.');
      return;
    }

    setIsGeneratingLink(true);
    try {
      const response = await fetch('/api/generate-payment-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price: formData.valor_total,
          description: formData.cliente_nome,
          nsu: order?.id || `TEMP_${Date.now()}`,
          nomedocliente: formData.cliente_nome,
          telefone: formData.telefone_cliente,
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.url) {
        setFormData({ ...formData, link_de_pagamento: data.url });
      } else {
        console.error('Erro ao gerar link:', data);
        alert('Erro ao gerar link de pagamento. Verifique o console.');
      }
    } catch (error) {
      console.error('Erro na requisição:', error);
      alert('Erro ao conectar com o servidor.');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Normalize valor_total
    const rawValue = String(formData.valor_total).replace(/[R$\s]/g, '');
    let normalizedValue = rawValue;
    
    if (rawValue.includes(',')) {
      // Brazilian format: 1.234,56 -> 1234.56
      normalizedValue = rawValue.replace(/\./g, '').replace(',', '.');
    } else {
      // If no comma, we assume it's already using dot as decimal or is an integer
      // We don't strip the dot here to avoid turning 90.00 into 9000
      normalizedValue = rawValue;
    }
      
    const creditsUsed = Object.entries(creditToUse)
      .filter(([_, amount]) => amount > 0)
      .map(([creditId, amount]) => ({ creditId, amount }));

    onSave({
      ...formData,
      valor_total: normalizedValue
    }, creditsUsed);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60] backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900">
            {order ? 'Editar Pedido' : 'Novo Pedido'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Customer Search Section */}
          {!order && (
            <div className="relative space-y-1 pb-4 border-b border-gray-50">
              <label className="text-xs font-bold uppercase tracking-wider text-indigo-600">Buscar Cliente Cadastrado</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowResults(true);
                  }}
                  onFocus={() => setShowResults(true)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-indigo-100 bg-indigo-50/30 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  placeholder="Digite nome ou código do cliente..."
                />
                {loadingCustomers && (
                  <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400 animate-spin" size={18} />
                )}
              </div>

              {showResults && filteredCustomers.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                  {filteredCustomers.map(customer => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => selectCustomer(customer)}
                      className="w-full px-4 py-3 text-left hover:bg-indigo-50 flex items-center gap-3 transition-colors border-b border-gray-50 last:border-0"
                    >
                      <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                        <User size={16} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{customer.nome}</p>
                        <p className="text-xs text-gray-500">Código: {customer.codigo} • {customer.telefone}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {showResults && customerSearch.trim() && filteredCustomers.length === 0 && !loadingCustomers && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 p-4 text-center text-gray-500 text-sm">
                  Nenhum cliente encontrado.
                </div>
              )}
            </div>
          )}
          
          {/* Credit Usage Section - Moved Up for Visibility */}
          {formData.codigo_cliente && (
            <div className={`p-6 rounded-3xl border transition-all ${
              availableCredits.length > 0 
                ? 'bg-emerald-50 border-emerald-100 space-y-4' 
                : 'bg-gray-50 border-gray-100'
            }`}>
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-2 ${availableCredits.length > 0 ? 'text-emerald-700' : 'text-gray-500'}`}>
                  <DollarSign size={20} />
                  <h3 className="font-bold">Créditos do Cliente</h3>
                </div>
                {availableCredits.length > 0 && (
                  <span className="bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                    Total Disponível: R$ {(totalAvailableCredit || 0).toFixed(2)}
                  </span>
                )}
              </div>

              {availableCredits.length > 0 ? (
                <div className="space-y-3">
                  {availableCredits.map(credit => (
                    <div key={credit.id} className="bg-white p-4 rounded-2xl border border-emerald-100 flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                          {credit.data_recebimento} - {credit.tipo_pagamento}
                        </p>
                        <p className="text-sm text-gray-700 italic">{credit.descricao || 'Sem descrição'}</p>
                        <p className="text-sm font-bold text-emerald-600">Disponível: R$ {(credit.valor_restante || 0).toFixed(2)}</p>
                      </div>
                      <div className="w-32">
                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Usar</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={credit.valor_restante}
                          value={creditToUse[credit.id] || ''}
                          onChange={(e) => handleCreditChange(credit.id, parseFloat(e.target.value) || 0, credit.valor_restante)}
                          className="w-full px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-emerald-700"
                          placeholder="0,00"
                        />
                      </div>
                    </div>
                  ))}
                  
                  {totalCreditApplied > 0 && (
                    <div className="pt-2 border-t border-emerald-100 flex justify-between items-center">
                      <span className="text-sm font-bold text-emerald-700">Total de Abatimento:</span>
                      <span className="text-lg font-black text-emerald-600">- R$ {(totalCreditApplied || 0).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">Nenhum crédito disponível para este cliente.</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Código do Cliente</label>
              <input
                required
                type="text"
                value={formData.codigo_cliente}
                onChange={(e) => setFormData({ ...formData, codigo_cliente: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="Ex: CLI001"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Status do Pagamento</label>
              <input
                required
                type="text"
                value={formData.status_pagamento}
                onChange={(e) => setFormData({ ...formData, status_pagamento: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="Ex: pendente, pago"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Nome do Cliente</label>
              <input
                required
                type="text"
                value={formData.cliente_nome}
                onChange={(e) => setFormData({ ...formData, cliente_nome: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Telefone</label>
              <input
                type="text"
                value={formData.telefone_cliente}
                onChange={(e) => setFormData({ ...formData, telefone_cliente: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Endereço</label>
            <input
              type="text"
              value={formData.endereco_cliente}
              onChange={(e) => setFormData({ ...formData, endereco_cliente: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="Endereço completo"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Valor Total</label>
              <input
                type="text"
                value={formData.valor_total}
                onChange={(e) => setFormData({ ...formData, valor_total: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Tipo de Pagamento</label>
              <input
                type="text"
                value={formData.tipodepagamentopixcartao}
                onChange={(e) => setFormData({ ...formData, tipodepagamentopixcartao: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="Pix ou Cartão"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Descrição da Cobrança</label>
            <textarea
              value={formData.descricao_cobranca}
              onChange={(e) => setFormData({ ...formData, descricao_cobranca: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="Detalhes do pedido..."
              rows={5}
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-end">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Link de Pagamento</label>
              <button
                type="button"
                disabled={isGeneratingLink}
                onClick={generatePaymentLink}
                className={`px-3 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all border ${
                  isGeneratingLink 
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                    : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100'
                }`}
              >
                {isGeneratingLink ? 'Gerando...' : 'Gerar Link de Pagamento'}
              </button>
            </div>
            <input
              type="text"
              value={formData.link_de_pagamento}
              onChange={(e) => setFormData({ ...formData, link_de_pagamento: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="https://..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Data Cobrança</label>
              <input
                type="date"
                value={formData.data_cobranca ? formData.data_cobranca.split('T')[0] : ''}
                onChange={(e) => setFormData({ ...formData, data_cobranca: e.target.value ? `${e.target.value}T12:00:00Z` : '' })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Pago em</label>
              <input
                type="date"
                value={formData.pago_em ? formData.pago_em.split('T')[0] : ''}
                onChange={(e) => setFormData({ ...formData, pago_em: e.target.value ? `${e.target.value}T12:00:00Z` : '' })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
            </div>
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
