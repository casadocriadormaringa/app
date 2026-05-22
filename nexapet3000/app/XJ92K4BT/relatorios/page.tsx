'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy,
  where,
  getDocs,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import { db } from '@/firebase';
import { Navbar } from '@/components/Navbar';
import { SecurityLock } from '@/components/SecurityLock';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { 
  Search, 
  Calendar, 
  Loader2, 
  Filter, 
  DollarSign, 
  FileText, 
  Dog, 
  Package, 
  ChevronRight,
  ArrowLeft,
  TrendingUp,
  Download,
  Users,
  RotateCcw,
  Printer,
  Lock
} from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import Link from 'next/link';

export default function RelatoriosPage() {
  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-[#F8F9FA]">
        <Navbar />
        <SecurityLock>
          <RelatoriosContent />
        </SecurityLock>
      </main>
    </ErrorBoundary>
  );
}

function RelatoriosContent() {
  const [loading, setLoading] = useState(true);
  const [vendas, setVendas] = useState<any[]>([]);
  const [historicoBanhos, setHistoricoBanhos] = useState<any[]>([]);
  const [lastVendaDoc, setLastVendaDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [lastBanhoDoc, setLastBanhoDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-01'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [searchNumber, setSearchNumber] = useState('');
  const [searchClient, setSearchClient] = useState('');
  const [activeTab, setActiveTab] = useState<'TODOS' | 'BANHOS' | 'PRODUTOS'>('TODOS');

  const fetchData = useCallback(async (
    isNextPage = false, 
    currentLastVendaDoc: QueryDocumentSnapshot<DocumentData> | null = null,
    currentLastBanhoDoc: QueryDocumentSnapshot<DocumentData> | null = null
  ) => {
    if (isNextPage) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setVendas([]);
      setHistoricoBanhos([]);
    }

    try {
      const qVendas = query(
        collection(db, 'vendas'),
        orderBy('numeroVenda', 'desc'),
        limit(10),
        ...(isNextPage && currentLastVendaDoc ? [startAfter(currentLastVendaDoc)] : [])
      );

      const qBanhos = query(
        collection(db, 'historico_banhos'),
        orderBy('data', 'desc'),
        limit(10),
        ...(isNextPage && currentLastBanhoDoc ? [startAfter(currentLastBanhoDoc)] : [])
      );

      const [vendasSnap, banhosSnap] = await Promise.all([
        getDocs(qVendas),
        getDocs(qBanhos)
      ]);

      const newVendas = vendasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const newBanhos = banhosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (isNextPage) {
        setVendas(prev => [...prev, ...newVendas]);
        setHistoricoBanhos(prev => [...prev, ...newBanhos]);
      } else {
        setVendas(newVendas);
        setHistoricoBanhos(newBanhos);
      }

      setLastVendaDoc(vendasSnap.docs[vendasSnap.docs.length - 1] || null);
      setLastBanhoDoc(banhosSnap.docs[banhosSnap.docs.length - 1] || null);
      setHasMore(vendasSnap.docs.length === 10 || banhosSnap.docs.length === 10);

      // Fetch products if not already fetched
      if (products.length === 0) {
        const productsSnap = await getDocs(query(collection(db, 'produtos')));
        setProducts(productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }

    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [products.length]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const safeParseDate = (dateVal: any): Date => {
    if (!dateVal) return new Date(0); // Epoch as fallback
    try {
      if (typeof dateVal === 'object' && dateVal.seconds) {
        return new Date(dateVal.seconds * 1000);
      }
      if (typeof dateVal === 'string') {
        if (dateVal.includes('T')) return parseISO(dateVal);
        // Handle YYYY-MM-DD
        return parseISO(`${dateVal}T12:00:00`);
      }
      if (dateVal instanceof Date) return dateVal;
      return new Date(dateVal);
    } catch (e) {
      console.error('Error parsing date:', dateVal, e);
      return new Date(0);
    }
  };

  const filteredData = useMemo(() => {
    try {
      const start = startOfDay(parseISO(startDate));
      const end = endOfDay(parseISO(endDate));

      // Process Vendas
      const processedVendas = vendas.filter(v => {
        if (!v.createdAt) return false;
        const date = safeParseDate(v.createdAt);
        if (isNaN(date.getTime())) return false;
        
        const matchesDate = isWithinInterval(date, { start, end });
        const matchesNumber = searchNumber ? String(v.numeroVenda || '').includes(searchNumber) : true;
        const matchesClient = searchClient ? (v.clienteNome || '').toLowerCase().includes(searchClient.toLowerCase()) : true;
        return matchesDate && matchesNumber && matchesClient;
      }).map(v => {
        const bathItems = v.itens?.filter((item: any) => 
          (item.fornecedorNome?.toUpperCase() || '').includes('BANHO') || 
          (item.nome?.toUpperCase() || '').includes('BANHO')
        ) || [];
        
        const productItems = v.itens?.filter((item: any) => 
          !((item.fornecedorNome?.toUpperCase() || '').includes('BANHO') || 
            (item.nome?.toUpperCase() || '').includes('BANHO')) &&
          item.tipo === 'PRODUTO'
        ) || [];

        const bathValue = bathItems.reduce((acc: number, item: any) => acc + (item.subtotal || 0), 0);
        const productValue = productItems.reduce((acc: number, item: any) => acc + (item.subtotal || 0), 0);

        const totalCost = v.itens?.reduce((acc: number, item: any) => {
          const cost = item.precoCusto || products.find(p => p.id === item.id)?.precoCusto || 0;
          return acc + (cost * (item.quantidade || 0));
        }, 0) || 0;
        const profit = (v.valorTotal || 0) - totalCost;

        return {
          ...v,
          type: 'VENDA',
          bathValue,
          productValue,
          totalCost,
          profit,
          displayDate: v.createdAt
        };
      });

      // Process Historico Banhos (only those NOT from PDV to avoid double counting)
      const processedBanhos = historicoBanhos.filter(b => {
        const dateVal = b.data || b.createdAt;
        if (!dateVal) return false;
        const date = safeParseDate(dateVal);
        if (isNaN(date.getTime())) return false;

        const matchesDate = isWithinInterval(date, { start, end });
        const isFromPDV = (b.tipo_pacote || '').startsWith('Venda a Prazo no PDV');
        const isConcluido = b.status === 'Concluído';
        const matchesClient = searchClient ? (b.clienteNome || '').toLowerCase().includes(searchClient.toLowerCase()) : true;
        return matchesDate && !isFromPDV && isConcluido && matchesClient;
      }).map(b => {
        const cost = products.find(p => p.nome === b.servicoExtraNome)?.precoCusto || 0;
        const profit = (b.valor || 0) - cost;

        return {
          ...b,
          type: 'BANHO_HISTORICO',
          numeroVenda: '---',
          bathValue: b.valor || 0,
          productValue: 0,
          valorTotal: b.valor || 0,
          totalCost: cost,
          profit: profit,
          displayDate: b.data || b.createdAt,
          clienteNome: b.clienteNome || 'Cliente'
        };
      });

      let combined = [...processedVendas, ...processedBanhos];

      // Apply Tab Filter
      if (activeTab === 'BANHOS') {
        combined = combined.filter(item => item.bathValue > 0).map(item => ({
          ...item,
          valorTotal: item.bathValue // Show only bath value in this tab
        }));
      } else if (activeTab === 'PRODUTOS') {
        combined = combined.filter(item => item.productValue > 0).map(item => ({
          ...item,
          valorTotal: item.productValue // Show only product value in this tab
        }));
      }

      return combined.sort((a, b) => {
        const dateA = safeParseDate(a.displayDate).getTime();
        const dateB = safeParseDate(b.displayDate).getTime();
        return dateB - dateA;
      });
    } catch (err) {
      console.error('Error in filteredData useMemo:', err);
      return [];
    }
  }, [vendas, historicoBanhos, products, startDate, endDate, searchNumber, searchClient, activeTab]);

  const totals = useMemo(() => {
    try {
      const res = filteredData.reduce((acc, item) => {
        acc.total += (item.valorTotal || 0);
        acc.banhos += (item.bathValue || 0);
        acc.produtos += (item.productValue || 0);
        acc.lucro += (item.profit || 0);
        return acc;
      }, { total: 0, banhos: 0, produtos: 0, lucro: 0 });

      const grouped = filteredData.reduce((acc: any, item) => {
        const date = safeParseDate(item.displayDate);
        if (isNaN(date.getTime())) return acc;
        
        const dateKey = format(date, 'yyyy-MM-dd');
        if (!acc[dateKey]) {
          acc[dateKey] = { total: 0, banhos: 0, produtos: 0, lucro: 0 };
        }
        acc[dateKey].total += (item.valorTotal || 0);
        acc[dateKey].banhos += (item.bathValue || 0);
        acc[dateKey].produtos += (item.productValue || 0);
        acc[dateKey].lucro += (item.profit || 0);
        return acc;
      }, {});

      const byDate = Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]));
      return { ...res, byDate };
    } catch (err) {
      console.error('Error in totals useMemo:', err);
      return { total: 0, banhos: 0, produtos: 0, lucro: 0, byDate: [] };
    }
  }, [filteredData]);

  const clearFilters = () => {
    setStartDate(format(new Date(), 'yyyy-MM-01'));
    setEndDate(format(new Date(), 'yyyy-MM-dd'));
    setSearchNumber('');
    setSearchClient('');
    setActiveTab('TODOS');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
        <div className="text-center">
          <p className="text-gray-600 font-bold">Carregando Relatórios...</p>
          <p className="text-gray-400 text-xs mt-1">Isso pode levar alguns segundos.</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all"
        >
          Recarregar Página
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F9FA] pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-1.5 rounded-lg">
              <TrendingUp className="text-white" size={20} />
            </div>
            <h1 className="text-lg font-bold text-gray-900">Relatório de Vendas</h1>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={clearFilters}
              className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-gray-700 font-bold text-sm transition-all"
            >
              Limpar Filtros
            </button>
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all"
            >
              <Download size={18} />
              Exportar / Imprimir
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Filters Card */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                <Calendar size={14} /> Data Inicial
              </label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                <Calendar size={14} /> Data Final
              </label>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                <Search size={14} /> Nº da Venda
              </label>
              <input 
                type="text" 
                placeholder="Ex: 5001"
                value={searchNumber}
                onChange={(e) => setSearchNumber(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                <Users size={14} /> Cliente
              </label>
              <input 
                type="text" 
                placeholder="Nome do cliente..."
                value={searchClient}
                onChange={(e) => setSearchClient(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className={`p-6 rounded-3xl border transition-all cursor-pointer ${activeTab === 'TODOS' ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-100' : 'bg-white border-gray-100 text-gray-900 shadow-sm hover:border-emerald-200'}`}
               onClick={() => setActiveTab('TODOS')}>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-xl ${activeTab === 'TODOS' ? 'bg-white/20' : 'bg-emerald-50'}`}>
                <DollarSign className={activeTab === 'TODOS' ? 'text-white' : 'text-emerald-600'} size={24} />
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider ${activeTab === 'TODOS' ? 'text-white/70' : 'text-gray-400'}`}>Todas as Entradas</span>
            </div>
            <div className="text-2xl font-black">R$ {totals.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            <div className={`text-xs mt-1 ${activeTab === 'TODOS' ? 'text-white/70' : 'text-gray-500'}`}>{filteredData.length} registros encontrados</div>
          </div>

          <div className={`p-6 rounded-3xl border transition-all cursor-pointer ${activeTab === 'BANHOS' ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-100' : 'bg-white border-gray-100 text-gray-900 shadow-sm hover:border-amber-200'}`}
               onClick={() => setActiveTab('BANHOS')}>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-xl ${activeTab === 'BANHOS' ? 'bg-white/20' : 'bg-amber-50'}`}>
                <Dog className={activeTab === 'BANHOS' ? 'text-white' : 'text-amber-600'} size={24} />
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider ${activeTab === 'BANHOS' ? 'text-white/70' : 'text-gray-400'}`}>Somente Banhos</span>
            </div>
            <div className="text-2xl font-black">R$ {totals.banhos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            <div className={`text-xs mt-1 ${activeTab === 'BANHOS' ? 'text-white/70' : 'text-gray-500'}`}>Total em serviços de banho</div>
          </div>

          <div className={`p-6 rounded-3xl border transition-all cursor-pointer ${activeTab === 'PRODUTOS' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white border-gray-100 text-gray-900 shadow-sm hover:border-indigo-200'}`}
               onClick={() => setActiveTab('PRODUTOS')}>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-xl ${activeTab === 'PRODUTOS' ? 'bg-white/20' : 'bg-indigo-50'}`}>
                <Package className={activeTab === 'PRODUTOS' ? 'text-white' : 'text-indigo-600'} size={24} />
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider ${activeTab === 'PRODUTOS' ? 'text-white/70' : 'text-gray-400'}`}>Somente Produtos</span>
            </div>
            <div className="text-2xl font-black">R$ {totals.produtos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            <div className={`text-xs mt-1 ${activeTab === 'PRODUTOS' ? 'text-white/70' : 'text-gray-500'}`}>Total em venda de produtos</div>
          </div>

          <div className="p-6 rounded-3xl border bg-emerald-50 border-emerald-100 text-emerald-900 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-xl bg-emerald-100">
                <TrendingUp className="text-emerald-600" size={24} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Lucro Estimado</span>
            </div>
            <div className="text-2xl font-black text-emerald-700">R$ {totals.lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            <div className="text-xs mt-1 text-emerald-600/70">Lucro total no período</div>
          </div>
        </div>

        {/* Daily Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 no-print">
          {totals.byDate.slice(0, 4).map(([date, data]: [string, any]) => (
            <div key={date} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                {format(parseISO(date), 'dd/MM/yyyy')}
              </div>
              <div className="text-lg font-black text-gray-900">
                R$ {data.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="flex gap-2 mt-1">
                <span className="text-[9px] font-bold text-amber-600">B: R$ {data.banhos.toFixed(0)}</span>
                <span className="text-[9px] font-bold text-indigo-600">P: R$ {data.produtos.toFixed(0)}</span>
              </div>
            </div>
          ))}
          {totals.byDate.length > 4 && (
            <div className="bg-gray-50 p-4 rounded-2xl border border-dashed border-gray-200 flex items-center justify-center text-xs text-gray-400 font-medium">
              + {totals.byDate.length - 4} dias no período
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-500">Data</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-500">Nº Venda</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-500">Cliente</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-500">Tipo</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-500 text-right">Valor</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-emerald-600 text-right">Lucro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredData.length > 0 ? (
                  filteredData.map((item, idx) => (
                    <tr key={`${item.type}-${item.id}-${idx}`} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {format(safeParseDate(item.displayDate), 'dd/MM/yyyy')}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {format(safeParseDate(item.displayDate), 'HH:mm')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono font-bold text-gray-600">
                          {item.numeroVenda}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-900">{item.clienteNome}</div>
                        {item.type === 'VENDA' && (
                          <div className="text-[10px] text-gray-400 uppercase tracking-wider">
                            {item.formaPagamento} • {item.tipoVenda}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1">
                          {item.bathValue > 0 && (
                            <span className="bg-amber-50 text-amber-600 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">Banho</span>
                          )}
                          {item.productValue > 0 && (
                            <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">Produto</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-sm font-black text-gray-900">
                          R$ {item.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-sm font-bold text-emerald-600">
                          R$ {item.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      Nenhum registro encontrado para o período selecionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {hasMore && filteredData.length > 0 && (
            <div className="p-6 border-t border-gray-50 flex justify-center">
              <button
                onClick={() => fetchData(true, lastVendaDoc, lastBanhoDoc)}
                disabled={loadingMore}
                className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-8 py-3 rounded-2xl font-bold hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Carregando...
                  </>
                ) : (
                  'Carregar Mais'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
