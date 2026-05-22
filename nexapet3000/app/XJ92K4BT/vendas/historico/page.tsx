'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  deleteDoc, 
  doc,
  where,
  getDocs,
  limit,
  startAfter,
  updateDoc,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import { db } from '@/firebase';
import { Navbar } from '@/components/Navbar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useApp } from '@/components/AppContext';
import { 
  Search, 
  Calendar as CalendarIcon, 
  FileText, 
  Trash2, 
  Eye, 
  Printer, 
  ChevronLeft,
  Loader2,
  X,
  CreditCard,
  DollarSign,
  Clock,
  User,
  Package,
  CheckCircle2,
  Filter
} from 'lucide-react';
import { format, parseISO, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { Toast, ToastType } from '@/components/Toast';
import { ConfirmModal } from '@/components/ConfirmModal';

interface SaleItem {
  id: string;
  nome: string;
  precoVenda: number;
  quantidade: number;
  unidade: string;
  subtotal: number;
}

interface Sale {
  id: string;
  numeroVenda: number;
  clienteNome: string;
  clienteCodigo?: string;
  clienteCodigoConsulta?: string;
  valorTotal: number;
  formaPagamento: string;
  statusPagamento: string;
  createdAt: string;
  itens: SaleItem[];
  clienteTelefone?: string;
  clienteEndereco?: string;
  checked?: boolean;
}

export default function HistoricoVendasPage() {
  const { companyConfig } = useApp();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showOnlyCredit, setShowOnlyCredit] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const fetchSales = useCallback(async (isNextPage = false, currentLastDoc: QueryDocumentSnapshot<DocumentData> | null = null) => {
    if (isNextPage) setLoadingMore(true);
    else setLoading(true);

    try {
      let q = query(
        collection(db, 'vendas'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );

      if (dateFilter) {
        // Filter by date range (start of day to end of day)
        const start = startOfDay(parseISO(dateFilter)).toISOString();
        const end = endOfDay(parseISO(dateFilter)).toISOString();
        q = query(
          collection(db, 'vendas'),
          where('createdAt', '>=', start),
          where('createdAt', '<=', end),
          orderBy('createdAt', 'desc'),
          limit(20)
        );
      }

      if (isNextPage && currentLastDoc) {
        q = query(q, startAfter(currentLastDoc));
      }

      const snapshot = await getDocs(q);
      const salesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Sale[];

      if (isNextPage) {
        setSales(prev => [...prev, ...salesData]);
      } else {
        setSales(salesData);
      }

      const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
      setLastDoc(newLastDoc);
      setHasMore(snapshot.docs.length === 20);
    } catch (error) {
      console.error('Error fetching sales:', error);
      setToast({ message: 'Erro ao carregar vendas.', type: 'error' });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [dateFilter]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const filteredSales = useMemo(() => {
    let result = sales;

    if (showOnlyCredit) {
      result = result.filter(sale => sale.formaPagamento === 'A_PRAZO');
    }

    if (!searchTerm) return result;
    
    return result.filter(sale => {
      const matchesSearch = 
        sale.clienteNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.numeroVenda.toString().includes(searchTerm) ||
        (sale.clienteCodigo && sale.clienteCodigo.includes(searchTerm)) ||
        (sale.clienteCodigoConsulta && sale.clienteCodigoConsulta.includes(searchTerm));
      
      return matchesSearch;
    });
  }, [sales, searchTerm, showOnlyCredit]);

  const toggleCheck = async (saleId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'vendas', saleId), {
        checked: !currentStatus
      });
      setSales(prev => prev.map(s => s.id === saleId ? { ...s, checked: !currentStatus } : s));
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      setToast({ message: 'Erro ao atualizar status.', type: 'error' });
    }
  };

  const handleDeleteSale = async () => {
    if (!saleToDelete) return;
    try {
      await deleteDoc(doc(db, 'vendas', saleToDelete));
      setToast({ message: 'Venda excluída com sucesso!', type: 'success' });
    } catch (error) {
      console.error('Erro ao excluir venda:', error);
      setToast({ message: 'Erro ao excluir venda.', type: 'error' });
    } finally {
      setIsDeleteModalOpen(false);
      setSaleToDelete(null);
    }
  };

  const printReceipt = (sale: Sale) => {
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (!printWindow) return;

    const header = companyConfig ? `
      <div style="text-align: center; margin-bottom: 10px;">
        <div style="font-weight: 900; font-size: 16px; text-transform: uppercase;">${companyConfig.nomeEmpresa || 'NEXAPET'}</div>
        <div style="font-size: 10px;">${companyConfig.enderecoRua || ''}, ${companyConfig.enderecoNumero || ''}</div>
        <div style="font-size: 10px;">${companyConfig.enderecoBairro || ''} - ${companyConfig.enderecoCidade || ''}/${companyConfig.enderecoEstado || ''}</div>
        <div style="font-size: 10px;">Tel: ${companyConfig.telefoneEmpresa || ''}</div>
      </div>
    ` : '';

    const itemsHtml = sale.itens.map(item => `
      <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px;">
        <div style="flex: 1;">${item.quantidade}x ${item.nome}</div>
        <div style="text-align: right; width: 60px;">R$ ${item.subtotal.toFixed(2)}</div>
      </div>
    `).join('');

    const content = `
      <html>
        <head>
          <title>Cupom de Venda #${sale.numeroVenda}</title>
          <style>
            @page { margin: 0; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              width: 58mm; 
              padding: 5mm; 
              margin: 0;
              color: #000;
            }
            .divider { border-top: 1px dashed #000; margin: 5px 0; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .mt-2 { margin-top: 8px; }
            .footer { font-size: 8px; margin-top: 15px; text-align: center; color: #666; }
          </style>
        </head>
        <body>
          ${header}
          <div class="divider"></div>
          <div class="text-center font-bold" style="font-size: 12px;">VENDA Nº ${sale.numeroVenda}</div>
          <div class="text-center" style="font-size: 10px;">Data: ${format(parseISO(sale.createdAt), 'dd/MM/yyyy HH:mm')}</div>
          <div class="divider"></div>
          <div style="font-size: 10px; font-weight: bold; margin-bottom: 5px;">ITENS:</div>
          ${itemsHtml}
          <div class="divider"></div>
          <div class="flex justify-between font-bold" style="font-size: 12px;">
            <div>TOTAL:</div>
            <div>R$ ${sale.valorTotal.toFixed(2)}</div>
          </div>
          <div class="flex justify-between" style="font-size: 10px; margin-top: 4px;">
            <div>PAGAMENTO:</div>
            <div>${sale.formaPagamento}</div>
          </div>
          <div class="divider"></div>
          <div class="text-center font-bold" style="font-size: 10px; margin-top: 5px;">CUPOM NÃO FISCAL</div>
          <div class="footer">
            Nexapet - o melhor amigo do seu negocio.
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

    printWindow.document.write(content);
    printWindow.document.close();
  };

  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-[#F8F9FA] pb-20">
        <Navbar />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <Link 
                href="/XJ92K4BT/vendas"
                className="inline-flex items-center gap-2 text-indigo-600 font-bold hover:text-indigo-700 transition-colors mb-2"
              >
                <ChevronLeft size={20} />
                Voltar para Vendas
              </Link>
              <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Histórico de Vendas</h1>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Search size={14} />
                  Buscar Venda
                </label>
                <input
                  type="text"
                  placeholder="Nome, código ou nº venda..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <CalendarIcon size={14} />
                  Filtrar por Data
                </label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                />
              </div>
              <div className="flex items-end gap-2">
                <button 
                  onClick={() => setShowOnlyCredit(!showOnlyCredit)}
                  className={`flex-1 md:flex-none px-6 py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 border-2 ${
                    showOnlyCredit 
                      ? 'bg-amber-50 border-amber-500 text-amber-600' 
                      : 'bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <Filter size={18} />
                  {showOnlyCredit ? 'Ver Todas' : 'A Prazo'}
                </button>
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setDateFilter('');
                    setShowOnlyCredit(false);
                  }}
                  className="px-6 py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all flex-1 md:flex-none"
                >
                  Limpar
                </button>
              </div>
            </div>
          </div>

          {/* Sales List */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-indigo-600" size={48} />
                <p className="text-gray-500 font-bold">Carregando histórico...</p>
              </div>
            ) : filteredSales.length === 0 ? (
              <div className="p-20 text-center">
                <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText size={40} className="text-gray-300" />
                </div>
                <p className="text-gray-500 font-bold text-lg">Nenhuma venda encontrada</p>
                <p className="text-gray-400 text-sm">Tente ajustar seus filtros de busca.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Data</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nº Venda</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Pagamento</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredSales.map((sale) => (
                      <tr 
                        key={sale.id} 
                        className={`transition-colors group ${
                          sale.checked ? 'bg-emerald-50/50 hover:bg-emerald-100/50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-gray-900">{format(parseISO(sale.createdAt), 'dd/MM/yyyy')}</p>
                          <p className="text-[10px] text-gray-400 font-medium">{format(parseISO(sale.createdAt), 'HH:mm')}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-black">
                            #{sale.numeroVenda}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-gray-900">{sale.clienteNome}</p>
                          {sale.clienteCodigo && (
                            <p className="text-[10px] text-gray-400 font-medium">Cód: {sale.clienteCodigo}</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {sale.formaPagamento === 'DINHEIRO' ? <DollarSign size={14} className="text-emerald-500" /> : <CreditCard size={14} className="text-blue-500" />}
                            <span className="text-xs font-bold text-gray-700 uppercase">{sale.formaPagamento}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-black text-gray-900">R$ {sale.valorTotal.toFixed(2)}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => toggleCheck(sale.id, !!sale.checked)}
                              className={`p-2 rounded-xl transition-all ${
                                sale.checked 
                                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' 
                                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                              }`}
                              title={sale.checked ? "Desmarcar" : "Marcar como Conferido"}
                            >
                              <CheckCircle2 size={18} />
                            </button>
                            <button 
                              onClick={() => {
                                setSelectedSale(sale);
                                setIsDetailsModalOpen(true);
                              }}
                              className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all"
                              title="Ver Detalhes"
                            >
                              <Eye size={18} />
                            </button>
                            <button 
                              onClick={() => printReceipt(sale)}
                              className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all"
                              title="Imprimir Cupom"
                            >
                              <Printer size={18} />
                            </button>
                            <button 
                              onClick={() => {
                                setSaleToDelete(sale.id);
                                setIsDeleteModalOpen(true);
                              }}
                              className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-all"
                              title="Excluir Venda"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {hasMore && !loading && filteredSales.length > 0 && (
              <div className="p-6 border-t border-gray-50 flex justify-center">
                <button
                  onClick={() => fetchSales(true, lastDoc)}
                  disabled={loadingMore}
                  className="flex items-center gap-2 px-8 py-3 bg-white border-2 border-indigo-600 text-indigo-600 rounded-2xl font-black hover:bg-indigo-50 transition-all disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Carregando...
                    </>
                  ) : (
                    'Carregar Mais Vendas'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Details Modal */}
        {isDetailsModalOpen && selectedSale && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-100">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900 tracking-tighter uppercase">Detalhes da Venda #{selectedSale.numeroVenda}</h2>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Realizada em {format(parseISO(selectedSale.createdAt), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="p-2 hover:bg-white rounded-xl transition-colors text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Informações do Cliente</h3>
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <p className="text-lg font-black text-gray-900">{selectedSale.clienteNome}</p>
                      {selectedSale.clienteCodigo && <p className="text-sm text-gray-500 font-bold">Código: {selectedSale.clienteCodigo}</p>}
                      {selectedSale.clienteTelefone && <p className="text-sm text-gray-500 font-bold">Tel: {selectedSale.clienteTelefone}</p>}
                      {selectedSale.clienteEndereco && <p className="text-sm text-gray-500 mt-2 italic">{selectedSale.clienteEndereco}</p>}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Resumo do Pagamento</h3>
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500 font-bold uppercase">Forma:</span>
                        <span className="text-sm font-black text-indigo-600 uppercase">{selectedSale.formaPagamento}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500 font-bold uppercase">Status:</span>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          selectedSale.statusPagamento === 'PAGO' 
                            ? 'text-emerald-600 bg-emerald-50 border-emerald-100' 
                            : 'text-amber-600 bg-amber-50 border-amber-100'
                        }`}>
                          {selectedSale.statusPagamento}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                        <span className="text-sm text-gray-900 font-black uppercase">Total:</span>
                        <span className="text-xl font-black text-gray-900 tracking-tighter">R$ {selectedSale.valorTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Itens da Venda</h3>
                  <div className="border border-gray-100 rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase">Item</th>
                          <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase text-center">Qtd</th>
                          <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase text-right">Preço</th>
                          <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {selectedSale.itens.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-3">
                              <p className="text-sm font-bold text-gray-900">{item.nome}</p>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-sm font-bold text-gray-600">{item.quantidade}{item.unidade}</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-sm font-bold text-gray-600">R$ {item.precoVenda.toFixed(2)}</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-sm font-black text-gray-900">R$ {item.subtotal.toFixed(2)}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                <button 
                  onClick={() => printReceipt(selectedSale)}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                >
                  <Printer size={20} />
                  Imprimir Cupom
                </button>
                <button 
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="px-6 py-3 bg-white text-gray-600 border border-gray-200 rounded-2xl font-bold hover:bg-gray-50 transition-all"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onCancel={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteSale}
          title="Excluir Venda"
          message="Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita e os itens não retornarão automaticamente ao estoque."
          confirmText="Sim, Excluir"
          cancelText="Não, Cancelar"
          type="danger"
        />

        {/* Toast Notification */}
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}
      </main>
    </ErrorBoundary>
  );
}
