'use client';

import React, { useState } from 'react';
import { X, Printer, Check, Info, RefreshCw, Palette } from 'lucide-react';
import { ProductData } from './ProductForm';

interface ShelfLabelsPrintProps {
  selectedProducts: ProductData[];
  onClose: () => void;
  onPrintSuccess: () => void;
}

type LabelTheme = 'retail' | 'modern' | 'mono';

export const ShelfLabelsPrint: React.FC<ShelfLabelsPrintProps> = ({
  selectedProducts,
  onClose,
  onPrintSuccess
}) => {
  const [theme, setTheme] = useState<LabelTheme>('retail');
  const [showMargins, setShowMargins] = useState<boolean>(true);

  const handlePrint = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      window.print();
      // Clear selections on parent state as requested
      setTimeout(() => {
        onPrintSuccess();
      }, 500);
    } catch (err) {
      console.error('Erro ao imprimir:', err);
      alert('Para imprimir, por favor abra o aplicativo em uma nova aba do navegador.');
    }
  };

  // Divide selected products into chunks of 24 (A4 Grid of 3x8)
  const CHUNK_SIZE = 24;
  const pages: ProductData[][] = [];
  for (let i = 0; i < selectedProducts.length; i += CHUNK_SIZE) {
    pages.push(selectedProducts.slice(i, i + CHUNK_SIZE));
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-gray-900 w-full max-w-6xl max-h-[98vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col text-white">
        
        {/* Print Header Controls (Hidden during actual print) */}
        <div className="p-4 sm:p-6 border-b border-gray-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gray-900 sticky top-0 z-10 print:hidden">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white">
              <Printer size={24} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white">Gerar Etiquetas de Gôndola</h2>
              <p className="text-xs text-gray-400 font-medium mt-0.5">
                Layout A4 inteligente (3x8 - 24 etiquetas por folha). Altura: 34mm | Largura: 64mm (Padrão Canaletas).
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Style Selector */}
            <div className="flex bg-gray-800 p-1 rounded-xl border border-gray-700 text-xs font-bold mr-1">
              <button
                onClick={() => setTheme('retail')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  theme === 'retail' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
                title="Vermelho Varejo clássico"
              >
                <Palette size={12} />
                Varejo Vermelho
              </button>
              <button
                onClick={() => setTheme('modern')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  theme === 'modern' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
                title="Azul Minimalista moderno"
              >
                <Palette size={12} />
                Moderno Azul
              </button>
              <button
                onClick={() => setTheme('mono')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  theme === 'mono' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-white'
                }`}
                title="Sem cor de tinta (Preto e branco)"
              >
                <Palette size={12} />
                Preto/Branco
              </button>
            </div>

            {/* Toggle guides for cutting */}
            <button
              onClick={() => setShowMargins(!showMargins)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                showMargins 
                  ? 'bg-gray-850 hover:bg-gray-850 text-emerald-450 border-emerald-500/30' 
                  : 'bg-gray-800 hover:bg-gray-750 text-gray-400 border-gray-700'
              }`}
            >
              Linhas de Corte: {showMargins ? 'Sim' : 'Não'}
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-indigo-500 transition-all active:scale-95 shadow-lg shadow-indigo-500/20 text-sm"
            >
              <Printer size={18} />
              Imprimir Etiquetas
            </button>
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-xl transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Area Wrapper (Gray preview container on screen, standard page size on print) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-gray-950 flex flex-col gap-6 print:bg-white print:p-0 print:overflow-visible" id="printable-labels-area">
          <div className="print-hidden max-w-3xl mx-auto bg-gray-900 border border-gray-800 rounded-2xl p-4 flex gap-3 text-xs text-gray-300">
            <Info size={18} className="text-gray-450 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white">Pronto para Recortar e Colocar na Gôndola!</p>
              <p className="mt-1">
                As etiquetas foram divididas em páginas A4 com bordas tracejadas para fácil corte com tesoura ou estilete.
                O tamanho foi configurado para caber perfeitamente nas canaletas de preço de gôndolas e prateleiras.
              </p>
              <p className="mt-1 text-yellow-400 font-medium">
                Após clicar em "Imprimir Etiquetas", a listagem de produtos selecionados desmarcará automaticamente.
              </p>
            </div>
          </div>

          {pages.map((chunk, pageIdx) => (
            <div 
              key={pageIdx} 
              className="a4-page bg-white text-black shadow-2xl relative print:shadow-none print:border-0 print:m-0"
              style={{
                width: '210mm',
                height: '297mm',
                padding: '8mm 10mm',
                margin: '0 auto',
                boxSizing: 'border-box',
                pageBreakAfter: 'always'
              }}
            >
              {/* Labels Grid */}
              <div className="grid grid-cols-3 w-full h-full text-black">
                {chunk.map((product) => {
                  return (
                    <div
                      key={product.id}
                      className={`relative flex flex-col justify-between overflow-hidden bg-white p-2.5 transition-all`}
                      style={{
                        width: '63mm',
                        height: '34mm',
                        border: showMargins ? '1px dashed #d1d5db' : '1px solid transparent',
                        boxSizing: 'border-box'
                      }}
                    >
                      {/* Brand/Store Indicator & Code */}
                      <div className="flex justify-between items-center text-[10px] uppercase font-bold text-gray-500 pb-1 border-b border-gray-100">
                        <span className="truncate max-w-[80px]">PRODUTO</span>
                        <span className="shrink-0 bg-gray-100 text-gray-600 px-1 py-0.5 rounded leading-none text-[8px] font-mono tracking-wider">
                          COD: {product.codigo}
                        </span>
                      </div>

                      {/* Product Name */}
                      <div className="flex-1 my-1 flex flex-col justify-center">
                        <h4 className="text-xs sm:text-[13px] font-black leading-[1.2] text-gray-900 tracking-tight line-clamp-2">
                          {product.nome}
                        </h4>
                        {product.codigoBarras && (
                          <span className="text-[7.5px] text-gray-450 font-mono mt-0.5">
                            EAN: {product.codigoBarras}
                          </span>
                        )}
                      </div>

                      {/* Pricing Tag container */}
                      <div className="flex items-end justify-between pt-1 border-t border-gray-50 mt-auto">
                        <div className="text-[7px] text-gray-400 italic leading-tight self-end pb-0.5 font-medium">
                          Preço final à vista
                        </div>
                        
                        <div className="text-right flex items-baseline gap-0.5 shrink-0 select-none">
                          <span className={`text-[10px] font-black uppercase ${
                            theme === 'retail' ? 'text-red-650' : theme === 'modern' ? 'text-indigo-600' : 'text-black'
                          }`}>
                            R$
                          </span>
                          
                          {/* Display the main value large and decimals small */}
                          {(() => {
                            const val = product.precoVenda || 0;
                            const parts = val.toFixed(2).split('.');
                            return (
                              <div className="inline-flex items-baseline font-black leading-none shrink-0 select-none">
                                <span className={`text-2xl sm:text-[27px] font-extrabold tracking-tighter ${
                                  theme === 'retail' ? 'text-red-655' : theme === 'modern' ? 'text-indigo-650' : 'text-black'
                                }`}>
                                  {parts[0]}
                                </span>
                                <span className={`text-sm sm:text-[15px] font-extrabold tracking-tighter ml-0.5 ${
                                  theme === 'retail' ? 'text-red-655' : theme === 'modern' ? 'text-indigo-650' : 'text-black'
                                }`}>
                                  ,{parts[1]}
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Global CSS to target native browser page rendering for physical alignment */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-labels-area, #printable-labels-area * {
            visibility: visible !important;
          }
          #printable-labels-area {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            z-index: 99999 !important;
          }
          .a4-page {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
            width: 210mm !important;
            height: 297mm !important;
          }
          .print-hidden {
            display: none !important;
          }
        }
        @page {
          size: A4 portrait;
          margin: 0;
        }
      `}</style>
    </div>
  );
};
