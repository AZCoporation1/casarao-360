"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Calendar, Map, Users, Lightbulb, ClipboardList, TrendingUp, LogOut, MessageCircle } from 'lucide-react';
import { logoutAction } from '@/lib/actions/auth.actions';
import { isMockMode } from '@/lib/data/data-source';
import Image from 'next/image';

const navigation = [
  { name: 'Painel Executivo', href: '/admin', icon: LayoutDashboard },
  // mockOnly: páginas ainda baseadas em dados demo — ocultas em produção
  // (modo supabase) até serem reconstruídas sobre dados reais (pós-Gate 1)
  { name: 'Eventos', href: '/admin/eventos', icon: Calendar, mockOnly: true },
  { name: 'Mapa Operacional', href: '/admin/mapa', icon: Map },
  { name: 'Central de Reservas', href: '/admin/reservas', icon: Users },
  { name: 'Reservas Personalizadas', href: '/admin/leads', icon: MessageCircle },
  { name: 'Assistente (IA)', href: '/admin/insights', icon: Lightbulb, mockOnly: true },
  { name: 'Base Operacional', href: '/admin/operacao', icon: ClipboardList, mockOnly: true },
  { name: 'Visão de Crescimento', href: '/admin/relatorios', icon: TrendingUp, mockOnly: true },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const visibleNavigation = navigation.filter(item => !item.mockOnly || isMockMode());

  return (
    <div className="flex h-full w-64 flex-col bg-preto-carvao border-r border-marrom-madeira/30">
      <div className="flex h-20 shrink-0 items-center px-6 border-b border-marrom-madeira/30">
        <Link href="/admin" className="flex items-center gap-3">
          <Image 
            src="/logo-casarao.jpg" 
            alt="O Casarão Logo" 
            width={40} 
            height={40} 
            className="rounded-full object-cover border border-marrom-madeira"
          />
          <div className="flex flex-col">
            <span className="font-bold text-base text-creme-gastronomico leading-none tracking-wider">O CASARÃO</span>
            <span className="text-[9px] text-ambar-premium tracking-[0.2em] uppercase mt-1">Admin</span>
          </div>
        </Link>
      </div>
      
      <div className="flex flex-1 flex-col overflow-y-auto px-4 py-6">
        <nav className="flex-1 space-y-1">
          {visibleNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  isActive 
                    ? 'bg-marrom-madeira/20 text-laranja-fogo' 
                    : 'text-creme-gastronomico/70 hover:bg-marrom-madeira/10 hover:text-creme-gastronomico',
                  'group flex items-center px-3 py-3 text-sm font-medium rounded-md transition-colors'
                )}
              >
                <item.icon
                  className={cn(
                    isActive ? 'text-laranja-fogo' : 'text-creme-gastronomico/50 group-hover:text-creme-gastronomico',
                    'mr-3 flex-shrink-0 h-5 w-5 transition-colors'
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-marrom-madeira/30">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-laranja-fogo/20 flex items-center justify-center">
              <span className="text-laranja-fogo font-bold text-xs">DA</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-creme-gastronomico">Davi</span>
              <span className="text-xs text-creme-gastronomico/50">Diretoria Executiva</span>
            </div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              title="Sair do painel"
              className="p-2 rounded-lg text-creme-gastronomico/40 hover:text-vermelho-brasa hover:bg-vermelho-brasa/10 transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
