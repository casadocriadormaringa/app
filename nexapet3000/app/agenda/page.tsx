'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  Search, 
  X, 
  Check, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  Dog,
  User,
  Package,
  Truck
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where,
  getDocs,
  Timestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '@/firebase';
import { Navbar } from '@/components/Navbar';
import { ExpirationWrapper } from '@/components/ExpirationWrapper';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Toast, ToastType } from '@/components/Toast';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parse, addMinutes, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AgendaItem {
  id: string;
  clienteId: string;
  clienteNome: string;
  petId?: string;
  petNome?: string;
  servicoId: string;
  servicoNome: string;
  data: string;
  horario: string;
  valor: number;
  observacoes?: string;
  status: 'AGENDADO' | 'CONCLUIDO' | 'CANCELADO';
  clienteCodigoConsulta?: string;
  createdAt: string;
  deliveryId?: string;
}

interface Product {
  id: string;
  nome: string;
  precoVenda: number;
  tipo: string;
}

interface Customer {
  id: string;
  nome: string;
  codigo: string;
  telefone: string;
  endereco: string;
  codigoConsulta?: string;
  pets: any[];
}

export default function AgendaPage() {
  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-[#F8F9FA]">
        <Navbar />
        <ExpirationWrapper>
          <AgendaContent />
        </ExpirationWrapper>
      </main>
    </ErrorBoundary>
  );
}

function AgendaContent() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState<AgendaItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [companyName, setCompanyName] = useState('Casa do Criador Maringá');
  const [config, setConfig] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AgendaItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [showDeliveryConfirm, setShowDeliveryConfirm] = useState(false);
  const [lastCreatedAppointmentId, setLastCreatedAppointmentId] = useState<string | null>(null);

  // Filter states
  const [viewMode, setViewMode] = useState<'daily' | 'list'>('daily');
  const [filterStartDate, setFilterStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [filterEndDate, setFilterEndDate] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
  const [filterClient, setFilterClient] = useState('');

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type });
  };

  // Form state
  const [formData, setFormData] = useState({
    clienteId: '',
    clienteNome: '',
    petId: '',
    petNome: '',
    servicoId: '',
    servicoNome: '',
    data: format(new Date(), 'yyyy-MM-dd'),
    horario: '',
    valor: 0,
    observacoes: ''
  });

  const [showConflictWarning, setShowConflictWarning] = useState(false);

  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, 'config', 'empresa'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCompanyName(data.nomeEmpresa || 'Casa do Criador Maringá');
        setConfig(data.agendaConfig || {
          diasDisponiveis: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
          horarioInicio: '08:00',
          horarioFim: '18:00',
          intervaloMinutos: 60,
          permitirConflito: false
        });
      }
    });

    const unsubProducts = onSnapshot(collection(db, 'produtos'), (snapshot) => {
      const prods = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Product))
        .filter(p => p.tipo === 'SERVICO');
      setProducts(prods);
    });

    const unsubCustomers = onSnapshot(collection(db, 'clientes'), (snapshot) => {
      const custs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      setCustomers(custs);
    });

    const unsubAgenda = onSnapshot(collection(db, 'agenda'), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AgendaItem));
      setAppointments(items);
      setLoading(false);
    });

    return () => {
      unsubConfig();
      unsubProducts();
      unsubCustomers();
      unsubAgenda();
    };
  }, []);

  const generateTimeSlots = () => {
    if (!config) return [];
    const slots = [];
    let current = parse(config.horarioInicio, 'HH:mm', new Date());
    const end = parse(config.horarioFim, 'HH:mm', new Date());

    while (isBefore(current, end) || format(current, 'HH:mm') === config.horarioFim) {
      slots.push(format(current, 'HH:mm'));
      current = addMinutes(current, config.intervaloMinutos);
    }
    return slots;
  };

  const sendWhatsAppConfirmation = (customer: Customer, petNome: string, data: string, horario: string) => {
    if (!customer.telefone) {
      showToast('Cliente sem telefone cadastrado', 'error');
      return;
    }

    const formattedDate = format(parse(data, 'yyyy-MM-dd', new Date()), "dd/MM/yyyy");
    const message = `🟢🗓️ Olá, (${customer.codigo}) *${customer.nome}*, o Banho do seu Pet - *${petNome}* 🐕 foi Agendado para *${formattedDate} às ${horario}*, aqui na *${companyName}* 😍 - Para mantermos a pontualidade dos nossos serviços, por gentileza nos avisar com antecedência se ocorrer algum imprevisto. Será cobrado valor adicional se não tiver ninguém em casa, na hora da retirada ou na hora de entrega do Pet – Favor não deixar o Pet se molhar antes do banho. Combinar os detalhes, como horários, procedimentos e valores, com a pessoa que for buscar, ou nesse Whats App. ❤️ Agradecemos muito a preferência e vamos fazer nosso melhor para ter você como nosso cliente. Para dúvidas, reclamações ou sugestões, e só chamar nesse whats app.🐕🐕. Até Logo !`;
    
    const phone = customer.telefone.replace(/\D/g, '');
    const url = `https://api.whatsapp.com/send?phone=55${phone}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleSave = async (force = false) => {
    if (!formData.clienteId || !formData.servicoId || !formData.horario) {
      showToast('Preencha os campos obrigatórios', 'error');
      return;
    }

    // Check for conflicts
    const conflict = appointments.find(a => 
      a.data === formData.data && 
      a.horario === formData.horario && 
      a.status !== 'CANCELADO' &&
      a.id !== editingItem?.id
    );

    if (conflict && !config.permitirConflito && !force) {
      setShowConflictWarning(true);
      return;
    }

    try {
      const dataToSave = {
        ...formData,
        clienteCodigoConsulta: selectedCustomer?.codigoConsulta || '',
        status: editingItem ? editingItem.status : 'AGENDADO',
        createdAt: editingItem ? editingItem.createdAt : new Date().toISOString()
      };

      let savedId = editingItem?.id;

      if (editingItem) {
        await updateDoc(doc(db, 'agenda', editingItem.id), dataToSave);
        if (editingItem.deliveryId) {
          // Update linked delivery
          await updateDoc(doc(db, 'vendas', editingItem.deliveryId), {
            valorTotal: formData.valor,
            dataEntrega: formData.data,
            itens: [{
              id: formData.servicoId,
              nome: `${formData.servicoNome}${formData.petNome ? ` - ${formData.petNome}` : ''}`,
              precoOriginal: formData.valor,
              precoVenda: formData.valor,
              quantidade: 1,
              unidade: "UNIDADE",
              subtotal: formData.valor,
              tipo: "SERVICO",
              fornecedorNome: "BANHO"
            }]
          });
        }
      } else {
        const docRef = await addDoc(collection(db, 'agenda'), dataToSave);
        savedId = docRef.id;
      }

      if (selectedCustomer) {
        sendWhatsAppConfirmation(selectedCustomer, formData.petNome, formData.data, formData.horario);
      }

      showToast(editingItem ? 'Agendamento atualizado!' : 'Agendamento realizado!');
      
      if (!editingItem && savedId) {
        setLastCreatedAppointmentId(savedId);
        setShowDeliveryConfirm(true);
      }

      setIsModalOpen(false);
      setEditingItem(null);
      setShowConflictWarning(false);
      setFormData({
        clienteId: '',
        clienteNome: '',
        petId: '',
        petNome: '',
        servicoId: '',
        servicoNome: '',
        data: format(selectedDate, 'yyyy-MM-dd'),
        horario: '',
        valor: 0,
        observacoes: ''
      });
      setSearchTerm('');
    } catch (error) {
      console.error('Erro ao salvar agendamento:', error);
      showToast('Erro ao salvar agendamento', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const appToDelete = appointments.find(a => a.id === id);
      if (appToDelete?.deliveryId) {
        // Also delete the linked delivery
        await deleteDoc(doc(db, 'vendas', appToDelete.deliveryId));
      }
      await deleteDoc(doc(db, 'agenda', id));
      showToast('Agendamento excluído!');
    } catch (error) {
      console.error('Erro ao excluir agendamento:', error);
      showToast('Erro ao excluir agendamento', 'error');
    }
  };

  const createDeliveryFromAppointment = async () => {
    if (!lastCreatedAppointmentId) return;

    try {
      const appointment = appointments.find(a => a.id === lastCreatedAppointmentId);
      if (!appointment) return;

      const customer = customers.find(c => c.id === appointment.clienteId);

      // Get last sale number
      const salesSnap = await getDocs(query(collection(db, 'vendas'), orderBy('numeroVenda', 'desc'), limit(1)));
      const lastNumber = salesSnap.empty ? 4999 : salesSnap.docs[0].data().numeroVenda;
      const nextNumber = Math.max(lastNumber, 4999) + 1;

      const deliveryData = {
        numeroVenda: nextNumber,
        clienteId: appointment.clienteId,
        clienteNome: appointment.clienteNome,
        clienteCodigo: customer?.codigo || "",
        clienteCodigoConsulta: customer?.codigoConsulta || "",
        clienteTelefone: customer?.telefone || "",
        clienteEndereco: customer?.endereco || "",
        itens: [{
          id: appointment.servicoId,
          nome: `${appointment.servicoNome}${appointment.petNome ? ` - ${appointment.petNome}` : ''}`,
          precoOriginal: appointment.valor,
          precoVenda: appointment.valor,
          quantidade: 1,
          unidade: "UNIDADE",
          subtotal: appointment.valor,
          tipo: "SERVICO",
          fornecedorNome: "BANHO"
        }],
        valorTotal: appointment.valor,
        valorRecebido: 0,
        troco: 0,
        formaPagamento: "A COMBINAR",
        statusPagamento: "A_RECEBER",
        tipoVenda: "ENTREGA",
        statusVenda: "ABERTO",
        statusEntrega: "NOVO_BANHO",
        dataEntrega: appointment.data,
        createdAt: new Date().toISOString(),
        origem: "Agendamento",
        agendaId: appointment.id
      };

      const deliveryRef = await addDoc(collection(db, 'vendas'), deliveryData);
      
      // Update agenda with deliveryId
      await updateDoc(doc(db, 'agenda', appointment.id), {
        deliveryId: deliveryRef.id
      });

      showToast('Lançamento em Entregas realizado!');
      setShowDeliveryConfirm(false);
      setLastCreatedAppointmentId(null);
    } catch (error) {
      console.error('Erro ao criar entrega:', error);
      showToast('Erro ao criar entrega', 'error');
    }
  };

  const openNewModal = (horario?: string) => {
    setEditingItem(null);
    setFormData({
      clienteId: '',
      clienteNome: '',
      petId: '',
      petNome: '',
      servicoId: '',
      servicoNome: '',
      data: format(selectedDate, 'yyyy-MM-dd'),
      horario: horario || '',
      valor: 0,
      observacoes: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: AgendaItem) => {
    setEditingItem(item);
    setFormData({
      clienteId: item.clienteId,
      clienteNome: item.clienteNome,
      petId: item.petId || '',
      petNome: item.petNome || '',
      servicoId: item.servicoId,
      servicoNome: item.servicoNome,
      data: item.data,
      horario: item.horario,
      valor: item.valor,
      observacoes: item.observacoes || ''
    });
    setSearchTerm(item.clienteNome);
    setIsModalOpen(true);
  };

  const filteredCustomers = React.useMemo(() => {
    if (!searchTerm) return [];
    const term = searchTerm.toLowerCase();
    return customers.filter(c => 
      c.nome.toLowerCase().includes(term)
    ).slice(0, 5);
  }, [customers, searchTerm]);

  const timeSlots = generateTimeSlots();
  
  const filteredAppointments = useMemo(() => {
    if (viewMode === 'daily') {
      return appointments.filter(a => a.data === format(selectedDate, 'yyyy-MM-dd'));
    } else {
      return appointments.filter(a => {
        const matchesDate = a.data >= filterStartDate && a.data <= filterEndDate;
        const matchesClient = a.clienteNome.toLowerCase().includes(filterClient.toLowerCase());
        return matchesDate && matchesClient;
      }).sort((a, b) => {
        if (a.data !== b.data) return a.data.localeCompare(b.data);
        return a.horario.localeCompare(b.horario);
      });
    }
  }, [appointments, selectedDate, viewMode, filterStartDate, filterEndDate, filterClient]);

  const selectedCustomer = customers.find(c => c.id === formData.clienteId);
  const selectedService = products.find(p => p.id === formData.servicoId);
  const isBathService = selectedService?.nome.toLowerCase().includes('banho') || selectedService?.nome.toLowerCase().includes('tosa');

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
              <CalendarIcon className="text-indigo-600" size={32} />
              Agenda de Serviços
            </h1>
            <p className="text-gray-500 font-medium mt-1">Gerencie os horários e serviços da sua pet shop</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white p-1 rounded-2xl border border-gray-100 flex shadow-sm">
              <button
                onClick={() => setViewMode('daily')}
                className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${viewMode === 'daily' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Diário
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Lista / Período
              </button>
            </div>
            <button
              onClick={() => openNewModal()}
              className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
            >
              <Plus size={20} />
              Novo Agendamento
            </button>
          </div>
        </div>

        {/* Filters */}
        {viewMode === 'list' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Início</label>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none font-bold text-gray-700 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Fim</label>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none font-bold text-gray-700 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Buscar Cliente</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Nome do cliente..."
                    value={filterClient}
                    onChange={(e) => setFilterClient(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none font-bold text-gray-700 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Calendar Navigation */}
        {viewMode === 'daily' ? (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSelectedDate(addDays(selectedDate, -1))}
                className="p-2 hover:bg-gray-100 rounded-xl transition-all"
              >
                <ChevronLeft size={24} className="text-gray-600" />
              </button>
              <h2 className="text-xl font-black text-gray-900 capitalize">
                {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </h2>
              <button 
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                className="p-2 hover:bg-gray-100 rounded-xl transition-all"
              >
                <ChevronRight size={24} className="text-gray-600" />
              </button>
            </div>
            <input
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => setSelectedDate(parse(e.target.value, 'yyyy-MM-dd', new Date()))}
              className="px-4 py-2 bg-gray-50 border-none rounded-xl font-bold text-gray-600 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Time Grid */}
          <div className="space-y-4">
            {timeSlots.map(time => {
              const appsAtTime = filteredAppointments.filter(a => a.horario === time);
              const isAvailable = appsAtTime.length === 0;

              return (
                <div key={time} className="flex gap-4 group">
                  <div className="w-20 pt-2 text-right">
                    <span className="text-sm font-black text-gray-400 group-hover:text-indigo-600 transition-colors">
                      {time}
                    </span>
                  </div>
                  <div className="flex-1 min-h-[80px] relative">
                    {isAvailable ? (
                      <button
                        onClick={() => openNewModal(time)}
                        className="w-full h-full border-2 border-dashed border-gray-100 rounded-2xl flex items-center justify-center text-gray-300 hover:border-indigo-200 hover:text-indigo-300 hover:bg-indigo-50/30 transition-all group/btn"
                      >
                        <Plus size={24} className="transition-opacity" />
                      </button>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {appsAtTime.map(app => (
                          <div 
                            key={app.id}
                            onClick={() => openEditModal(app)}
                            className={`p-4 rounded-2xl border-l-4 shadow-sm cursor-pointer transition-all hover:shadow-md active:scale-[0.99] ${
                              app.status === 'CONCLUIDO' 
                                ? 'bg-emerald-50 border-emerald-500' 
                                : app.status === 'CANCELADO'
                                ? 'bg-gray-50 border-gray-300 opacity-60'
                                : 'bg-indigo-50 border-indigo-500'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-black text-gray-900">{app.clienteNome}</span>
                                  {app.petNome && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-white/50 rounded-lg text-[10px] font-black text-indigo-600 uppercase">
                                      <Dog size={10} />
                                      {app.petNome}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Package size={12} />
                                    {app.servicoNome}
                                  </span>
                                  <span className="text-indigo-600">
                                    R$ {app.valor.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleDelete(app.id); }}
                                  className="p-2 hover:bg-red-100 text-red-400 hover:text-red-600 rounded-lg transition-all"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                        {config?.permitirConflito && (
                          <button
                            onClick={() => openNewModal(time)}
                            className="w-full py-2 border-2 border-dashed border-gray-100 rounded-xl flex items-center justify-center text-gray-300 hover:border-indigo-200 hover:text-indigo-300 transition-all"
                          >
                            <Plus size={16} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
            {filteredAppointments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAppointments.map(app => (
                  <div 
                    key={app.id}
                    onClick={() => openEditModal(app)}
                    className={`p-6 rounded-[32px] border-l-8 shadow-sm cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] bg-white group ${
                      app.status === 'CONCLUIDO' 
                        ? 'border-emerald-500' 
                        : app.status === 'CANCELADO'
                        ? 'border-gray-300 opacity-60'
                        : 'border-indigo-500'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-xl text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <CalendarIcon size={12} />
                        {format(parse(app.data, 'yyyy-MM-dd', new Date()), "dd/MM/yyyy")}
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest">
                        <Clock size={12} />
                        {app.horario}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <h3 className="text-xl font-black text-gray-900 group-hover:text-indigo-600 transition-colors">{app.clienteNome}</h3>
                        {app.petNome && (
                          <div className="flex items-center gap-2 mt-1 text-indigo-500 font-bold text-sm">
                            <Dog size={16} />
                            {app.petNome}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2">
                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-xl text-xs font-bold text-gray-600">
                          <Package size={14} className="text-gray-400" />
                          {app.servicoNome}
                        </span>
                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-xl text-xs font-black text-emerald-600">
                          R$ {app.valor.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-50 flex justify-between items-center">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                        app.status === 'CONCLUIDO' ? 'bg-emerald-100 text-emerald-600' :
                        app.status === 'CANCELADO' ? 'bg-gray-100 text-gray-500' :
                        'bg-indigo-100 text-indigo-600'
                      }`}>
                        {app.status}
                      </span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(app.id); }}
                        className="p-2 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-xl transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-[40px] border-2 border-dashed border-gray-100">
                <CalendarIcon className="mx-auto text-gray-200 mb-4" size={64} />
                <p className="text-gray-400 font-bold text-lg">Nenhum agendamento encontrado no período.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Agendamento */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-indigo-50/50">
              <div>
                <h2 className="text-2xl font-black text-gray-900">
                  {editingItem ? 'Editar Agendamento' : 'Novo Agendamento'}
                </h2>
                <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest mt-1">
                  {format(parse(formData.data, 'yyyy-MM-dd', new Date()), "dd 'de' MMMM", { locale: ptBR })} às {formData.horario}
                </p>
              </div>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setSearchTerm('');
                  setShowCustomerResults(false);
                }}
                className="p-3 bg-white text-gray-400 hover:text-gray-600 rounded-2xl shadow-sm transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Cliente */}
              <div className="space-y-3 relative">
                <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400">
                  <User size={16} />
                  Cliente
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Search size={20} />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowCustomerResults(true);
                    }}
                    onFocus={() => setShowCustomerResults(true)}
                    placeholder="Pesquisar cliente..."
                    className="w-full pl-12 pr-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none text-gray-900 font-bold transition-all"
                  />
                  
                  {showCustomerResults && filteredCustomers.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      {filteredCustomers.map(c => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setFormData({ ...formData, clienteId: c.id, clienteNome: c.nome, petId: '', petNome: '' });
                            setSearchTerm(c.nome);
                            setShowCustomerResults(false);
                          }}
                          className="w-full px-6 py-4 text-left hover:bg-indigo-50 transition-colors flex items-center justify-between group"
                        >
                          <span className="font-bold text-gray-700 group-hover:text-indigo-600">{c.nome}</span>
                          <ChevronRight size={16} className="text-gray-300 group-hover:text-indigo-400" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Pet */}
              {selectedCustomer && (
                <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                  <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400">
                    <Dog size={16} />
                    Pet
                  </label>
                  <select
                    value={formData.petId}
                    onChange={(e) => {
                      const p = selectedCustomer.pets?.find(pet => pet.id === e.target.value);
                      setFormData({ ...formData, petId: e.target.value, petNome: p?.nome || '' });
                    }}
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none text-gray-900 font-bold transition-all"
                  >
                    <option value="">Selecione o pet</option>
                    {selectedCustomer.pets?.map(p => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Serviço */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400">
                  <Package size={16} />
                  Serviço
                </label>
                <select
                  value={formData.servicoId}
                  onChange={(e) => {
                    const p = products.find(prod => prod.id === e.target.value);
                    setFormData({ ...formData, servicoId: e.target.value, servicoNome: p?.nome || '', valor: p?.precoVenda || 0 });
                  }}
                  className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none text-gray-900 font-bold transition-all"
                >
                  <option value="">Selecione um serviço</option>
                  {products.sort((a, b) => a.nome.localeCompare(b.nome)).map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400">
                    <CalendarIcon size={16} />
                    Data
                  </label>
                  <input
                    type="date"
                    value={formData.data}
                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none text-gray-900 font-bold transition-all"
                  />
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400">
                    <Clock size={16} />
                    Horário
                  </label>
                  <select
                    value={formData.horario}
                    onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none text-gray-900 font-bold transition-all"
                  >
                    <option value="">Horário</option>
                    {timeSlots.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400">
                  Valor (R$)
                </label>
                <input
                  type="number"
                  value={isNaN(formData.valor) ? '' : formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) })}
                  className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none text-gray-900 font-bold transition-all"
                />
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400">
                  Observações
                </label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none text-gray-900 font-bold transition-all resize-none"
                  rows={3}
                  placeholder="Informações adicionais..."
                />
              </div>

              {editingItem && (
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400">
                    Status
                  </label>
                  <div className="flex gap-2">
                    {['AGENDADO', 'CONCLUIDO', 'CANCELADO'].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setEditingItem({ ...editingItem, status: s as any })}
                        className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${
                          editingItem.status === s 
                            ? s === 'CONCLUIDO' ? 'bg-emerald-600 text-white' : s === 'CANCELADO' ? 'bg-red-600 text-white' : 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 bg-gray-50 border-t border-gray-100 flex flex-col gap-4">
              {showConflictWarning && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                  <AlertCircle className="text-amber-600 shrink-0" size={20} />
                  <div>
                    <p className="text-sm font-bold text-amber-900">Horário já preenchido!</p>
                    <p className="text-xs text-amber-700 font-medium">Já existe um agendamento para este horário. Deseja prosseguir mesmo assim?</p>
                    <div className="flex gap-4 mt-3">
                      <button 
                        onClick={() => handleSave(true)}
                        className="text-xs font-black text-amber-900 underline uppercase tracking-widest"
                      >
                        Sim, agendar mesmo assim
                      </button>
                      <button 
                        onClick={() => setShowConflictWarning(false)}
                        className="text-xs font-black text-gray-500 uppercase tracking-widest"
                      >
                        Não, escolher outro
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-8 py-4 bg-white text-gray-500 rounded-2xl font-black border-2 border-gray-100 hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleSave()}
                  className="flex-1 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  <Check size={20} />
                  {editingItem ? 'Salvar Alterações' : 'Confirmar Agendamento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      {/* Modal Confirmação Entrega */}
      {showDeliveryConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Truck size={40} />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">Lançar em Entregas?</h3>
              <p className="text-gray-500 font-medium mb-8">
                Deseja efetuar o lançamento deste agendamento na página de entregas agendadas?
              </p>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={createDeliveryFromAppointment}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  <Check size={20} />
                  Sim, fazer lançamento
                </button>
                <button
                  onClick={() => {
                    setShowDeliveryConfirm(false);
                    setLastCreatedAppointmentId(null);
                  }}
                  className="w-full py-4 bg-gray-100 text-gray-500 rounded-2xl font-black hover:bg-gray-200 transition-all"
                >
                  Não, apenas fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
