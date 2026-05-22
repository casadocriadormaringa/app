'use client';

import React, { useState, useEffect } from 'react';
import { 
  doc, 
  getDoc, 
  setDoc
} from 'firebase/firestore';
import { db } from '@/firebase';
import { Navbar } from '@/components/Navbar';
import { SecurityLock } from '@/components/SecurityLock';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Toast, ToastType } from '@/components/Toast';
import { 
  Settings, 
  Building2, 
  Phone, 
  QrCode, 
  Lock, 
  Save, 
  Loader2,
  Users,
  Calendar,
  Clock,
  CheckSquare,
  MapPin
} from 'lucide-react';

export default function GerencialPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  
  const [config, setConfig] = useState({
    nomeEmpresa: '',
    cnpjCpf: '',
    enderecoRua: '',
    enderecoNumero: '',
    enderecoBairro: '',
    enderecoCidade: '',
    enderecoEstado: '',
    enderecoCep: '',
    telefoneEmpresa: '',
    chavePix: '',
    bancoPix: '',
    nomePix: '',
    senhaDesbloqueio: '',
    diasInatividade: 30,
    agendaConfig: {
      diasDisponiveis: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
      horarioInicio: '08:00',
      horarioFim: '18:00',
      intervaloMinutos: 60,
      permitirConflito: false
    }
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, 'config', 'empresa');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setConfig(docSnap.data() as any);
        }
      } catch (error) {
        console.error('Erro ao buscar configurações:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      await setDoc(doc(db, 'config', 'empresa'), {
        ...config,
        updatedAt: new Date().toISOString()
      });
      setToast({ message: 'Configurações salvas com sucesso!', type: 'success' });
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      setToast({ message: 'Erro ao salvar configurações.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-[#F8F9FA]">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
        <p className="text-gray-600 font-bold">Carregando Configurações...</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-[#F8F9FA]">
        <Navbar />
        <SecurityLock>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-100">
                <Settings className="text-white" size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-black text-gray-900">Gerencial</h1>
                <p className="text-gray-500 font-medium">Configurações gerais da empresa</p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-8 space-y-8">
                  {/* Nome da Empresa */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
                      <Building2 size={16} />
                      Nome da Empresa
                    </label>
                    <input
                      type="text"
                      value={config.nomeEmpresa}
                      onChange={(e) => setConfig({ ...config, nomeEmpresa: e.target.value })}
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none text-gray-900 font-bold transition-all"
                      placeholder="Ex: Casa do Criador Maringá"
                    />
                  </div>

                  {/* CNPJ ou CPF */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
                      <Building2 size={16} />
                      CNPJ ou CPF (Opcional)
                    </label>
                    <input
                      type="text"
                      value={config.cnpjCpf || ''}
                      onChange={(e) => setConfig({ ...config, cnpjCpf: e.target.value })}
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none text-gray-900 font-bold transition-all"
                      placeholder="00.000.000/0000-00 ou 000.000.000-00"
                    />
                  </div>

                  {/* Endereço */}
                  <div className="pt-8 border-t border-gray-100">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
                        <MapPin size={20} />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">Endereço da Empresa</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-2 space-y-3">
                        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
                          Rua / Logradouro
                        </label>
                        <input
                          type="text"
                          value={config.enderecoRua || ''}
                          onChange={(e) => setConfig({ ...config, enderecoRua: e.target.value })}
                          className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none text-gray-900 font-bold transition-all"
                          placeholder="Nome da rua"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
                          Número
                        </label>
                        <input
                          type="text"
                          value={config.enderecoNumero || ''}
                          onChange={(e) => setConfig({ ...config, enderecoNumero: e.target.value })}
                          className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none text-gray-900 font-bold transition-all"
                          placeholder="Nº"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
                          Bairro
                        </label>
                        <input
                          type="text"
                          value={config.enderecoBairro || ''}
                          onChange={(e) => setConfig({ ...config, enderecoBairro: e.target.value })}
                          className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none text-gray-900 font-bold transition-all"
                          placeholder="Bairro"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
                          Cidade
                        </label>
                        <input
                          type="text"
                          value={config.enderecoCidade || ''}
                          onChange={(e) => setConfig({ ...config, enderecoCidade: e.target.value })}
                          className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none text-gray-900 font-bold transition-all"
                          placeholder="Cidade"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
                          Estado (UF)
                        </label>
                        <input
                          type="text"
                          value={config.enderecoEstado || ''}
                          onChange={(e) => setConfig({ ...config, enderecoEstado: e.target.value })}
                          className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none text-gray-900 font-bold transition-all"
                          placeholder="UF"
                          maxLength={2}
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
                          CEP
                        </label>
                        <input
                          type="text"
                          value={config.enderecoCep || ''}
                          onChange={(e) => setConfig({ ...config, enderecoCep: e.target.value })}
                          className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none text-gray-900 font-bold transition-all"
                          placeholder="00000-000"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Telefone da Empresa */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
                      <Phone size={16} />
                      Telefone da Empresa
                    </label>
                    <input
                      type="text"
                      value={config.telefoneEmpresa}
                      onChange={(e) => setConfig({ ...config, telefoneEmpresa: e.target.value })}
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none text-gray-900 font-bold transition-all"
                      placeholder="Ex: (44) 99999-9999"
                    />
                  </div>

                  {/* Chave PIX */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
                      <QrCode size={16} />
                      Chave PIX
                    </label>
                    <input
                      type="text"
                      value={config.chavePix}
                      onChange={(e) => setConfig({ ...config, chavePix: e.target.value })}
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none text-gray-900 font-bold transition-all"
                      placeholder="E-mail, CPF, CNPJ ou Chave Aleatória"
                    />
                  </div>

                  {/* Banco PIX */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
                      <Building2 size={16} />
                      Banco PIX
                    </label>
                    <input
                      type="text"
                      value={config.bancoPix}
                      onChange={(e) => setConfig({ ...config, bancoPix: e.target.value })}
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none text-gray-900 font-bold transition-all"
                      placeholder="Ex: Nubank, Banco do Brasil..."
                    />
                  </div>

                  {/* Nome PIX */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
                      <Users size={16} />
                      Nome do Titular PIX
                    </label>
                    <input
                      type="text"
                      value={config.nomePix}
                      onChange={(e) => setConfig({ ...config, nomePix: e.target.value })}
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none text-gray-900 font-bold transition-all"
                      placeholder="Nome que aparece no PIX"
                    />
                  </div>

                  {/* Senha de Desbloqueio */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
                      <Lock size={16} />
                      Senha de Desbloqueio
                    </label>
                    <input
                      type="password"
                      value={config.senhaDesbloqueio}
                      onChange={(e) => setConfig({ ...config, senhaDesbloqueio: e.target.value })}
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none text-gray-900 font-bold transition-all"
                      placeholder="Digite a senha para desbloqueios"
                    />
                  </div>

                  {/* Dias de Inatividade */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
                      <Clock size={16} />
                      Tempo para Inatividade (Dias)
                    </label>
                    <input
                      type="number"
                      value={config.diasInatividade || 30}
                      onChange={(e) => setConfig({ ...config, diasInatividade: parseInt(e.target.value) || 0 })}
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none text-gray-900 font-bold transition-all"
                      placeholder="Ex: 30"
                      min={1}
                    />
                    <p className="text-xs text-gray-400 font-medium italic">
                      Define quantos dias sem compras/serviços tornam o cliente "Inativo".
                    </p>
                  </div>

                  {/* Configurações da Agenda */}
                  <div className="pt-8 border-t border-gray-100">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
                        <Calendar size={20} />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">Configurações da Agenda</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
                          <Clock size={16} />
                          Horário de Início
                        </label>
                        <input
                          type="time"
                          value={config.agendaConfig?.horarioInicio || '08:00'}
                          onChange={(e) => setConfig({ 
                            ...config, 
                            agendaConfig: { ...config.agendaConfig, horarioInicio: e.target.value } 
                          })}
                          className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none text-gray-900 font-bold transition-all"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
                          <Clock size={16} />
                          Horário de Término
                        </label>
                        <input
                          type="time"
                          value={config.agendaConfig?.horarioFim || '18:00'}
                          onChange={(e) => setConfig({ 
                            ...config, 
                            agendaConfig: { ...config.agendaConfig, horarioFim: e.target.value } 
                          })}
                          className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none text-gray-900 font-bold transition-all"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
                          <Clock size={16} />
                          Intervalo (Minutos)
                        </label>
                        <select
                          value={config.agendaConfig?.intervaloMinutos || 60}
                          onChange={(e) => setConfig({ 
                            ...config, 
                            agendaConfig: { ...config.agendaConfig, intervaloMinutos: parseInt(e.target.value) } 
                          })}
                          className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none text-gray-900 font-bold transition-all"
                        >
                          <option value={15}>15 minutos</option>
                          <option value={30}>30 minutos</option>
                          <option value={45}>45 minutos</option>
                          <option value={60}>1 hora</option>
                          <option value={120}>2 horas</option>
                        </select>
                      </div>

                      <div className="space-y-3">
                        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
                          <CheckSquare size={16} />
                          Permitir Agendamentos Simultâneos
                        </label>
                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                          <button
                            type="button"
                            onClick={() => setConfig({ 
                              ...config, 
                              agendaConfig: { ...config.agendaConfig, permitirConflito: !config.agendaConfig?.permitirConflito } 
                            })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                              config.agendaConfig?.permitirConflito ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                config.agendaConfig?.permitirConflito ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                          <span className="text-sm font-bold text-gray-700">
                            {config.agendaConfig?.permitirConflito ? 'Sim (Permitir conflitos)' : 'Não (Apenas um serviço por horário)'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 space-y-3">
                      <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
                        <Calendar size={16} />
                        Dias Disponíveis
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map(dia => {
                          const isSelected = config.agendaConfig?.diasDisponiveis?.includes(dia);
                          return (
                            <button
                              key={dia}
                              type="button"
                              onClick={() => {
                                const current = config.agendaConfig?.diasDisponiveis || [];
                                const next = isSelected 
                                  ? current.filter(d => d !== dia)
                                  : [...current, dia];
                                setConfig({
                                  ...config,
                                  agendaConfig: { ...config.agendaConfig, diasDisponiveis: next }
                                });
                              }}
                              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                                isSelected 
                                  ? 'bg-indigo-600 text-white shadow-md' 
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                              }`}
                            >
                              {dia}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <Save size={20} />
                    )}
                    Salvar Configurações
                  </button>
                </div>
              </div>
            </form>
          </div>
          </SecurityLock>

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
