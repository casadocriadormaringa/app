'use client';

import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { motion } from 'motion/react';
import { Save, Plus, Trash2, CheckCircle2, Loader2, User, MapPin, Phone, CreditCard, PawPrint, Check } from 'lucide-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function AtualizarDadosPage() {
  const [formData, setFormData] = useState({
    nome: '',
    endereco: '',
    whatsapp: '',
    cpf: '',
  });
  const [pets, setPets] = useState([{ nome: '', raca: '', idade: '', porte: '', alimentacao: [] as string[], marcaRacao: '' }]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleAddPet = () => {
    setPets([...pets, { nome: '', raca: '', idade: '', porte: '', alimentacao: [], marcaRacao: '' }]);
  };

  const handleRemovePet = (index: number) => {
    const newPets = pets.filter((_, i) => i !== index);
    setPets(newPets);
  };

  const handlePetChange = (index: number, field: string, value: any) => {
    const newPets = [...pets];
    (newPets[index] as any)[field] = value;
    setPets(newPets);
  };

  const handleAlimentacaoChange = (index: number, value: string) => {
    const newPets = [...pets];
    const currentAlimentacao = newPets[index].alimentacao || [];
    if (currentAlimentacao.includes(value)) {
      newPets[index].alimentacao = currentAlimentacao.filter(v => v !== value);
    } else {
      newPets[index].alimentacao = [...currentAlimentacao, value];
    }
    setPets(newPets);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.whatsapp) {
      alert('Por favor, preencha pelo menos o nome e o WhatsApp.');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'atualizacoes_dados'), {
        ...formData,
        pets: pets.filter(p => p.nome), // Only save pets with a name
        visualizado: false,
        tipo: 'GERAL',
        createdAt: new Date().toISOString(),
      });
      setSuccess(true);
    } catch (error) {
      console.error('Erro ao enviar dados:', error);
      alert('Ocorreu um erro ao enviar os dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-6"
        >
          <div className="bg-emerald-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle2 size={48} />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">Dados Enviados!</h1>
            <p className="text-gray-500">Agradecemos por manter seu cadastro atualizado. Já recebemos suas informações.</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#F8F9FA] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Atualização de Cadastro</h1>
            <p className="text-gray-500 font-medium">Mantenha seus dados e de seus pets sempre em dia conosco.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Dados Pessoais */}
            <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
                  <User size={20} />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Seus Dados</h2>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Nome Completo</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      required
                      type="text"
                      placeholder="Como devemos te chamar?"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Endereço Completo</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      placeholder="Rua, número, bairro, cidade..."
                      value={formData.endereco}
                      onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">WhatsApp</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        required
                        type="tel"
                        placeholder="(00) 00000-0000"
                        value={formData.whatsapp}
                        onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">CPF (Para NF)</label>
                    <div className="relative">
                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="text"
                        placeholder="000.000.000-00"
                        value={formData.cpf}
                        onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Dados dos Pets */}
            <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-100 p-2 rounded-xl text-orange-600">
                    <PawPrint size={20} />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">Seus Pets</h2>
                </div>
                <button 
                  type="button"
                  onClick={handleAddPet}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-xl text-sm font-bold hover:bg-orange-100 transition-all"
                >
                  <Plus size={16} />
                  Adicionar Pet
                </button>
              </div>

              <div className="space-y-4">
                {pets.map((pet, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-2xl space-y-4 relative group">
                    {pets.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => handleRemovePet(index)}
                        className="absolute -top-2 -right-2 p-2 bg-white text-red-500 rounded-full shadow-md border border-red-50 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome do Pet</label>
                        <input
                          type="text"
                          placeholder="Ex: Rex"
                          value={pet.nome}
                          onChange={(e) => handlePetChange(index, 'nome', e.target.value)}
                          className="w-full px-4 py-3 bg-white rounded-xl border-transparent focus:ring-2 focus:ring-orange-500 outline-none transition-all text-sm font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Raça</label>
                        <input
                          type="text"
                          placeholder="Ex: Poodle"
                          value={pet.raca}
                          onChange={(e) => handlePetChange(index, 'raca', e.target.value)}
                          className="w-full px-4 py-3 bg-white rounded-xl border-transparent focus:ring-2 focus:ring-orange-500 outline-none transition-all text-sm font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Idade</label>
                        <input
                          type="text"
                          placeholder="Ex: 2 anos"
                          value={pet.idade}
                          onChange={(e) => handlePetChange(index, 'idade', e.target.value)}
                          className="w-full px-4 py-3 bg-white rounded-xl border-transparent focus:ring-2 focus:ring-orange-500 outline-none transition-all text-sm font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Porte do Pet</label>
                        <select
                          value={pet.porte}
                          onChange={(e) => handlePetChange(index, 'porte', e.target.value)}
                          className="w-full px-4 py-3 bg-white rounded-xl border-transparent focus:ring-2 focus:ring-orange-500 outline-none transition-all text-sm font-medium"
                        >
                          <option value="">Selecione o porte</option>
                          <option value="pequeno">Pequeno</option>
                          <option value="medio">Médio</option>
                          <option value="grande">Grande</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Marca de Ração que costuma comprar</label>
                        <input
                          type="text"
                          placeholder="Ex: Royal Canin, Premier..."
                          value={pet.marcaRacao}
                          onChange={(e) => handlePetChange(index, 'marcaRacao', e.target.value)}
                          className="w-full px-4 py-3 bg-white rounded-xl border-transparent focus:ring-2 focus:ring-orange-500 outline-none transition-all text-sm font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tipo de Alimentação (Multi-seleção)</label>
                      <div className="flex flex-wrap gap-3">
                        {['Ração', 'Comida', 'Petiscos', 'Outros'].map((tipo) => (
                          <label key={tipo} className="flex items-center gap-2 cursor-pointer group">
                            <div 
                              onClick={() => handleAlimentacaoChange(index, tipo)}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${pet.alimentacao.includes(tipo) ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-300 bg-white group-hover:border-orange-400'}`}
                            >
                              {pet.alimentacao.includes(tipo) && <Check size={12} />}
                            </div>
                            <span className="text-sm font-medium text-gray-700">{tipo}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-3 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  Enviando...
                </>
              ) : (
                <>
                  <Save size={24} />
                  Enviar Atualização
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </ErrorBoundary>
  );
}
