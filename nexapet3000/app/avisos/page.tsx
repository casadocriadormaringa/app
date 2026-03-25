'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
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
  Clock
} from 'lucide-react';
import { format, isBefore, parseISO, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  tipo: 'CLIENTE_VENCIDO' | 'COBRANCA_PENDENTE' | 'HISTORICO_PENDENTE' | 'VACINA_VENCIDA' | 'VERMIFUGO_VENCIDO';
  titulo: string;
  subtitulo: string;
  data: string;
  valor?: number;
  contato: string;
  entidadeId: string;
}

export default function AvisosPage() {
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'TODOS' | 'CLIENTES' | 'COBRANCAS' | 'HISTORICO' | 'PETS'>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [clientesAvisos, setClientesAvisos] = useState<AvisoItem[]>([]);
  const [pedidosAvisos, setPedidosAvisos] = useState<AvisoItem[]>([]);
  const [historyRawData, setHistoryRawData] = useState<any[]>([]);
  const [customersMap, setCustomersMap] = useState<Record<string, { nome: string; telefone: string }>>({});

  useEffect(() => {
    const today = startOfDay(new Date());

    // 1. Listen to Clientes
    const unsubClientes = onSnapshot(collection(db, 'clientes'), (snapshot) => {
      const newAvisos: AvisoItem[] = [];
      const newMap: Record<string, { nome: string; telefone: string }> = {};
      
      snapshot.docs.forEach(doc => {
        const data = doc.data() as Cliente;
        const clienteId = doc.id;
        newMap[clienteId] = { nome: data.nome, telefone: data.telefone || '' };

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
                entidadeId: clienteId
              });
            }
          } catch (e) {}
        }

        if (data.pets && Array.isArray(data.pets)) {
          data.pets.forEach(pet => {
            if (pet.vacinas && Array.isArray(pet.vacinas)) {
              pet.vacinas.forEach((v, idx) => {
                if (v.proxima_dose) {
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
                        entidadeId: clienteId
                      });
                    }
                  } catch (e) {}
                }
              });
            }
            if (pet.vermifugos && Array.isArray(pet.vermifugos)) {
              pet.vermifugos.forEach((v, idx) => {
                if (v.proxima_dose) {
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
                        entidadeId: clienteId
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
            entidadeId: doc.id
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

  const historyAvisos = useMemo(() => {
    return historyRawData
      .map(data => {
        if (data.pago === true || data.status === 'Cancelado') return null;
        
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
          entidadeId: data.id
        } as AvisoItem;
      })
      .filter(Boolean) as AvisoItem[];
  }, [historyRawData, customersMap]);

  const allAvisos = useMemo(() => {
    return [...clientesAvisos, ...pedidosAvisos, ...historyAvisos].sort((a, b) => b.data.localeCompare(a.data));
  }, [clientesAvisos, pedidosAvisos, historyAvisos]);

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
      return true;
    });
  }, [allAvisos, filter, searchTerm]);

  const getIcon = (tipo: AvisoItem['tipo']) => {
    switch (tipo) {
      case 'CLIENTE_VENCIDO': return <Users className="text-rose-600" size={20} />;
      case 'COBRANCA_PENDENTE': return <FileText className="text-amber-600" size={20} />;
      case 'HISTORICO_PENDENTE': return <Clock className="text-purple-600" size={20} />;
      case 'VACINA_VENCIDA': return <Syringe className="text-indigo-600" size={20} />;
      case 'VERMIFUGO_VENCIDO': return <Bug className="text-emerald-600" size={20} />;
    }
  };

  const getBadgeColor = (tipo: AvisoItem['tipo']) => {
    switch (tipo) {
      case 'CLIENTE_VENCIDO': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'COBRANCA_PENDENTE': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'HISTORICO_PENDENTE': return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'VACINA_VENCIDA': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case 'VERMIFUGO_VENCIDO': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
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
              {(['TODOS', 'CLIENTES', 'COBRANCAS', 'HISTORICO', 'PETS'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-xl font-bold transition-all text-sm ${
                    filter === f 
                      ? 'bg-gray-900 text-white shadow-lg' 
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {f === 'TODOS' ? 'Todos' : f === 'CLIENTES' ? 'Clientes' : f === 'COBRANCAS' ? 'Cobranças' : f === 'HISTORICO' ? 'Histórico' : 'Pets'}
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

          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
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
          </div>
        </ErrorBoundary>
      </main>
    </div>
  );
}
