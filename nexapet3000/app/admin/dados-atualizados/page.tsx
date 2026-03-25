'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  MapPin, 
  Phone, 
  CreditCard, 
  PawPrint, 
  CheckCircle, 
  Trash2, 
  Clock,
  Search,
  Filter,
  AlertCircle,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Navbar } from '@/components/Navbar';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Toast, ToastType } from '@/components/Toast';
import { Edit2, Save, X as CloseIcon } from 'lucide-react';

export default function DadosAtualizadosAdminPage() {
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'new' | 'viewed'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'GERAL' | 'BANHO_TOSA'>('all');
  
  // Modal & Toast State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    id: string;
  }>({ isOpen: false, id: '' });
  
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: ToastType;
  }>({ show: false, message: '', type: 'success' });

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    nome: '',
    endereco: '',
    whatsapp: '',
    cpf: '',
    pets: [] as any[]
  });

  useEffect(() => {
    const q = query(collection(db, 'atualizacoes_dados'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUpdates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleMarkAsViewed = async (id: string) => {
    try {
      await updateDoc(doc(db, 'atualizacoes_dados', id), {
        visualizado: true
      });
      showToast('Status atualizado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao marcar como visualizado:', error);
      showToast('Erro ao atualizar status.', 'error');
    }
  };

  const showToast = (message: string, type: ToastType) => {
    setToast({ show: true, message, type });
  };

  const handleDelete = (id: string) => {
    setConfirmModal({ isOpen: true, id });
  };

  const onConfirmDelete = async () => {
    const id = confirmModal.id;
    setConfirmModal({ isOpen: false, id: '' });
    try {
      await deleteDoc(doc(db, 'atualizacoes_dados', id));
      showToast('Registro excluído com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao excluir registro:', error);
      showToast('Erro ao excluir registro.', 'error');
    }
  };

  const handleOpenEdit = (update: any) => {
    setEditingUpdate(update);
    setEditForm({
      nome: update.nome || '',
      endereco: update.endereco || '',
      whatsapp: update.whatsapp || '',
      cpf: update.cpf || '',
      pets: update.pets ? [...update.pets] : []
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUpdate) return;
    try {
      await updateDoc(doc(db, 'atualizacoes_dados', editingUpdate.id), {
        ...editForm
      });
      setIsEditModalOpen(false);
      setEditingUpdate(null);
      showToast('Alterações salvas com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao salvar edição:', error);
      showToast('Erro ao salvar as alterações.', 'error');
    }
  };

  const handlePetChange = (index: number, field: string, value: any) => {
    const newPets = [...editForm.pets];
    newPets[index] = { ...newPets[index], [field]: value };
    setEditForm({ ...editForm, pets: newPets });
  };

  const handleAlimentacaoChange = (index: number, value: string) => {
    const newPets = [...editForm.pets];
    const currentAlimentacao = newPets[index].alimentacao || [];
    if (currentAlimentacao.includes(value)) {
      newPets[index].alimentacao = currentAlimentacao.filter((v: string) => v !== value);
    } else {
      newPets[index].alimentacao = [...currentAlimentacao, value];
    }
    setEditForm({ ...editForm, pets: newPets });
  };

  const handleRemovePet = (index: number) => {
    const newPets = editForm.pets.filter((_, i) => i !== index);
    setEditForm({ ...editForm, pets: newPets });
  };

  const handleAddPet = () => {
    setEditForm({
      ...editForm,
      pets: [...editForm.pets, { nome: '', raca: '', idade: '', porte: '', alimentacao: [], marcaRacao: '' }]
    });
  };

  const filteredUpdates = updates.filter(update => {
    const matchesSearch = update.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         update.whatsapp.includes(searchTerm);
    const matchesFilter = filter === 'all' || 
                         (filter === 'new' && !update.visualizado) || 
                         (filter === 'viewed' && update.visualizado);
    const matchesType = typeFilter === 'all' || update.tipo === typeFilter;
    return matchesSearch && matchesFilter && matchesType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Navbar />
      <main className="min-h-screen bg-[#F8F9FA] pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="space-y-1">
              <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Dados Atualizados</h1>
              <p className="text-gray-500 font-medium">Gerencie as atualizações de cadastro enviadas pelos clientes.</p>
              <div className="flex flex-wrap gap-4 mt-4">
                <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl border border-blue-100">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Link Geral:</span>
                  <code className="text-xs font-bold text-blue-800">/atualizar-dados</code>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/atualizar-dados`);
                      showToast('Link copiado!', 'success');
                    }}
                    className="p-1 hover:bg-blue-100 rounded-lg transition-all text-blue-600"
                  >
                    <ExternalLink size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-xl border border-orange-100">
                  <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Link Banho e Tosa:</span>
                  <code className="text-xs font-bold text-orange-800">/cadastro-banho-tosa</code>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/cadastro-banho-tosa`);
                      showToast('Link copiado!', 'success');
                    }}
                    className="p-1 hover:bg-orange-100 rounded-lg transition-all text-orange-600"
                  >
                    <ExternalLink size={14} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar por nome ou WhatsApp..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-4 py-3 bg-white rounded-2xl border border-gray-100 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-64 transition-all"
                />
              </div>

              <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
                <button 
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filter === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  Todos
                </button>
                <button 
                  onClick={() => setFilter('new')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filter === 'new' ? 'bg-red-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  Novos
                </button>
                <button 
                  onClick={() => setFilter('viewed')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filter === 'viewed' ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  Visualizados
                </button>
              </div>

              <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
                <button 
                  onClick={() => setTypeFilter('all')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${typeFilter === 'all' ? 'bg-gray-800 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  Todos Tipos
                </button>
                <button 
                  onClick={() => setTypeFilter('GERAL')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${typeFilter === 'GERAL' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  Geral
                </button>
                <button 
                  onClick={() => setTypeFilter('BANHO_TOSA')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${typeFilter === 'BANHO_TOSA' ? 'bg-orange-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  Banho e Tosa
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredUpdates.length > 0 ? (
                filteredUpdates.map((update) => (
                  <motion.div
                    key={update.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`bg-white rounded-3xl border-2 transition-all overflow-hidden ${
                      !update.visualizado 
                        ? 'border-red-500 shadow-lg shadow-red-50' 
                        : 'border-gray-100 shadow-sm'
                    }`}
                  >
                    <div className="p-6">
                      <div className="flex flex-col lg:flex-row justify-between gap-6">
                        <div className="flex-1 space-y-6">
                          {/* Header Info */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-2xl ${!update.visualizado ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                <User size={24} />
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-gray-900">{update.nome}</h3>
                                <div className="flex items-center gap-3 mt-1">
                                  <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-widest">
                                    <Clock size={12} />
                                    {format(new Date(update.createdAt), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                                  </div>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                    update.tipo === 'BANHO_TOSA' 
                                      ? 'bg-orange-100 text-orange-600' 
                                      : 'bg-blue-100 text-blue-600'
                                  }`}>
                                    {update.tipo === 'BANHO_TOSA' ? 'Banho e Tosa' : 'Geral'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {!update.visualizado && (
                              <span className="bg-red-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
                                Novo
                              </span>
                            )}
                          </div>

                          {/* Details Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-1">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                <MapPin size={10} /> Endereço
                              </span>
                              <p className="text-sm font-medium text-gray-700">{update.endereco || 'Não informado'}</p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                <Phone size={10} /> WhatsApp
                              </span>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-gray-900">{update.whatsapp}</p>
                                <a 
                                  href={`https://wa.me/55${update.whatsapp.replace(/\D/g, '')}`}
                                  target="_blank"
                                  className="p-1 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-all"
                                >
                                  <ExternalLink size={14} />
                                </a>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                <CreditCard size={10} /> CPF
                              </span>
                              <p className="text-sm font-bold text-gray-900">{update.cpf || 'Não informado'}</p>
                            </div>
                          </div>

                          {/* Pets Section */}
                          {update.pets && update.pets.length > 0 && (
                            <div className="space-y-3 pt-4 border-t border-gray-50">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                <PawPrint size={10} /> Pets Cadastrados
                              </span>
                              <div className="flex flex-wrap gap-3">
                                {update.pets.map((pet: any, idx: number) => (
                                  <div key={idx} className="bg-orange-50 border border-orange-100 px-4 py-2 rounded-2xl flex items-center gap-3">
                                    <div className="bg-orange-200 p-1.5 rounded-lg text-orange-700">
                                      <PawPrint size={14} />
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-orange-900">{pet.nome}</p>
                                      <p className="text-[10px] text-orange-600 font-medium">
                                        {pet.raca} • {pet.idade}
                                        {pet.porte && ` • Porte: ${pet.porte}`}
                                      </p>
                                      {pet.marcaRacao && (
                                        <p className="text-[10px] text-orange-500 font-bold mt-0.5">Ração: {pet.marcaRacao}</p>
                                      )}
                                      {pet.alimentacao && pet.alimentacao.length > 0 && (
                                        <p className="text-[10px] text-orange-400 font-medium italic">Alimentação: {pet.alimentacao.join(', ')}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex lg:flex-col gap-3 justify-end lg:justify-start lg:border-l lg:border-gray-50 lg:pl-6">
                          <button 
                            onClick={() => handleOpenEdit(update)}
                            className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 transition-all border border-blue-100"
                            title="Editar Dados"
                          >
                            <Edit2 size={18} />
                          </button>
                          {!update.visualizado ? (
                            <button 
                              onClick={() => handleMarkAsViewed(update.id)}
                              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                            >
                              <CheckCircle size={18} />
                              Já Visualizeis
                            </button>
                          ) : (
                            <div className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-400 rounded-2xl font-bold text-sm cursor-default">
                              <CheckCircle size={18} />
                              Visualizado
                            </div>
                          )}
                          <button 
                            onClick={() => handleDelete(update.id)}
                            className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-all border border-red-100"
                            title="Excluir Registro"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                  <AlertCircle className="mx-auto text-gray-200 mb-4" size={48} />
                  <p className="text-gray-500 font-medium">Nenhuma atualização encontrada.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Edit Modal */}
        <AnimatePresence>
          {isEditModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
              >
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                  <div>
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Editar Registro</h2>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Atualize as informações do cliente</p>
                  </div>
                  <button 
                    onClick={() => setIsEditModalOpen(false)}
                    className="p-2 hover:bg-gray-200 rounded-xl transition-all text-gray-500"
                  >
                    <CloseIcon size={24} />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome Completo</label>
                      <input 
                        type="text"
                        value={editForm.nome}
                        onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-700"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">WhatsApp</label>
                      <input 
                        type="text"
                        value={editForm.whatsapp}
                        onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-700"
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Endereço</label>
                      <input 
                        type="text"
                        value={editForm.endereco}
                        onChange={(e) => setEditForm({ ...editForm, endereco: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-700"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">CPF</label>
                      <input 
                        type="text"
                        value={editForm.cpf}
                        onChange={(e) => setEditForm({ ...editForm, cpf: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-700"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                        <PawPrint size={16} className="text-orange-500" />
                        Pets
                      </h3>
                      <button 
                        onClick={handleAddPet}
                        className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-700 transition-all"
                      >
                        + Adicionar Pet
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {editForm.pets.map((pet, idx) => (
                        <div key={idx} className="p-4 bg-orange-50 rounded-2xl border border-orange-100 relative group">
                          <button 
                            onClick={() => handleRemovePet(idx)}
                            className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-md"
                          >
                            <CloseIcon size={12} />
                          </button>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <input 
                              placeholder="Nome do Pet"
                              value={pet.nome}
                              onChange={(e) => handlePetChange(idx, 'nome', e.target.value)}
                              className="px-3 py-2 bg-white rounded-xl border border-orange-100 outline-none text-xs font-bold text-gray-700"
                            />
                            <input 
                              placeholder="Raça"
                              value={pet.raca}
                              onChange={(e) => handlePetChange(idx, 'raca', e.target.value)}
                              className="px-3 py-2 bg-white rounded-xl border border-orange-100 outline-none text-xs font-bold text-gray-700"
                            />
                            <input 
                              placeholder="Idade"
                              value={pet.idade}
                              onChange={(e) => handlePetChange(idx, 'idade', e.target.value)}
                              className="px-3 py-2 bg-white rounded-xl border border-orange-100 outline-none text-xs font-bold text-gray-700"
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                            <select
                              value={pet.porte}
                              onChange={(e) => handlePetChange(idx, 'porte', e.target.value)}
                              className="px-3 py-2 bg-white rounded-xl border border-orange-100 outline-none text-xs font-bold text-gray-700"
                            >
                              <option value="">Porte</option>
                              <option value="pequeno">Pequeno</option>
                              <option value="medio">Médio</option>
                              <option value="grande">Grande</option>
                            </select>
                            <input 
                              placeholder="Marca de Ração"
                              value={pet.marcaRacao}
                              onChange={(e) => handlePetChange(idx, 'marcaRacao', e.target.value)}
                              className="px-3 py-2 bg-white rounded-xl border border-orange-100 outline-none text-xs font-bold text-gray-700"
                            />
                          </div>
                          <div className="mt-3 space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Alimentação</label>
                            <div className="flex flex-wrap gap-2">
                              {['Ração', 'Comida', 'Petiscos', 'Outros'].map((tipo) => (
                                <button
                                  key={tipo}
                                  onClick={() => handleAlimentacaoChange(idx, tipo)}
                                  className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                    (pet.alimentacao || []).includes(tipo)
                                      ? 'bg-orange-500 text-white shadow-sm'
                                      : 'bg-white text-gray-500 border border-orange-100 hover:bg-orange-50'
                                  }`}
                                >
                                  {tipo}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
                  <button 
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 px-6 py-3 bg-white text-gray-500 rounded-2xl font-bold text-sm border border-gray-200 hover:bg-gray-100 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSaveEdit}
                    className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                  >
                    <Save size={18} />
                    Salvar Alterações
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <ConfirmModal 
          isOpen={confirmModal.isOpen}
          title="Excluir Registro"
          message="Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita."
          onConfirm={onConfirmDelete}
          onCancel={() => setConfirmModal({ isOpen: false, id: '' })}
          confirmText="Excluir"
          cancelText="Cancelar"
          type="danger"
        />

        {toast.show && (
          <Toast 
            message={toast.message}
            type={toast.type}
            onClose={() => setToast({ ...toast, show: false })}
          />
        )}
      </main>
    </ErrorBoundary>
  );
}
