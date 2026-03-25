'use client';

import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  setDoc,
  doc, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db } from '@/firebase';
import { Navbar } from '@/components/Navbar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { 
  Lock, 
  Unlock, 
  Plus, 
  Trash2, 
  Edit2, 
  Calendar, 
  User, 
  Phone, 
  DollarSign, 
  Mail,
  MessageCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PROTECTED_PASSWORD = '7x!N9&pW2s';
const RECOVERY_EMAIL = 'casadocriadormaringa@gmail.com';

export default function CadeadoPage() {
  const [password, setPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState('');
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    contato: '',
    telefone: '',
    valor: '',
    dataCriacao: format(new Date(), 'yyyy-MM-dd'),
    dataExpiracao: ''
  });

  useEffect(() => {
    const docRef = doc(db, 'cadeado_itens', 'config');
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setItem({ id: snapshot.id, ...data });
        setFormData({
          nome: data.nome || '',
          contato: data.contato || '',
          telefone: data.telefone || '',
          valor: data.valor?.toString() || '',
          dataCriacao: data.dataCriacao || format(new Date(), 'yyyy-MM-dd'),
          dataExpiracao: data.dataExpiracao || ''
        });
      } else {
        setItem(null);
      }
      setLoading(false);
    });

    // Timeout de segurança
    const timeout = setTimeout(() => {
      setLoading(prev => {
        if (prev) {
          console.warn('CadeadoPage: Timeout de carregamento atingido.');
          return false;
        }
        return prev;
      });
    }, 15000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === PROTECTED_PASSWORD) {
      setIsUnlocked(true);
      setError('');
    } else {
      setError('Senha incorreta. Tente novamente.');
    }
  };

  const handleRememberPassword = () => {
    const subject = encodeURIComponent('Recuperação de Senha - Página Cadeado');
    const body = encodeURIComponent(`Olá,\n\nA senha da página Cadeado é: ${PROTECTED_PASSWORD}`);
    const url = `mailto:${RECOVERY_EMAIL}?subject=${subject}&body=${body}`;
    window.location.href = url;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        valor: parseFloat(formData.valor) || 0,
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'cadeado_itens', 'config'), data, { merge: true });

      setIsModalOpen(false);
    } catch (err) {
      console.error('Erro ao salvar item:', err);
    }
  };

  if (!isUnlocked) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-indigo-100 p-4 rounded-full mb-4">
              <Lock className="text-indigo-600" size={48} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Página Protegida</h1>
            <p className="text-gray-500 text-center mt-2">
              Insira a senha para acessar o conteúdo restrito.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a senha..."
                className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                autoFocus
              />
              {error && (
                <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
            >
              <Unlock size={20} />
              Desbloquear
            </button>
          </form>

          <div className="mt-8 pt-6 border-top border-gray-100">
            <button
              onClick={handleRememberPassword}
              className="w-full flex items-center justify-center gap-2 text-indigo-600 font-bold hover:bg-indigo-50 py-3 rounded-xl transition-all"
            >
              <Mail size={20} />
              Lembrar Senha (E-mail)
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-[#F8F9FA] pb-20">
        <Navbar />

        <div className="bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-1.5 rounded-lg">
                <Lock className="text-white" size={20} />
              </div>
              <h1 className="text-lg font-bold text-gray-900">Cadeado</h1>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsUnlocked(false);
                  setPassword('');
                }}
                className="flex items-center gap-2 bg-gray-100 text-gray-600 px-4 py-2 rounded-xl font-bold hover:bg-gray-200 transition-all active:scale-95 text-sm"
              >
                <Lock size={18} />
                Bloquear
              </button>
              
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95 text-sm"
              >
                <Edit2 size={18} />
                Editar Dados
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="animate-spin text-indigo-600" size={48} />
              <div className="text-center">
                <p className="text-gray-600 font-bold">Carregando Configurações...</p>
                <p className="text-gray-400 text-xs mt-1">Isso pode levar alguns segundos.</p>
              </div>
              <button 
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all"
              >
                Recarregar Página
              </button>
            </div>
          ) : !item ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200">
              <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="text-gray-300" size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Nenhum dado configurado</h3>
              <p className="text-gray-500">Clique em &quot;Editar Dados&quot; para configurar as informações.</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-indigo-100 p-4 rounded-2xl">
                  <User className="text-indigo-600" size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{item.nome}</h2>
                  <p className="text-gray-500">Informações Protegidas</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-4 group">
                    <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-indigo-50 transition-colors">
                      <MessageCircle className="text-gray-400 group-hover:text-indigo-600" size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contato</p>
                      <p className="text-gray-900 font-medium">{item.contato || 'Não informado'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 group">
                    <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-indigo-50 transition-colors">
                      <Phone className="text-gray-400 group-hover:text-indigo-600" size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Telefone</p>
                      <p className="text-gray-900 font-medium">{item.telefone || 'Não informado'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 group">
                    <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-indigo-50 transition-colors">
                      <DollarSign className="text-gray-400 group-hover:text-indigo-600" size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Valor</p>
                      <p className="text-2xl font-bold text-indigo-600">
                        R$ {parseFloat(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-3xl p-6 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm">
                      <Calendar className="text-indigo-600" size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Data de Criação</p>
                      <p className="text-gray-900 font-bold">
                        {item.dataCriacao ? format(new Date(item.dataCriacao), 'dd/MM/yyyy') : '-'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm">
                      <Calendar className="text-red-500" size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Data de Expiração</p>
                      <p className="text-red-600 font-bold">
                        {item.dataExpiracao ? format(new Date(item.dataExpiracao), 'dd/MM/yyyy') : '-'}
                      </p>
                    </div>
                  </div>

                  {item.updatedAt && (
                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-[10px] text-gray-400 uppercase text-center">
                        Última atualização: {format(new Date(item.updatedAt), "dd/MM/yyyy 'às' HH:mm")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900">
                  Editar Dados
                </h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-all"
                >
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Data de Criação</label>
                    <input
                      type="date"
                      required
                      value={formData.dataCriacao}
                      onChange={(e) => setFormData({ ...formData, dataCriacao: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Data de Expiração</label>
                    <input
                      type="date"
                      value={formData.dataExpiracao}
                      onChange={(e) => setFormData({ ...formData, dataExpiracao: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nome</label>
                  <input
                    type="text"
                    required
                    placeholder="Nome completo..."
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contato</label>
                    <input
                      type="text"
                      placeholder="E-mail ou rede social..."
                      value={formData.contato}
                      onChange={(e) => setFormData({ ...formData, contato: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Telefone</label>
                    <input
                      type="text"
                      placeholder="(00) 00000-0000"
                      value={formData.telefone}
                      onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Valor</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0,00"
                      value={formData.valor}
                      onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-4 border border-gray-200 text-gray-600 rounded-2xl font-bold hover:bg-gray-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </ErrorBoundary>
  );
}
