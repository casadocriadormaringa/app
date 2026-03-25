'use client';

import React, { useState } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import { CustomerData } from './CustomerForm';

interface ImportModalProps {
  onImport: (data: Omit<CustomerData, 'id'>[]) => Promise<void>;
  onClose: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ onImport, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setPreview(results.data.slice(0, 5));
          setError(null);
        },
        error: (err) => {
          setError('Erro ao ler o arquivo CSV: ' + err.message);
        }
      });
    }
  };

  const handleProcess = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const customers: Omit<CustomerData, 'id'>[] = results.data.map((row: any) => ({
            codigo: String(row.codigo || row.Codigo || ''),
            nome: String(row.nome || row.Nome || ''),
            endereco: String(row.endereco || row.Endereco || ''),
            telefone: String(row.telefone || row.Telefone || ''),
            proximo_banho: String(row.proximo_banho || row['Proximo banho'] || ''),
            data_vencimento: String(row.data_vencimento || row['DATA DE VENCIMENTO'] || ''),
            valor_pacote: Number(row.valor_pacote || row['VALOR DO PACOTE'] || 0),
            tipo_pacote: (row.tipo_pacote || row['TIPO DE PACOTE']) === 'Quinzenal' ? 'Quinzenal' : 'Mensal',
            dia_semana: String(row.dia_semana || row['DIA DA SEMANA'] || 'Segunda'),
            valor_banho_avulso: Number(row.valor_banho_avulso || 0),
            banho_e_tosa: (row.banho_e_tosa || row['CLIENTE DE BANHO E TOSA']) === 'Sim' ? 'Sim' : 'Não',
            createdAt: new Date().toISOString(),
          }));

          // Basic validation: must have name and code
          const validCustomers = customers.filter(c => c.nome && c.codigo);
          
          if (validCustomers.length === 0) {
            throw new Error('Nenhum cliente válido encontrado. Verifique se as colunas "nome" e "codigo" existem.');
          }

          await onImport(validCustomers);
          onClose();
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-xl text-green-600">
              <Upload size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Importar Clientes (CSV)</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
            <AlertCircle className="text-blue-500 shrink-0" size={20} />
            <div className="text-sm text-blue-700">
              <p className="font-bold mb-1">Como preparar sua planilha:</p>
              <p>No Google Planilhas, vá em <b>Arquivo {'>'} Fazer download {'>'} Valores separados por vírgulas (.csv)</b>.</p>
              <p className="mt-2">Certifique-se de que a primeira linha tenha os nomes das colunas (ex: nome, codigo, telefone, etc).</p>
            </div>
          </div>

          {!file ? (
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-200 rounded-3xl cursor-pointer hover:bg-gray-50 transition-all group">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <div className="p-4 bg-gray-100 rounded-2xl text-gray-400 group-hover:scale-110 transition-transform mb-3">
                  <FileText size={32} />
                </div>
                <p className="mb-2 text-sm text-gray-500 font-medium">Clique para selecionar ou arraste o arquivo CSV</p>
                <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">Apenas arquivos .csv</p>
              </div>
              <input type="file" className="hidden" accept=".csv" onChange={handleFileChange} />
            </label>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <FileText className="text-indigo-500" size={24} />
                  <div>
                    <p className="font-bold text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setFile(null); setPreview([]); }}
                  className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-1 rounded-lg transition-colors"
                >
                  Remover
                </button>
              </div>

              {preview.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Prévia dos dados:</p>
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-black">
                        <tr>
                          {Object.keys(preview[0]).map(key => (
                            <th key={key} className="px-4 py-2">{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {preview.map((row, i) => (
                          <tr key={i}>
                            {Object.values(row).map((val: any, j) => (
                              <th key={j} className="px-4 py-2 font-normal text-gray-600 truncate max-w-[150px]">{val}</th>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex gap-3 text-red-700 text-sm">
              <AlertCircle size={20} className="shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-4 rounded-2xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-all"
            >
              Cancelar
            </button>
            <button
              disabled={!file || loading}
              onClick={handleProcess}
              className="flex-1 px-6 py-4 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Importando...
                </>
              ) : (
                <>
                  <CheckCircle2 size={20} />
                  Confirmar Importação
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
