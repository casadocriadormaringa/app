'use client';

import React from 'react';
import { X, Printer, Download, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { PurchaseData } from './PurchaseModal';

interface CompanyConfig {
  nomeEmpresa?: string;
  cnpjCpf?: string;
  telefoneEmpresa?: string;
  enderecoRua?: string;
  enderecoNumero?: string;
  enderecoBairro?: string;
  enderecoCidade?: string;
  enderecoEstado?: string;
  enderecoCep?: string;
}

interface PurchaseOrderPrintProps {
  purchase: PurchaseData;
  companyConfig: CompanyConfig;
  onClose: () => void;
}

export const PurchaseOrderPrint: React.FC<PurchaseOrderPrintProps> = ({ 
  purchase, 
  companyConfig, 
  onClose 
}) => {
  const handlePrint = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      window.print();
    } catch (err) {
      console.error('Erro ao imprimir:', err);
      alert('Para imprimir, por favor abra o aplicativo em uma nova aba do navegador.');
    }
  };

  const totalOrder = purchase.itens.reduce((acc, item) => acc + (item.quantidadePedida * (item.precoCusto || 0)), 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-6xl max-h-[98vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header - Non-printable */}
        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10 print-hidden">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
              <Printer size={24} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-gray-900">Pedido de Compra</h2>
              <p className="text-xs sm:text-sm text-gray-500 font-medium">
                Dica: Se o botão não abrir a impressão, abra o app em uma nova aba.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100"
            >
              <Printer size={18} />
              Imprimir / PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content - Printable Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-12 bg-gray-100 print:bg-white print:p-0 print:overflow-visible" id="printable-order">
          <div className="max-w-[210mm] mx-auto bg-white shadow-xl border border-gray-200 p-6 sm:p-16 print:shadow-none print:border-0 print:p-0">
            {/* Company Header */}
            <div className="flex justify-between items-start mb-12 pb-8 border-b-2 border-gray-900">
              <div className="space-y-1">
                <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                  {companyConfig.nomeEmpresa || 'NOME DA EMPRESA'}
                </h1>
                <div className="text-sm text-gray-600 font-medium">
                  {companyConfig.enderecoRua && (
                    <p>{companyConfig.enderecoRua}, {companyConfig.enderecoNumero} - {companyConfig.enderecoBairro}</p>
                  )}
                  <p>{companyConfig.enderecoCidade} - {companyConfig.enderecoEstado} | CEP: {companyConfig.enderecoCep}</p>
                  <p>Telefone: {companyConfig.telefoneEmpresa}</p>
                  {companyConfig.cnpjCpf && <p>CNPJ/CPF: {companyConfig.cnpjCpf}</p>}
                </div>
              </div>
              <div className="text-right">
                <div className="bg-gray-900 text-white px-4 py-2 rounded-lg inline-block mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Pedido ID</p>
                  <p className="text-lg font-black leading-none">#{purchase.id?.slice(-8).toUpperCase()}</p>
                </div>
                <p className="text-sm font-bold text-gray-900">
                  Data: {format(new Date(purchase.createdAt), 'dd/MM/yyyy')}
                </p>
              </div>
            </div>

            {/* Supplier Info */}
            <div className="mb-10">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Fornecedor</h3>
              <p className="text-lg font-bold text-gray-900">{purchase.fornecedorNome || 'Não informado'}</p>
            </div>

            {/* Items Table */}
            <div className="mb-12">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-900">
                    <th className="text-left py-3 text-xs font-black uppercase tracking-widest text-gray-900">Cód</th>
                    <th className="text-left py-3 text-xs font-black uppercase tracking-widest text-gray-900">Produto</th>
                    <th className="text-center py-3 text-xs font-black uppercase tracking-widest text-gray-900">Qtd</th>
                    <th className="text-right py-3 text-xs font-black uppercase tracking-widest text-gray-900">V. Unit</th>
                    <th className="text-right py-3 text-xs font-black uppercase tracking-widest text-gray-900">V. Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {purchase.itens.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-4 text-sm font-medium text-gray-500">#{item.codigo}</td>
                      <td className="py-4 text-sm font-bold text-gray-900">{item.nome}</td>
                      <td className="py-4 text-sm font-bold text-gray-900 text-center">{item.quantidadePedida}</td>
                      <td className="py-4 text-sm font-medium text-gray-900 text-right">
                        R$ {(item.precoCusto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 text-sm font-black text-gray-900 text-right">
                        R$ {(item.quantidadePedida * (item.precoCusto || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end pt-8 border-t-2 border-gray-900">
              <div className="w-64 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-500 uppercase">Subtotal</span>
                  <span className="text-sm font-bold text-gray-900">R$ {totalOrder.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <span className="text-lg font-black text-gray-900 uppercase">Total Geral</span>
                  <span className="text-2xl font-black text-indigo-600">R$ {totalOrder.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-20 pt-8 border-t border-gray-100 text-center">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Gerado em {format(new Date(), 'dd/MM/yyyy HH:mm')} • Sistema de Gestão {companyConfig.nomeEmpresa || ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-order, #printable-order * {
            visibility: visible !important;
          }
          #printable-order {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            z-index: 9999 !important;
          }
          .print-hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
