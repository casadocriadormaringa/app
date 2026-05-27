'use client';

import React, { useEffect, useState } from 'react';
import { Printer, RefreshCw, Undo2, LayoutGrid, ToggleLeft, ToggleRight, Check } from 'lucide-react';
import Link from 'next/link';

interface ProductData {
  id?: string;
  codigo: string;
  nome: string;
  tipo: 'PRODUTO' | 'SERVICO';
  unidade: string;
  estoqueAtual: number;
  estoqueCritico: number;
  precoCusto?: number;
  precoVenda?: number;
  margemLucro?: number;
  codigoBarras?: string;
  fornecedorId?: string;
  fornecedorNome?: string;
  linkCatalogo?: string;
}

type LabelTheme = 'retail' | 'modern' | 'mono';

export default function DirectPrintPage() {
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [theme, setTheme] = useState<LabelTheme>('retail');
  const [showMargins, setShowMargins] = useState<boolean>(true);

  useEffect(() => {
    setMounted(true);
    try {
      const storedProducts = localStorage.getItem('selectedProductsForLabels');
      const storedTheme = localStorage.getItem('labelTheme') as LabelTheme;
      const storedMargins = localStorage.getItem('labelShowMargins');

      if (storedProducts) {
        setProducts(JSON.parse(storedProducts));
      }
      if (storedTheme) {
        setTheme(storedTheme);
      }
      if (storedMargins !== null) {
        setShowMargins(storedMargins === 'true');
      }
    } catch (err) {
      console.error('Erro ao ler do localStorage:', err);
    }
  }, []);

  // Auto trigger browser print as soon as items load to provide instant printing UX
  useEffect(() => {
    if (mounted && products.length > 0) {
      const timer = setTimeout(() => {
        window.print();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [mounted, products]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white gap-3 font-sans">
        <RefreshCw className="animate-spin text-indigo-500" size={32} />
        <p className="text-sm font-semibold text-gray-300">Iniciando...</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white gap-4 p-6 text-center font-sans">
        <div className="bg-slate-800 p-4 rounded-full text-indigo-400">
          <LayoutGrid size={40} />
        </div>
        <div className="max-w-md">
          <h1 className="text-xl font-bold">Nenhum produto selecionado</h1>
          <p className="text-sm text-gray-400 mt-2">
            Por favor, volte para a página de Produtos, utilize as caixas de seleção ao lado de cada item e clique em "Gerar Etiquetas" para selecionar o que deseja imprimir.
          </p>
        </div>
        <Link
          href="/XJ92K4BT/produtos"
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-lg active:scale-95 inline-flex items-center gap-2"
        >
          <Undo2 size={16} />
          Voltar para Produtos
        </Link>
      </div>
    );
  }

  // Divide selected products into chunks of 36 (A4 Grid of 4x9)
  const CHUNK_SIZE = 36;
  const pages: ProductData[][] = [];
  for (let i = 0; i < products.length; i += CHUNK_SIZE) {
    pages.push(products.slice(i, i + CHUNK_SIZE));
  }

  return (
    <div className="min-h-screen bg-slate-950 print:bg-white text-white print:text-black">
      
      {/* Top Floating Control Bar (Hidden when printing) */}
      <div className="sticky top-0 left-0 right-0 bg-[#0F172A] border-b border-slate-800 px-4 py-3 z-50 print:hidden shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-650 p-2 rounded-xl text-white">
            <Printer size={20} />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-black text-white">Página de Impressão Direta</h1>
            <p className="text-[11px] text-gray-400 font-medium">
              Layout A4 Inteligente • {products.length} {products.length === 1 ? 'Etiqueta' : 'Etiquetas'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Theme Selector */}
          <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 font-bold">
            <button
              onClick={() => setTheme('retail')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                theme === 'retail' ? 'bg-red-650 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Varejo Vermelho
            </button>
            <button
              onClick={() => setTheme('modern')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                theme === 'modern' ? 'bg-indigo-655 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Moderno Azul
            </button>
            <button
              onClick={() => setTheme('mono')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                theme === 'mono' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-white'
              }`}
            >
              Preto/Branco
            </button>
          </div>

          {/* Guidelines */}
          <button
            onClick={() => setShowMargins(!showMargins)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-750 rounded-xl font-bold border border-slate-750 transition-all text-gray-300"
          >
            {showMargins ? <ToggleRight className="text-emerald-500" size={18} /> : <ToggleLeft className="text-gray-500" size={18} />}
            Linhas de Corte
          </button>

          {/* Trigger Print Modal Again */}
          <button
            onClick={() => window.print()}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-4 py-2 rounded-xl transition-all shadow-lg flex items-center gap-1.5"
          >
            <Printer size={15} />
            Imprimir Etiquetas
          </button>

          {/* Close Tab / Go Back */}
          <Link
            href="/XJ92K4BT/produtos"
            className="px-3 py-2 bg-slate-800 hover:bg-slate-755 rounded-xl font-bold text-gray-300 transition-all inline-flex items-center gap-1.5"
          >
            <Undo2 size={14} />
            Voltar
          </Link>
        </div>
      </div>

      {/* Sheet of labels rendering with high-accuracy millimeter metrics */}
      <div className="p-4 sm:p-8 flex flex-col gap-8 items-center bg-slate-900 print:bg-white print:p-0">
          <div className="max-w-[210mm] w-full bg-indigo-950/40 border border-indigo-900/40 text-xs text-indigo-200 rounded-2xl p-4 flex gap-3 print:hidden">
          <span className="text-base">💡</span>
          <div>
            <p className="font-bold text-white">Pronto para Impressão!</p>
            <p className="mt-0.5">
              O assistente abriu a tela nativa de impressão do navegador automaticamente. Se ela foi fechada, clique no botão azul <strong>"Imprimir Etiquetas"</strong> acima.
            </p>
            <p className="mt-0.5 text-indigo-300">
              Dica Pro: Nas configurações de impressão do navegador, defina <strong>Margens como "Nenhum" (None)</strong> e ative <strong>"Gráficos de fundo" (Background graphics)</strong> para fidelidade de tamanho e cor.
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
              padding: '13.5mm 5mm',
              boxSizing: 'border-box',
              pageBreakAfter: 'always',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gridTemplateRows: 'repeat(9, 1fr)',
              alignItems: 'stretch',
              justifyItems: 'stretch'
            }}
          >
            {chunk.map((product) => {
              return (
                <div
                  key={product.id}
                  className="relative flex flex-col justify-between overflow-hidden bg-white p-2 text-black"
                  style={{
                    width: '50mm',
                    height: '30mm',
                    border: showMargins ? '1px dashed #d1d5db' : '1px solid transparent',
                    boxSizing: 'border-box',
                  }}
                >
                  {/* Brand/Store Indicator & Code */}
                  <div className="flex justify-between items-center text-[8.5px] uppercase font-bold text-gray-500 pb-0.5 border-b border-gray-100">
                    <span className="truncate max-w-[60px] tracking-wide">PRODUTO</span>
                    <span className="shrink-0 bg-gray-150 text-gray-650 px-1 py-0.5 rounded leading-none text-[7.5px] font-mono font-black tracking-wider">
                      COD: {product.codigo}
                    </span>
                  </div>

                  {/* Product Name */}
                  <div className="flex-1 my-0.5 flex flex-col justify-center">
                    <h4 className="text-[10px] sm:text-[10.5px] font-black leading-[1.2] text-gray-900 tracking-tight line-clamp-2 uppercase">
                      {product.nome}
                    </h4>
                    {product.codigoBarras && (
                      <span className="text-[6.5px] text-gray-450 font-mono mt-0.5 font-bold tracking-wide leading-none">
                        EAN: {product.codigoBarras}
                      </span>
                    )}
                  </div>

                  {/* Pricing Tag container */}
                  <div className="flex items-end justify-between pt-0.5 border-t border-gray-100 mt-auto">
                    <div className="text-[6.5px] text-gray-400 italic leading-tight self-end pb-0.5 font-bold">
                      À vista
                    </div>
                    
                    <div className="text-right flex items-baseline gap-0.5 shrink-0 select-none">
                      <span className={`text-[8.5px] font-black uppercase tracking-tight ${
                        theme === 'retail' ? 'text-red-655' : theme === 'modern' ? 'text-indigo-600' : 'text-black'
                      }`}>
                        R$
                      </span>
                      
                      {/* Display the main value large and decimals small */}
                      {(() => {
                        const val = product.precoVenda || 0;
                        const parts = val.toFixed(2).split('.');
                        return (
                          <div className="inline-flex items-baseline font-black leading-none shrink-0 select-none">
                            <span className={`text-[21px] font-extrabold tracking-tighter ${
                              theme === 'retail' ? 'text-red-655' : theme === 'modern' ? 'text-indigo-650' : 'text-black'
                            }`}>
                              {parts[0]}
                            </span>
                            <span className={`text-[12.5px] font-extrabold tracking-tighter ml-0.5 ${
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
        ))}
      </div>

      {/* Global CSS to target native browser page rendering for physical alignment */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .a4-page, .a4-page * {
            visibility: visible !important;
          }
          .a4-page {
            position: relative !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 8mm 10mm !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
            width: 210mm !important;
            height: 297mm !important;
            background: white !important;
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
}
