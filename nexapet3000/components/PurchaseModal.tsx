'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, Plus, Trash2, Check, AlertCircle, Loader2, Package, Truck, Calendar, DollarSign, Edit3 } from 'lucide-react';
import { ProductData } from './ProductForm';
import { SupplierData } from './SupplierForm';
import { format } from 'date-fns';

export interface PurchaseItem {
  produtoId: string;
  nome: string;
  codigo: string;
  quantidadePedida: number;
  quantidadeRecebida: number;
  precoCusto: number;
  recebido: boolean;
}

export interface Installment {
  data: string;
  valor: number;
}

export interface PurchaseData {
  id?: string;
  dataPedido: string;
  dataRecebimento?: string;
  status: 'ABERTO' | 'RECEBIDO' | 'CANCELADO';
  fornecedorId?: string;
  fornecedorNome?: string;
  itens: PurchaseItem[];
  valorTotal: number;
  createdAt: string;
  numeroNF?: string;
  formaPagamento?: string;
  vencimentos?: Installment[];
}

interface PurchaseModalProps {
  purchase: PurchaseData | null;
  products: ProductData[];
  suppliers: SupplierData[];
  onSave: (data: Omit<PurchaseData, 'id'>) => Promise<void>;
  onClose: () => void;
}

export function PurchaseModal({ purchase, products, suppliers, onSave, onClose }: PurchaseModalProps) {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState(purchase?.fornecedorId || '');
  const [itens, setItens] = useState<PurchaseItem[]>(purchase?.itens || []);
  const [status, setStatus] = useState<'ABERTO' | 'RECEBIDO' | 'CANCELADO'>(
    purchase?.status === 'ABERTO' ? 'RECEBIDO' : (purchase?.status || 'ABERTO')
  );
  const [numeroNF, setNumeroNF] = useState(purchase?.numeroNF || '');
  const [formaPagamento, setFormaPagamento] = useState(purchase?.formaPagamento || '');
  const [vencimentos, setVencimentos] = useState<Installment[]>(purchase?.vencimentos || []);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return [];
    const term = searchTerm.toLowerCase();
    return products.filter(p => 
      p.tipo !== 'SERVICO' && (
        p.nome.toLowerCase().includes(term) || 
        p.codigo.toLowerCase().includes(term)
      )
    );
  }, [products, searchTerm]);

  const addItem = (product: ProductData) => {
    const existing = itens.find(i => i.produtoId === product.id);
    if (existing) return;

    setItens([...itens, {
      produtoId: product.id!,
      nome: product.nome,
      codigo: product.codigo,
      quantidadePedida: 1,
      quantidadeRecebida: 0,
      precoCusto: product.precoCusto || 0,
      recebido: false
    }]);
    setSearchTerm('');
  };

  const updateItem = (index: number, field: keyof PurchaseItem, value: any) => {
    const newItens = [...itens];
    newItens[index] = { ...newItens[index], [field]: value };
    setItens(newItens);
  };

  const removeItem = (index: number) => {
    setItens(itens.filter((_, i) => i !== index));
  };

  const total = useMemo(() => {
    return itens.reduce((acc, item) => {
      const qty = status === 'RECEBIDO' ? item.quantidadeRecebida : item.quantidadePedida;
      return acc + (qty * item.precoCusto);
    }, 0);
  }, [itens, status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (itens.length === 0) return;

    setLoading(true);
    try {
      const supplier = suppliers.find(s => s.id === selectedSupplierId);
      const processedItens = status === 'RECEBIDO'
        ? itens.map(item => ({
            ...item,
            quantidadeRecebida: item.quantidadeRecebida === 0 ? item.quantidadePedida : item.quantidadeRecebida,
            recebido: item.quantidadeRecebida === 0 ? true : item.recebido
          }))
        : itens;

      const purchaseData: Omit<PurchaseData, 'id'> = {
        dataPedido: purchase?.dataPedido || new Date().toISOString(),
        status,
        fornecedorId: selectedSupplierId,
        fornecedorNome: supplier?.nome || '',
        itens: processedItens,
        valorTotal: total,
        createdAt: purchase?.createdAt || new Date().toISOString(),
        numeroNF,
        formaPagamento,
        vencimentos
      };

      if (status === 'RECEBIDO') {
        purchaseData.dataRecebimento = new Date().toISOString();
      }

      await onSave(purchaseData);
    } catch (err) {
      console.error('Erro ao salvar compra:', err);
    } finally {
      setLoading(false);
    }
  };

  const isConference = purchase?.status === 'ABERTO';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl">
              <Truck className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {purchase ? (isConference ? 'Conferência de Compra' : 'Detalhes da Compra') : 'Nova Compra'}
              </h2>
              <p className="text-xs text-gray-500">
                {purchase ? `Pedido #${purchase.id?.slice(-6).toUpperCase()}` : 'Registre um novo pedido de compra'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-all">
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Fornecedor</label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                disabled={status === 'RECEBIDO'}
                className="w-full px-4 py-2.5 sm:py-3 bg-gray-50 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm sm:text-base"
              >
                <option value="">Selecione um fornecedor</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Status</label>
              <div className="flex gap-2">
                {['ABERTO', 'RECEBIDO', 'CANCELADO'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s as any)}
                    disabled={purchase?.status === 'RECEBIDO' && s !== 'RECEBIDO'}
                    className={`flex-1 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all ${
                      status === s 
                        ? (s === 'ABERTO' ? 'bg-blue-600 text-white' : s === 'RECEBIDO' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white')
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {(status === 'ABERTO' || status === 'RECEBIDO') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Número da NF</label>
                <input
                  type="text"
                  value={numeroNF}
                  onChange={(e) => setNumeroNF(e.target.value)}
                  placeholder="Ex: 000.123.456"
                  className="w-full px-4 py-2 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Forma de Pagamento</label>
                <input
                  type="text"
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value)}
                  placeholder="Ex: Boleto, Pix, Cartão..."
                  className="w-full px-4 py-2 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                />
              </div>

              <div className="md:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">Vencimentos e Valores</label>
                  <button
                    type="button"
                    onClick={() => setVencimentos([...vencimentos, { data: format(new Date(), 'yyyy-MM-dd'), valor: 0 }])}
                    className="text-[10px] font-bold text-indigo-600 bg-white border border-indigo-100 px-3 py-1 rounded-full hover:bg-indigo-50 transition-all flex items-center gap-1"
                  >
                    <Plus size={12} />
                    Adicionar Parcela
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {vencimentos.map((v, i) => (
                    <div key={i} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-100">
                      <input
                        type="date"
                        value={v.data}
                        onChange={(e) => {
                          const newV = [...vencimentos];
                          newV[i].data = e.target.value;
                          setVencimentos(newV);
                        }}
                        className="flex-1 px-2 py-1 bg-gray-50 rounded-lg text-xs font-bold outline-none border-transparent focus:border-indigo-200"
                      />
                      <div className="relative flex-1">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={v.valor}
                          onChange={(e) => {
                            const newV = [...vencimentos];
                            newV[i].valor = Number(e.target.value);
                            setVencimentos(newV);
                          }}
                          className="w-full pl-6 pr-2 py-1 bg-gray-50 rounded-lg text-xs font-bold outline-none border-transparent focus:border-indigo-200"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setVencimentos(vencimentos.filter((_, idx) => idx !== i))}
                        className="text-red-400 hover:text-red-600 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {vencimentos.length === 0 && (
                    <p className="text-[10px] text-gray-400 italic px-2">Nenhum vencimento adicionado.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {status !== 'RECEBIDO' && (
            <div className="relative">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1 block mb-2">Adicionar Produtos</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Pesquisar por nome ou código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-2.5 sm:py-3 bg-gray-50 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm sm:text-base"
                />
              </div>
              
              {filteredProducts.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-10 max-h-60 overflow-y-auto">
                  {filteredProducts.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addItem(p)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-all text-left border-b border-gray-50 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-bold text-gray-900">{p.nome}</p>
                        <p className="text-[10px] text-gray-400 uppercase">#{p.codigo} • Estoque: {p.estoqueAtual}</p>
                      </div>
                      <Plus size={18} className="text-indigo-600" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Itens do Pedido</h3>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                {itens.length} {itens.length === 1 ? 'item' : 'itens'}
              </span>
            </div>

            <div className="space-y-3">
              {itens.map((item, index) => (
                <div key={index} className={`p-4 rounded-2xl border transition-all ${item.recebido ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-gray-100'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">{item.nome}</p>
                      <p className="text-[10px] text-gray-400 uppercase">#{item.codigo}</p>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4 flex-wrap sm:flex-nowrap">
                      <div className="flex-1 sm:w-24">
                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Qtd Pedida</label>
                        <input
                          type="number"
                          value={item.quantidadePedida}
                          onChange={(e) => updateItem(index, 'quantidadePedida', Number(e.target.value))}
                          disabled={status === 'RECEBIDO'}
                          className="w-full px-3 py-2 bg-gray-50 rounded-xl border border-gray-100 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>

                      {status === 'RECEBIDO' && (
                        <div className="flex-1 sm:w-24">
                          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Qtd Recebida</label>
                          <input
                            type="number"
                            value={item.quantidadeRecebida}
                            onChange={(e) => updateItem(index, 'quantidadeRecebida', Number(e.target.value))}
                            className="w-full px-3 py-2 bg-white rounded-xl border border-emerald-200 text-sm font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                        </div>
                      )}

                      <div className="flex-1 sm:w-28">
                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Custo Unit.</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={item.precoCusto}
                            onChange={(e) => updateItem(index, 'precoCusto', Number(e.target.value))}
                            className="w-full pl-6 pr-2 py-2 bg-gray-50 rounded-xl border border-gray-100 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:pt-4">
                        {status === 'RECEBIDO' && (
                          <button
                            type="button"
                            onClick={() => {
                              const newRecebido = !item.recebido;
                              updateItem(index, 'recebido', newRecebido);
                              if (newRecebido && item.quantidadeRecebida === 0) {
                                updateItem(index, 'quantidadeRecebida', item.quantidadePedida);
                              }
                            }}
                            className={`p-2 rounded-xl transition-all ${item.recebido ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                          >
                            <Check size={18} />
                          </button>
                        )}
                        {status !== 'RECEBIDO' && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {itens.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                  <Package className="mx-auto text-gray-300 mb-2" size={32} />
                  <p className="text-sm text-gray-400">Nenhum produto adicionado ao pedido.</p>
                </div>
              )}
            </div>
          </div>
        </form>

        <div className="p-4 sm:p-6 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col items-center sm:items-start">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Valor Total Estimado</span>
            <span className="text-xl sm:text-2xl font-black text-gray-900">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 sm:px-6 py-3 bg-white border border-gray-200 text-gray-600 rounded-2xl font-bold hover:bg-gray-50 transition-all active:scale-95 text-sm sm:text-base"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || itens.length === 0}
              className={`flex-[2] sm:flex-none px-6 sm:px-8 py-3 rounded-2xl font-bold text-white shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 text-sm sm:text-base ${
                status === 'RECEBIDO' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
              }`}
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (status === 'RECEBIDO' ? <Check size={20} /> : <Truck size={20} />)}
              <span className="whitespace-nowrap">
                {purchase ? (status === 'RECEBIDO' ? 'Finalizar' : 'Salvar') : 'Confirmar'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
