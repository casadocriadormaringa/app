'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { 
  Bell,
  Users, 
  Dog, 
  FileText, 
  Package, 
  ShoppingCart, 
  Truck as DeliveryIcon, 
  Lock, 
  TrendingUp,
  Menu,
  X,
  ChevronRight,
  Settings,
  Calendar as CalendarIcon
} from 'lucide-react';

export const Navbar = () => {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [companyName, setCompanyName] = useState('Casa do Criador Maringá');

  useEffect(() => {
    setMounted(true);
    const unsubConfig = onSnapshot(doc(db, 'config', 'empresa'), (docSnap) => {
      if (docSnap.exists()) {
        setCompanyName(docSnap.data().nomeEmpresa || 'Casa do Criador Maringá');
      }
    });
    return () => unsubConfig();
  }, []);

  const mainNavItems = [
    { href: '/', label: 'Clientes', icon: Users, color: 'indigo' },
    { href: '/vendas', label: 'Vendas (PDV)', icon: ShoppingCart, color: 'violet' },
    { href: '/entregas', label: 'Entregas', icon: DeliveryIcon, color: 'blue' },
    { href: '/banhos-pets', label: 'Banhos Pets', icon: Dog, color: 'amber' },
    { href: '/pedidos', label: 'Cobranças', icon: FileText, color: 'blue' },
  ];

  const sideNavItems = [
    { href: '/avisos', label: 'Avisos', icon: Bell, color: 'rose' },
    { href: '/agenda', label: 'Agenda', icon: CalendarIcon, color: 'indigo' },
    { href: '/banhos', label: 'Banhos', icon: Dog, color: 'amber' },
    { href: '/produtos', label: 'Produtos', icon: Package, color: 'emerald' },
    { href: '/relatorios', label: 'Relatórios', icon: TrendingUp, color: 'emerald' },
    { href: '/admin/dados-atualizados', label: 'Dados Atualizados', icon: Users, color: 'rose' },
    { href: '/gerencial', label: 'Gerencial', icon: Settings, color: 'blue' },
    { href: '/cadeado', label: 'Cadeado', icon: Lock, color: 'indigo' },
  ];

  return (
    <>
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <button 
            onClick={() => setIsMenuOpen(true)}
            className="mr-4 p-3 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-all flex items-center gap-2 font-bold"
          >
            <Menu size={24} />
            <span className="hidden sm:inline">Mais</span>
          </button>

          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar py-2 flex-1">
            {mainNavItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              
              const colorMap: Record<string, { active: string, inactive: string }> = {
                indigo: {
                  active: 'bg-indigo-600 text-white shadow-indigo-100',
                  inactive: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                },
                violet: {
                  active: 'bg-violet-100 text-black shadow-violet-100 border-2 border-violet-600',
                  inactive: 'bg-violet-50 text-violet-600 hover:bg-violet-100'
                },
                blue: {
                  active: 'bg-blue-600 text-white shadow-blue-100',
                  inactive: 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                },
                amber: {
                  active: 'bg-amber-600 text-white shadow-amber-100',
                  inactive: 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                },
                rose: {
                  active: 'bg-rose-600 text-white shadow-rose-100',
                  inactive: 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                },
                emerald: {
                  active: 'bg-emerald-600 text-white shadow-emerald-100',
                  inactive: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                }
              };

              const classes = colorMap[item.color] || colorMap.indigo;
              
              if (!mounted) return null;

              return (
                <Link 
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${
                    isActive 
                      ? `${classes.active} shadow-lg` 
                      : classes.inactive
                  }`}
                >
                  <Icon size={20} />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Version Label below header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1 flex justify-end">
        <span className="text-[10px] font-black text-gray-300 uppercase tracking-tighter">
          Versão 11.1
        </span>
      </div>

      {/* Side Menu Overlay */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm transition-opacity"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Side Menu Drawer */}
      <div className={`fixed top-0 left-0 h-full w-80 bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black text-gray-900">Menu</h2>
            <button 
              onClick={() => setIsMenuOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X size={24} className="text-gray-500" />
            </button>
          </div>

          <div className="space-y-3 flex-1">
            {sideNavItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              const colorMap: Record<string, { active: string, inactive: string }> = {
                indigo: {
                  active: 'bg-indigo-600 text-white shadow-indigo-100',
                  inactive: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                },
                violet: {
                  active: 'bg-violet-100 text-black shadow-violet-100 border-2 border-violet-600',
                  inactive: 'bg-violet-50 text-violet-600 hover:bg-violet-100'
                },
                blue: {
                  active: 'bg-blue-600 text-white shadow-blue-100',
                  inactive: 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                },
                amber: {
                  active: 'bg-amber-600 text-white shadow-amber-100',
                  inactive: 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                },
                rose: {
                  active: 'bg-rose-600 text-white shadow-rose-100',
                  inactive: 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                },
                emerald: {
                  active: 'bg-emerald-600 text-white shadow-emerald-100',
                  inactive: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                }
              };

              const classes = colorMap[item.color] || colorMap.indigo;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center justify-between p-4 rounded-2xl font-bold transition-all ${
                    isActive
                      ? `${classes.active} shadow-lg`
                      : classes.inactive
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={22} />
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight size={18} className={isActive ? 'text-white/70' : 'text-gray-400'} />
                </Link>
              );
            })}
          </div>

          <div className="pt-6 border-t border-gray-100">
            <p className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
              {companyName}
            </p>
            <p className="text-center text-[10px] font-black text-gray-300 mt-1 uppercase tracking-tighter">
              Versão 11.1
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
