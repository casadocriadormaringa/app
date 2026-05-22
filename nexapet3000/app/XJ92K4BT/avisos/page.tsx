'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { Navbar } from '@/components/Navbar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { 
  Bell, 
  Users, 
  FileText, 
  Syringe, 
  Bug,
  ChevronRight,
  AlertCircle,
  Calendar,
  Phone,
  Search,
  Clock,
  History,
  CreditCard,
  CheckCircle
} from 'lucide-react';
import { format, isBefore, parseISO, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { OrderHistoryModal } from '@/components/OrderHistoryModal';
import { CustomerData } from '@/components/CustomerForm';

interface Pet {
  id: string;
  nome: string;
  raca: string;
  vacinas?: { nome: string; data: string; proxima_dose: string }[];
  vermifugos?: { nome: string; data: string; proxima_dose: string }[];
}

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  data_vencimento?: string;
  pets?: Pet[];
}

interface Pedido {
  id: string;
  cliente_nome: string;
  telefone_cliente: string;
  valor_total: number;
  status_pagamento: string;
  data_cobranca: string;
}

interface AvisoItem {
  id: string;
  tipo: 'CLIENTE_VENCIDO' | 'COBRANCA_PENDENTE' | 'HISTORICO_PENDENTE' | 'VACINA_VENCIDA' | 'VERMIFUGO_VENCIDO' | 'VENDA_A_PRAZO_VENCIDA' | 'VENDA_A_PRAZO_A_VENCER';
  titulo: string;
  subtitulo: string;
  data: string;
  valor?: number;
  contato: string;
  entidadeId: string;
  clienteId?: string;
  petId?: string;
  itemIndex?: number;
}

export default function AvisosPage() {
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'TODOS' | 'CLIENTES' | 'COBRANCAS' | 'HISTORICO' | 'PETS' | 'PRAZO' | 'VENCIDOS' | 'A_VENCER'>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [clientesAvisos, setClientesAvisos] = useState<AvisoItem[]>([]);
  const [pedidosAvisos, setPedidosAvisos] = useState<AvisoItem[]>([]);
  const [historyRawData, setHistoryRawData] = useState<any[]>([]);
  const [customersMap, setCustomersMap] = useState<Record<string, CustomerData>>({});
  const [historyCustomer, setHistoryCustomer] = useState<CustomerData | null>(null);

  useEffect(() => {
    const today = startOfDay(new Date());

    // 1. Listen to Clientes
    const unsubClientes = onSnapshot(collection(db, 'clientes'), (snapshot) => {
      const newAvisos: AvisoItem[] = [];
      const newMap: Record<string, CustomerData> = {};
      
      snapshot.docs.forEach(doc => {
        const data = doc.data() as any;
        const clienteId = doc.id;
        const customerData: CustomerData = { id: clienteId, ...data };
        newMap[clienteId] = customerData;

        if (data.data_vencimento) {
          try {
            const vencimento = startOfDay(parseISO(data.data_vencimento));
            if (isBefore(vencimento, today)) {
              newAvisos.push({
                id: `venc-${clienteId}`,
                tipo: 'CLIENTE_VENCIDO',
                titulo: `Pacote Vencido: ${data.nome}`,
                subtitulo: `Vencimento em ${format(vencimento, 'dd/MM/yyyy', { locale: ptBR })}`,
                data: data.data_vencimento,
                contato: data.telefone,
                entidadeId: clienteId,
                clienteId: clienteId
              });
            }
          } catch (e) {}
        }

        if (data.pets && Array.isArray(data.pets)) {
          data.pets.forEach(pet => {
            if (pet.vacinas && Array.isArray(pet.vacinas)) {
              pet.vacinas.forEach((v, idx) => {
                if (v.proxima_dose && !v.concluido) {
                  try {
                    const proxima = startOfDay(parseISO(v.proxima_dose));
                    if (isBefore(proxima, today)) {
                      newAvisos.push({
                        id: `vac-${clienteId}-${pet.id}-${idx}`,
                        tipo: 'VACINA_VENCIDA',
                        titulo: `Vacina Vencida: ${pet.nome} (${data.nome})`,
                        subtitulo: `${v.nome} - Próxima dose era em ${format(proxima, 'dd/MM/yyyy', { locale: ptBR })}`,
                        data: v.proxima_dose,
                        contato: data.telefone,
                        entidadeId: clienteId,
                        clienteId: clienteId,
                        petId: pet.id,
                        itemIndex: idx
                      });
                    }
                  } catch (e) {}
                }
              });
            }
            if (pet.vermifugos && Array.isArray(pet.vermifugos)) {
              pet.vermifugos.forEach((v, idx) => {
                if (v.proxima_dose && !v.concluido) {
                  try {
                    const proxima = startOfDay(parseISO(v.proxima_dose));
                    if (isBefore(proxima, today)) {
                      newAvisos.push({
                        id: `ver-${clienteId}-${pet.id}-${idx}`,
                        tipo: 'VERMIFUGO_VENCIDO',
                        titulo: `Vermífugo Vencido: ${pet.nome} (${data.nome})`,
                        subtitulo: `${v.nome} - Próxima dose era em ${format(proxima, 'dd/MM/yyyy', { locale: ptBR })}`,
                        data: v.proxima_dose,
                        contato: data.telefone,
                        entidadeId: clienteId,
                        clienteId: clienteId,
                        petId: pet.id,
                        itemIndex: idx
                      });
                    }
                  } catch (e) {}
                }
              });
            }
          });
        }
      });

      setCustomersMap(newMap);
      setClientesAvisos(newAvisos);
      setLoading(false);
    });

    // 2. Listen to Pedidos
    const unsubPedidos = onSnapshot(collection(db, 'pedidos'), (snapshot) => {
      const newAvisos: AvisoItem[] = snapshot.docs
        .map(doc => {
          const data = doc.data() as Pedido;
          const status = (data.status_pagamento || '').toLowerCase();
          if (status !== 'pendente') return null;
          
          return {
            id: `ped-${doc.id}`,
            tipo: 'COBRANCA_PENDENTE',
            titulo: `Cobrança Pendente: ${data.cliente_nome}`,
            subtitulo: `Valor: R$ ${Number(data.valor_total || 0).toFixed(2)} - Data: ${data.data_cobranca || 'Sem data'}`,
            data: data.data_cobranca || data.createdAt || '',
            valor: Number(data.valor_total || 0),
            contato: data.telefone_cliente,
            entidadeId: doc.id,
            clienteId: data.cliente_id
          };
        })
        .filter(Boolean) as AvisoItem[];
      setPedidosAvisos(newAvisos);
    });

    // 3. Listen to Historico Banhos
    const unsubHistory = onSnapshot(collection(db, 'historico_banhos'), (snapshot) => {
      setHistoryRawData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubClientes();
      unsubPedidos();
      unsubHistory();
    };
  }, []);

  const vendasAvisos = useMemo(() => {
    const today = startOfDay(new Date());
    const groups: Record<string, {
      clienteId: string;
      clienteNome: string;
      clienteTelefone: string;
      vendas: any[];
      totalVencido: number;
      dataMaisAntiga: string;
    }> = {};

    historyRawData.forEach(data => {
      if (data.pago === true || data.status === 'Cancelado') return;
      
      const vencimentoStr = data.dataVencimento;
      if (!vencimentoStr) return;

      try {
        const vencimento = startOfDay(parseISO(vencimentoStr));
        if (isBefore(vencimento, today)) {
          const clienteId = data.clienteId;
          if (!clienteId) return;

          if (!groups[clienteId]) {
            const clienteInfo = customersMap[clienteId];
            groups[clienteId] = {
              clienteId,
              clienteNome: data.clienteNome || clienteInfo?.nome || 'Sem Nome',
              clienteTelefone: data.telefone || clienteInfo?.telefone || '',
              vendas: [],
              totalVencido: 0,
              dataMaisAntiga: '9999-99-99'
            };
          }

          const valor = Number(data.valor || 0);
          groups[clienteId].totalVencido += valor;
          groups[clienteId].vendas.push(data);
          
          if (vencimentoStr < groups[clienteId].dataMaisAntiga) {
            groups[clienteId].dataMaisAntiga = vencimentoStr;
          }
        }
      } catch (e) {}
    });

    return Object.values(groups).map(group => ({
      id: `venda-group-${group.clienteId}`,
      tipo: 'VENDA_A_PRAZO_VENCIDA',
      titulo: `Vendas Vencidas: ${group.clienteNome}`,
      subtitulo: `${group.vendas.length} venda(s) - Total Vencido: R$ ${group.totalVencido.toFixed(2)}`,
      data: group.dataMaisAntiga,
      valor: group.totalVencido,
      contato: group.clienteTelefone,
      entidadeId: group.clienteId,
      clienteId: group.clienteId
    })) as AvisoItem[];
  }, [historyRawData, customersMap]);

  const historyAvisos = useMemo(() => {
    const today = startOfDay(new Date());
    return historyRawData
      .map(data => {
        if (data.pago === true || data.status === 'Cancelado') return null;
        
        // Se for uma venda a prazo vencida, ela será tratada pelo vendasAvisos (agrupada)
        if (data.dataVencimento) {
          try {
            const vencimento = startOfDay(parseISO(data.dataVencimento));
            if (isBefore(vencimento, today)) return null;
          } catch (e) {}
        }

        const clienteId = data.clienteId;
        const clienteInfo = customersMap[clienteId];

        return {
          id: `hist-${data.id}`,
          tipo: 'HISTORICO_PENDENTE',
          titulo: `Pendente (Histórico): ${data.clienteNome || clienteInfo?.nome || 'Sem Nome'}`,
          subtitulo: `${data.tipo_pacote || 'Serviço'} - Valor: R$ ${Number(data.valor || 0).toFixed(2)} - Data: ${data.data || 'Sem data'}`,
          data: data.data || data.createdAt || '',
          valor: Number(data.valor || 0),
          contato: data.telefone || clienteInfo?.telefone || '',
          entidadeId: data.id,
          clienteId: data.clienteId
        } as AvisoItem;
      })
      .filter(Boolean) as AvisoItem[];
  }, [historyRawData, customersMap]);

  const allAvisos = useMemo(() => {
    return [...clientesAvisos, ...pedidosAvisos, ...historyAvisos, ...vendasAvisos].sort((a, b) => b.data.localeCompare(a.data));
  }, [clientesAvisos, pedidosAvisos, historyAvisos, vendasAvisos]);

  const filteredAvisos = useMemo(() => {
    return allAvisos.filter(aviso => {
      const matchesSearch = 
        aviso.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || 
        aviso.entidadeId.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (filter === 'TODOS') return true;
      if (filter === 'CLIENTES') return aviso.tipo === 'CLIENTE_VENCIDO';
      if (filter === 'COBRANCAS') return aviso.tipo === 'COBRANCA_PENDENTE';
      if (filter === 'HISTORICO') return aviso.tipo === 'HISTORICO_PENDENTE';
      if (filter === 'PETS') return aviso.tipo === 'VACINA_VENCIDA' || aviso.tipo === 'VERMIFUGO_VENCIDO';
      if (filter === 'PRAZO') return aviso.tipo === 'VENDA_A_PRAZO_VENCIDA';
      return true;
    });
  }, [allAvisos, filter, searchTerm]);

  const handleComplete = async (aviso: AvisoItem) => {
    if (!aviso.clienteId || !aviso.petId || aviso.itemIndex === undefined) return;

    try {
      const clienteRef = doc(db, 'clientes', aviso.clienteId);
      const clienteData = customersMap[aviso.clienteId];
      if (!clienteData || !clienteData.pets) return;

      const updatedPets = clienteData.pets.map(pet => {
        if (pet.id === aviso.petId) {
          const updatedVacinas = [...(pet.vacinas || [])];
          const updatedVermifugos = [...(pet.vermifugos || [])];

          if (aviso.tipo === 'VACINA_VENCIDA') {
            updatedVacinas[aviso.itemIndex!] = {
              ...updatedVacinas[aviso.itemIndex!],
              concluido: true,
              data_conclusao: new Date().toISOString()
            };
          } else if (aviso.tipo === 'VERMIFUGO_VENCIDO') {
            updatedVermifugos[aviso.itemIndex!] = {
              ...updatedVermifugos[aviso.itemIndex!],
              concluido: true,
              data_conclusao: new Date().toISOString()
            };
          }

          return {
            ...pet,
            vacinas: updatedVacinas,
            vermifugos: updatedVermifugos
          };
        }
        return pet;
      });

      await updateDoc(clienteRef, {
        pets: updatedPets
      });
    } catch (error) {
      console.error('Erro ao concluir aviso:', error);
    }
  };

  const getIcon = (tipo: AvisoItem['tipo']) => {
    switch (tipo) {
      case 'CLIENTE_VENCIDO': return <Users className="text-rose-600" size={20} />;
      case 'COBRANCA_PENDENTE': return <FileText className="text-amber-600" size={20} />;
      case 'HISTORICO_PENDENTE': return <Clock className="text-purple-600" size={20} />;
      case 'VACINA_VENCIDA': return <Syringe className="text-indigo-600" size={20} />;
      case 'VERMIFUGO_VENCIDO': return <Bug className="text-emerald-600" size={20} />;
      case 'VENDA_A_PRAZO_VENCIDA': return <AlertCircle className="text-rose-600" size={20} />;
      case 'VENDA_A_PRAZO_A_VENCER': return <CreditCard className="text-blue-600" size={20} />;
    }
  };

  const getBadgeColor = (tipo: AvisoItem['tipo']) => {
    switch (tipo) {
      case 'CLIENTE_VENCIDO': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'COBRANCA_PENDENTE': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'HISTORICO_PENDENTE': return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'VACINA_VENCIDA': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case 'VERMIFUGO_VENCIDO': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'VENDA_A_PRAZO_VENCIDA': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'VENDA_A_PRAZO_A_VENCER': return 'bg-blue-50 text-blue-700 border-blue-100';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ErrorBoundary>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                <Bell className="text-rose-600" size={32} />
                Avisos e Pendências
              </h1>
              <p className="text-gray-500 font-medium mt-1">
                Acompanhe vencimentos de pacotes, vacinas, vermífugos e cobranças.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap gap-2">
              <div className="relative mr-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text"
                  placeholder="Buscar por nome ou código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-rose-500 outline-none text-sm w-full sm:w-64 transition-all"
                />
              </div>
              {(['TODOS', 'CLIENTES', 'COBRANCAS', 'HISTORICO', 'PETS', 'PRAZO'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-xl font-bold transition-all text-sm ${
                    filter === f 
                      ? 'bg-gray-900 text-white shadow-lg' 
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {f === 'TODOS' ? 'Todos' : 
                   f === 'CLIENTES' ? 'Clientes' : 
                   f === 'COBRANCAS' ? 'Cobranças' : 
                   f === 'HISTORICO' ? 'Histórico' : 
                   f === 'PETS' ? 'Pets' : 'A Prazo'}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="p-20 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600 mx-auto mb-4"></div>
                <p className="text-gray-500 font-bold">Carregando avisos...</p>
              </div>
            ) : filteredAvisos.length === 0 ? (
              <div className="p-20 text-center">
                <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Bell className="text-gray-300" size={40} />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">Tudo em dia!</h3>
                <p className="text-gray-500 font-medium max-w-xs mx-auto">
                  Não há avisos ou pendências no momento para os filtros selecionados.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredAvisos.map((aviso) => (
                  <div 
                    key={aviso.id}
                    className="p-4 sm:p-6 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-2xl border ${getBadgeColor(aviso.tipo)}`}>
                        {getIcon(aviso.tipo)}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 leading-tight">
                          {aviso.titulo}
                        </h3>
                        <p className="text-gray-500 font-medium text-sm mt-1 flex items-center gap-2">
                          <Calendar size={14} />
                          {aviso.subtitulo}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:self-center">
                      {aviso.clienteId && customersMap[aviso.clienteId] && (
                        <button 
                          onClick={() => setHistoryCustomer(customersMap[aviso.clienteId!])}
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-colors"
                        >
                          <History size={16} />
                          Histórico
                        </button>
                      )}
                      {(aviso.tipo === 'VACINA_VENCIDA' || aviso.tipo === 'VERMIFUGO_VENCIDO') && (
                        <button 
                          onClick={() => handleComplete(aviso)}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-sm hover:bg-emerald-100 transition-colors"
                          title="Marcar como Concluído"
                        >
                          <CheckCircle size={16} />
                          Concluir
                        </button>
                      )}
                      {aviso.contato && (
                        <a 
                          href={`https://wa.me/55${aviso.contato.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-sm hover:bg-emerald-100 transition-colors"
                        >
                          <Phone size={16} />
                          WhatsApp
                        </a>
                      )}
                      <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100">
              <div className="flex items-center gap-2 text-rose-700 font-black mb-1">
                <Users size={18} />
                <span>Clientes</span>
              </div>
              <p className="text-2xl font-black text-rose-900">
                {allAvisos.filter(a => a.tipo === 'CLIENTE_VENCIDO').length}
              </p>
              <p className="text-xs text-rose-600 font-bold uppercase mt-1">Pacotes Vencidos</p>
            </div>

            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
              <div className="flex items-center gap-2 text-amber-700 font-black mb-1">
                <FileText size={18} />
                <span>Cobranças</span>
              </div>
              <p className="text-2xl font-black text-amber-900">
                {allAvisos.filter(a => a.tipo === 'COBRANCA_PENDENTE').length}
              </p>
              <p className="text-xs text-amber-600 font-bold uppercase mt-1">Pendentes</p>
            </div>

            <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100">
              <div className="flex items-center gap-2 text-purple-700 font-black mb-1">
                <Clock size={18} />
                <span>Histórico</span>
              </div>
              <p className="text-2xl font-black text-purple-900">
                {allAvisos.filter(a => a.tipo === 'HISTORICO_PENDENTE').length}
              </p>
              <p className="text-xs text-purple-600 font-bold uppercase mt-1">Pendentes</p>
            </div>

            <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
              <div className="flex items-center gap-2 text-indigo-700 font-black mb-1">
                <Syringe size={18} />
                <span>Vacinas</span>
              </div>
              <p className="text-2xl font-black text-indigo-900">
                {allAvisos.filter(a => a.tipo === 'VACINA_VENCIDA').length}
              </p>
              <p className="text-xs text-indigo-600 font-bold uppercase mt-1">Vencidas</p>
            </div>

            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
              <div className="flex items-center gap-2 text-emerald-700 font-black mb-1">
                <Bug size={18} />
                <span>Vermífugos</span>
              </div>
              <p className="text-2xl font-black text-emerald-900">
                {allAvisos.filter(a => a.tipo === 'VERMIFUGO_VENCIDO').length}
              </p>
              <p className="text-xs text-emerald-600 font-bold uppercase mt-1">Vencidos</p>
            </div>

            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
              <div className="flex items-center gap-2 text-blue-700 font-black mb-1">
                <CreditCard size={18} />
                <span>A Prazo</span>
              </div>
              <p className="text-2xl font-black text-blue-900">
                {allAvisos.filter(a => a.tipo === 'VENDA_A_PRAZO_VENCIDA').length}
              </p>
              <p className="text-xs text-blue-600 font-bold uppercase mt-1">Vencidas</p>
            </div>
          </div>

          {historyCustomer && (
            <OrderHistoryModal 
              customer={historyCustomer} 
              onClose={() => setHistoryCustomer(null)} 
            />
          )}
        </ErrorBoundary>
      </main>
    </div>
  );
}
