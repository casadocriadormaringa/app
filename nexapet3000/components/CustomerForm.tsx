'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Dog, Edit2, Clock, StickyNote, Loader2, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc,
  deleteDoc, 
  doc,
  Timestamp 
} from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

type NoteStatus = 'em andamento' | 'concluído' | 'não resolvi';

interface Note {
  id: string;
  clienteId: string;
  texto: string;
  status: NoteStatus;
  createdAt: any;
}

export interface Pet {
  id: string;
  nome: string;
  raca: string;
  porte: 'Pequeno' | 'Médio' | 'Grande';
  alimentacao?: string[];
  marcaRacao?: string;
  observacoes?: string;
  valor_pacote: number;
  tipo_pacote: 'Mensal' | 'Quinzenal' | 'Customizado';
  intervalo_customizado?: number;
  dia_semana: string;
  valor_banho_avulso: number;
  banho_e_tosa: 'Sim' | 'Não';
  proximo_banho?: string;
  vacinas?: { nome: string; data: string; proxima_dose: string; concluido?: boolean; data_conclusao?: string }[];
  vermifugos?: { nome: string; data: string; proxima_dose: string; concluido?: boolean; data_conclusao?: string }[];
  status_banho?: 'pendente' | 'em_rota' | 'ok';
}

export interface CustomerData {
  id?: string;
  codigo: string;
  nome: string;
  endereco: string;
  telefone: string;
  proximo_banho: string;
  data_vencimento: string;
  valor_pacote: number;
  tipo_pacote: 'Mensal' | 'Quinzenal' | 'Customizado';
  intervalo_customizado?: number;
  dia_semana: string;
  valor_banho_avulso: number;
  banho_e_tosa: 'Sim' | 'Não';
  pets?: Pet[];
  createdAt?: string;
  codigoConsulta?: string;
}

interface CustomerFormProps {
  customer?: CustomerData | null;
  customers: CustomerData[];
  onSave: (data: Omit<CustomerData, 'id'>) => void;
  onClose: () => void;
}

const DIAS_SEMANA = [
  'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'
];

export const CustomerForm: React.FC<CustomerFormProps> = ({ customer, customers, onSave, onClose }) => {
  const [formData, setFormData] = useState<Omit<CustomerData, 'id'>>({
    codigo: customer?.codigo || '',
    nome: customer?.nome || '',
    endereco: customer?.endereco || '',
    telefone: customer?.telefone || '',
    proximo_banho: customer?.proximo_banho || '',
    data_vencimento: customer?.data_vencimento || '',
    valor_pacote: customer?.valor_pacote || 0,
    tipo_pacote: customer?.tipo_pacote || 'Mensal',
    intervalo_customizado: customer?.intervalo_customizado || 7,
    dia_semana: customer?.dia_semana || 'Segunda',
    valor_banho_avulso: customer?.valor_banho_avulso || 0,
    banho_e_tosa: customer?.banho_e_tosa || 'Não',
    pets: customer?.pets || [],
    codigoConsulta: customer?.codigoConsulta || '',
  });

  const [newPet, setNewPet] = useState<Omit<Pet, 'id'>>({
    nome: '',
    raca: '',
    porte: 'Pequeno',
    alimentacao: [],
    marcaRacao: '',
    observacoes: '',
    valor_pacote: 0,
    tipo_pacote: 'Mensal',
    dia_semana: 'Segunda',
    valor_banho_avulso: 0,
    banho_e_tosa: 'Não',
    proximo_banho: '',
    vacinas: [],
    vermifugos: [],
    status_banho: 'pendente',
  });

  const [newVacina, setNewVacina] = useState({ nome: '', data: '', proxima_dose: '' });
  const [newVermifugo, setNewVermifugo] = useState({ nome: '', data: '', proxima_dose: '' });

  const [showPetForm, setShowPetForm] = useState(false);
  const [editingPetId, setEditingPetId] = useState<string | null>(null);

  // Notes state
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  // Load notes when editing a customer
  useEffect(() => {
    if (!customer?.id) {
      setNotes([]);
      setLoadingNotes(false);
      return;
    }

    setLoadingNotes(true);
    
    // Safety timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setLoadingNotes(false);
    }, 10000); // 10 seconds

    const q = query(
      collection(db, 'observacoes_clientes'),
      where('clienteId', '==', customer.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      clearTimeout(timeoutId);
      try {
        const notesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Note[];
        
        // Sort client-side to avoid index requirement
        notesData.sort((a, b) => {
          const getTime = (ts: any) => {
            if (!ts) return 0;
            if (ts.toMillis) return ts.toMillis();
            if (ts.seconds) return ts.seconds * 1000;
            const d = new Date(ts);
            return isNaN(d.getTime()) ? 0 : d.getTime();
          };
          return getTime(b.createdAt) - getTime(a.createdAt);
        });

        setNotes(notesData);
        setLoadingNotes(false);
      } catch (err) {
        console.error("Error processing notes data:", err);
        setLoadingNotes(false);
      }
    }, (error) => {
      clearTimeout(timeoutId);
      // Set loading to false BEFORE handling error to avoid infinite spinner
      setLoadingNotes(false);
      // Only throw if it's a critical error, otherwise just log
      if (error.code === 'permission-denied') {
        console.warn("Permission denied for notes. User might not have access.");
      } else {
        handleFirestoreError(error, OperationType.GET, 'observacoes_clientes');
      }
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [customer?.id]);

  const handleAddNote = async () => {
    if (!newNote.trim() || !customer?.id || savingNote) return;

    setSavingNote(true);
    try {
      await addDoc(collection(db, 'observacoes_clientes'), {
        clienteId: customer.id,
        texto: newNote.trim(),
        status: 'em andamento',
        createdAt: Timestamp.now()
      });
      setNewNote('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'observacoes_clientes');
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteDoc(doc(db, 'observacoes_clientes', noteId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `observacoes_clientes/${noteId}`);
    }
  };

  const handleUpdateNoteStatus = async (noteId: string, status: NoteStatus) => {
    try {
      await updateDoc(doc(db, 'observacoes_clientes', noteId), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `observacoes_clientes/${noteId}`);
    }
  };

  const formatDateShort = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      if (!date || isNaN(date.getTime())) return '';
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    } catch (e) {
      return '';
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      if (!date || isNaN(date.getTime())) return '';
      return format(date, 'HH:mm', { locale: ptBR });
    } catch (e) {
      return '';
    }
  };

  const calculateAvulso = (valor: number, tipo: 'Mensal' | 'Quinzenal' | 'Customizado') => {
    if (tipo === 'Mensal') return valor / 4;
    if (tipo === 'Quinzenal') return valor / 2;
    if (tipo === 'Customizado') return valor; // For custom, we assume the price is per bath or handled differently
    return 0;
  };

  const handleValorChange = (valor: number) => {
    setFormData(prev => ({
      ...prev,
      valor_pacote: valor,
      valor_banho_avulso: calculateAvulso(valor, prev.tipo_pacote)
    }));
  };

  const handleTipoChange = (tipo: 'Mensal' | 'Quinzenal' | 'Customizado') => {
    setFormData(prev => ({
      ...prev,
      tipo_pacote: tipo,
      valor_banho_avulso: calculateAvulso(prev.valor_pacote, tipo)
    }));
  };

  const generateAutoCode = () => {
    const numericCodes = customers
      .map(c => parseInt(c.codigo))
      .filter(code => !isNaN(code) && code >= 10000);
    
    const nextCode = numericCodes.length > 0 
      ? Math.max(...numericCodes) + 1 
      : 10000;
    
    setFormData(prev => ({ ...prev, codigo: nextCode.toString() }));
  };
  
  const generateConsultationCode = () => {
    if (!formData.nome) return;
    const firstName = formData.nome.trim().split(' ')[0].toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^a-z0-9]/g, ''); // Remove special chars
    
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomStr = '';
    for (let i = 0; i < 8; i++) {
      randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    const code = `${firstName}${randomStr}`;
    setFormData(prev => ({ ...prev, codigoConsulta: code }));
  };

  const handleAddPet = () => {
    if (!newPet.nome) return;
    
    if (editingPetId) {
      setFormData(prev => ({
        ...prev,
        pets: prev.pets?.map(p => p.id === editingPetId ? { ...newPet, id: editingPetId } : p)
      }));
    } else {
      const pet: Pet = {
        ...newPet,
        id: Math.random().toString(36).substring(2, 11),
      };
      setFormData(prev => ({
        ...prev,
        pets: [...(prev.pets || []), pet]
      }));
    }

    setNewPet({
      nome: '',
      raca: '',
      porte: 'Pequeno',
      alimentacao: [],
      marcaRacao: '',
      observacoes: '',
      valor_pacote: 0,
      tipo_pacote: 'Mensal',
      dia_semana: 'Segunda',
      valor_banho_avulso: 0,
      banho_e_tosa: 'Não',
      proximo_banho: '',
      vacinas: [],
      vermifugos: [],
      status_banho: 'pendente',
    });
    setShowPetForm(false);
    setEditingPetId(null);
  };

  const handleEditPet = (pet: Pet) => {
    setNewPet({ ...pet });
    setEditingPetId(pet.id);
    setShowPetForm(true);
  };

  const handleAddVacina = () => {
    if (!newVacina.nome || !newVacina.data) return;
    setNewPet(prev => ({
      ...prev,
      vacinas: [...(prev.vacinas || []), newVacina]
    }));
    setNewVacina({ nome: '', data: '', proxima_dose: '' });
  };

  const handleRemoveVacina = (index: number) => {
    setNewPet(prev => ({
      ...prev,
      vacinas: prev.vacinas?.filter((_, i) => i !== index)
    }));
  };

  const handleAddVermifugo = () => {
    if (!newVermifugo.nome || !newVermifugo.data) return;
    setNewPet(prev => ({
      ...prev,
      vermifugos: [...(prev.vermifugos || []), newVermifugo]
    }));
    setNewVermifugo({ nome: '', data: '', proxima_dose: '' });
  };

  const handleRemoveVermifugo = (index: number) => {
    setNewPet(prev => ({
      ...prev,
      vermifugos: prev.vermifugos?.filter((_, i) => i !== index)
    }));
  };

  const handleRemovePet = (id: string) => {
    setFormData(prev => ({
      ...prev,
      pets: prev.pets?.filter(p => p.id !== id)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      valor_pacote: Number(formData.valor_pacote),
      valor_banho_avulso: Number(formData.valor_banho_avulso)
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900">
            {customer ? 'Editar Cliente' : 'Novo Cliente'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Código</label>
              <div className="flex gap-2">
                <input
                  required
                  type="text"
                  value={formData.codigo || ''}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  placeholder="Ex: 10000"
                />
                {!customer && (
                  <button
                    type="button"
                    onClick={generateAutoCode}
                    className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-100 transition-colors whitespace-nowrap"
                  >
                    Auto
                  </button>
                )}
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Nome</label>
              <input
                required
                type="text"
                value={formData.nome || ''}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="Nome completo"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Código de Consulta</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  type="text"
                  value={formData.codigoConsulta || ''}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 outline-none"
                  placeholder="Gerar código..."
                />
                <button
                  type="button"
                  onClick={generateConsultationCode}
                  disabled={!!formData.codigoConsulta || !formData.nome}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 disabled:opacity-50 disabled:bg-gray-300 transition-all whitespace-nowrap"
                >
                  Gerar Código
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Telefone</label>
              <input
                type="text"
                value={formData.telefone || ''}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Endereço</label>
              <input
                type="text"
                value={formData.endereco || ''}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="Rua, Número, Bairro"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Próximo Banho</label>
              <input
                type="date"
                value={formData.proximo_banho || ''}
                onChange={(e) => setFormData({ ...formData, proximo_banho: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Data de Vencimento</label>
              <input
                type="date"
                value={formData.data_vencimento || ''}
                onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Valor do Pacote</label>
              <input
                required
                type="number"
                step="0.01"
                value={formData.valor_pacote || 0}
                onChange={(e) => handleValorChange(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Tipo de Pacote</label>
              <select
                value={formData.tipo_pacote || 'Mensal'}
                onChange={(e) => handleTipoChange(e.target.value as 'Mensal' | 'Quinzenal' | 'Customizado')}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-white"
              >
                <option value="Mensal">Mensal</option>
                <option value="Quinzenal">Quinzenal</option>
                <option value="Customizado">Customizado</option>
              </select>
            </div>
          </div>

          {formData.tipo_pacote === 'Customizado' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Intervalo de Banhos (Dias)</label>
                <input
                  required
                  type="number"
                  min="1"
                  value={formData.intervalo_customizado || 7}
                  onChange={(e) => setFormData({ ...formData, intervalo_customizado: Number(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  placeholder="Ex: 10"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Dia da Semana</label>
              <select
                value={formData.dia_semana || 'Segunda'}
                onChange={(e) => setFormData({ ...formData, dia_semana: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-white"
              >
                {DIAS_SEMANA.map(dia => (
                  <option key={dia} value={dia}>{dia}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Valor Banho Avulso (Calculado)</label>
              <div className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 font-bold text-indigo-600">
                R$ {(formData.valor_banho_avulso || 0).toFixed(2)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Cliente de Pacote?</label>
              <select
                value={formData.banho_e_tosa || 'Não'}
                onChange={(e) => setFormData({ ...formData, banho_e_tosa: e.target.value as 'Sim' | 'Não' })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-white"
              >
                <option value="Sim">Sim</option>
                <option value="Não">Não</option>
              </select>
            </div>
          </div>

          {/* Pets Section */}
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Dog className="text-indigo-600" size={20} />
                <h3 className="font-bold text-gray-900">Pets do Cliente</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPetForm(!showPetForm)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-100 transition-colors"
              >
                <Plus size={16} />
                {showPetForm ? 'Cancelar' : 'Adicionar Pet'}
              </button>
            </div>

            {showPetForm && (
              <div className="bg-gray-50 p-4 rounded-2xl space-y-4 mb-4 border border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Nome do Pet</label>
                    <input
                      type="text"
                      value={newPet.nome || ''}
                      onChange={(e) => setNewPet({ ...newPet, nome: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Nome do pet"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Raça</label>
                    <input
                      type="text"
                      value={newPet.raca || ''}
                      onChange={(e) => setNewPet({ ...newPet, raca: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Ex: Poodle, SRD"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Porte</label>
                    <select
                      value={newPet.porte || 'Pequeno'}
                      onChange={(e) => setNewPet({ ...newPet, porte: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    >
                      <option value="Pequeno">Pequeno</option>
                      <option value="Médio">Médio</option>
                      <option value="Grande">Grande</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Cliente de Pacote?</label>
                    <select
                      value={newPet.banho_e_tosa || 'Não'}
                      onChange={(e) => setNewPet({ ...newPet, banho_e_tosa: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    >
                      <option value="Sim">Sim</option>
                      <option value="Não">Não</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Dia da Semana</label>
                    <select
                      value={newPet.dia_semana || 'Segunda'}
                      onChange={(e) => setNewPet({ ...newPet, dia_semana: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    >
                      {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map(dia => (
                        <option key={dia} value={dia}>{dia}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Tipo do Pacote</label>
                    <select
                      value={newPet.tipo_pacote || 'Mensal'}
                      onChange={(e) => {
                        const tipo = e.target.value as any;
                        setNewPet({ 
                          ...newPet, 
                          tipo_pacote: tipo,
                          valor_banho_avulso: calculateAvulso(newPet.valor_pacote || 0, tipo)
                        });
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    >
                      <option value="Mensal">Mensal (4 banhos)</option>
                      <option value="Quinzenal">Quinzenal (2 banhos)</option>
                      <option value="Customizado">Customizado</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Valor do Pacote</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                      <input
                        type="number"
                        value={newPet.valor_pacote || 0}
                        onChange={(e) => {
                          const valor = Number(e.target.value);
                          setNewPet({ 
                            ...newPet, 
                            valor_pacote: valor,
                            valor_banho_avulso: calculateAvulso(valor, newPet.tipo_pacote || 'Mensal')
                          });
                        }}
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Valor Banho Avulso</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                      <input
                        type="number"
                        value={newPet.valor_banho_avulso || 0}
                        onChange={(e) => setNewPet({ ...newPet, valor_banho_avulso: Number(e.target.value) })}
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Próximo Banho</label>
                    <input
                      type="date"
                      value={newPet.proximo_banho || ''}
                      onChange={(e) => setNewPet({ ...newPet, proximo_banho: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Marca de Ração</label>
                    <input
                      type="text"
                      value={newPet.marcaRacao || ''}
                      onChange={(e) => setNewPet({ ...newPet, marcaRacao: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Marca que costuma comprar"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Alimentação</label>
                    <div className="flex flex-wrap gap-2">
                      {['Ração', 'Comida', 'Petiscos', 'Outros'].map((tipo) => (
                        <button
                          key={tipo}
                          type="button"
                          onClick={() => {
                            const current = newPet.alimentacao || [];
                            const updated = current.includes(tipo)
                              ? current.filter(t => t !== tipo)
                              : [...current, tipo];
                            setNewPet({ ...newPet, alimentacao: updated });
                          }}
                          className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                            (newPet.alimentacao || []).includes(tipo)
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {tipo}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Observações</label>
                  <input
                    type="text"
                    value={newPet.observacoes || ''}
                    onChange={(e) => setNewPet({ ...newPet, observacoes: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Alergias, comportamento, etc."
                  />
                </div>

                {/* Vaccines Control */}
                <div className="space-y-2 pt-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Controle de Vacinas</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Vacina"
                      value={newVacina.nome}
                      onChange={e => setNewVacina({ ...newVacina, nome: e.target.value })}
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-gray-200 outline-none"
                    />
                    <input
                      type="date"
                      value={newVacina.data}
                      onChange={e => setNewVacina({ ...newVacina, data: e.target.value })}
                      className="w-32 px-3 py-1.5 text-xs rounded-lg border border-gray-200 outline-none"
                    />
                    <input
                      type="date"
                      placeholder="Próxima"
                      value={newVacina.proxima_dose}
                      onChange={e => setNewVacina({ ...newVacina, proxima_dose: e.target.value })}
                      className="w-32 px-3 py-1.5 text-xs rounded-lg border border-gray-200 outline-none"
                    />
                    <button type="button" onClick={handleAddVacina} className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100">
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {newPet.vacinas?.map((v, i) => (
                      <div key={i} className="text-[10px] bg-white border border-gray-200 px-2 py-1 rounded-md flex items-center gap-2 group/item">
                        <span className="font-bold">{v.nome}</span>
                        <span className="text-gray-400">{v.data}</span>
                        {v.proxima_dose && <span className="text-red-400">Próx: {v.proxima_dose}</span>}
                        <button 
                          type="button" 
                          onClick={() => handleRemoveVacina(i)}
                          className="text-red-400 hover:text-red-600 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Deworming Control */}
                <div className="space-y-2 pt-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Controle de Vermífugos</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Vermífugo"
                      value={newVermifugo.nome}
                      onChange={e => setNewVermifugo({ ...newVermifugo, nome: e.target.value })}
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-gray-200 outline-none"
                    />
                    <input
                      type="date"
                      value={newVermifugo.data}
                      onChange={e => setNewVermifugo({ ...newVermifugo, data: e.target.value })}
                      className="w-32 px-3 py-1.5 text-xs rounded-lg border border-gray-200 outline-none"
                    />
                    <input
                      type="date"
                      placeholder="Próxima"
                      value={newVermifugo.proxima_dose}
                      onChange={e => setNewVermifugo({ ...newVermifugo, proxima_dose: e.target.value })}
                      className="w-32 px-3 py-1.5 text-xs rounded-lg border border-gray-200 outline-none"
                    />
                    <button type="button" onClick={handleAddVermifugo} className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100">
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {newPet.vermifugos?.map((v, i) => (
                      <div key={i} className="text-[10px] bg-white border border-gray-200 px-2 py-1 rounded-md flex items-center gap-2 group/item">
                        <span className="font-bold">{v.nome}</span>
                        <span className="text-gray-400">{v.data}</span>
                        {v.proxima_dose && <span className="text-red-400">Próx: {v.proxima_dose}</span>}
                        <button 
                          type="button" 
                          onClick={() => handleRemoveVermifugo(i)}
                          className="text-red-400 hover:text-red-600 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddPet}
                  disabled={!newPet.nome}
                  className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-all"
                >
                  {editingPetId ? 'Atualizar Pet' : 'Confirmar Pet'}
                </button>
              </div>
            )}

            <div className="space-y-2">
              {formData.pets?.length === 0 ? (
                <p className="text-center py-4 text-sm text-gray-400 italic">Nenhum pet cadastrado.</p>
              ) : (
                formData.pets?.map((pet) => (
                  <div key={pet.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:border-indigo-100 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                        <Dog size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{pet.nome}</span>
                          <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase">{pet.porte}</span>
                        </div>
                        <p className="text-xs text-gray-500">{pet.raca} {pet.observacoes ? `• ${pet.observacoes}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleEditPet(pet)}
                        className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemovePet(pet.id)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Notes Section - Only visible when editing */}
          {customer?.id && (
            <div className="pt-6 border-t border-gray-100 space-y-4">
              <div className="flex items-center gap-2">
                <StickyNote className="text-indigo-600" size={20} />
                <h3 className="font-bold text-gray-900">Observações do CRM</h3>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Nova Observação</label>
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none min-h-[80px] text-sm"
                    placeholder="Digite aqui uma nova nota para este cliente..."
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || savingNote}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-2xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-100"
                >
                  {savingNote ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                  Adicionar Nota
                </button>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Histórico de Notas</h4>
                
                {loadingNotes ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="animate-spin text-indigo-600" size={24} />
                  </div>
                ) : notes.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <p className="text-gray-400 text-xs font-medium">Nenhuma observação registrada.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notes.map((note) => (
                      <div key={note.id} className={`border p-4 rounded-2xl shadow-sm transition-all group relative ${
                        note.status === 'concluído' ? 'border-emerald-100 bg-emerald-50/10' : 
                        note.status === 'não resolvi' ? 'border-red-100 bg-red-50/10' : 
                        'border-gray-100 bg-white'
                      }`}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-indigo-600 font-bold text-[10px]">
                              <Clock size={12} />
                              <span>[{formatDateShort(note.createdAt)}]</span>
                              <span className="text-gray-400 font-medium">{formatTime(note.createdAt)}</span>
                            </div>
                            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider w-fit ${
                              note.status === 'concluído' ? 'bg-emerald-100 text-emerald-700' :
                              note.status === 'não resolvi' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {note.status === 'concluído' ? <CheckCircle2 size={9} /> :
                               note.status === 'não resolvi' ? <AlertCircle size={9} /> :
                               <Circle size={9} className="animate-pulse" />}
                              {note.status}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <p className={`text-gray-700 text-xs whitespace-pre-wrap leading-relaxed mb-3 ${
                          note.status === 'concluído' ? 'line-through opacity-50' : ''
                        }`}>
                          {note.texto}
                        </p>

                        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-50">
                          <button
                            type="button"
                            onClick={() => handleUpdateNoteStatus(note.id, 'em andamento')}
                            className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-all ${
                              note.status === 'em andamento'
                                ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                : 'bg-gray-50 text-gray-400 border border-transparent hover:bg-gray-100'
                            }`}
                          >
                            Em Andamento
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateNoteStatus(note.id, 'concluído')}
                            className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-all ${
                              note.status === 'concluído'
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                : 'bg-gray-50 text-gray-400 border border-transparent hover:bg-gray-100'
                            }`}
                          >
                            Concluído
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateNoteStatus(note.id, 'não resolvi')}
                            className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-all ${
                              note.status === 'não resolvi'
                                ? 'bg-red-100 text-red-700 border border-red-200'
                                : 'bg-gray-50 text-gray-400 border border-transparent hover:bg-gray-100'
                            }`}
                          >
                            Não Resolvi
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

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
