"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, User, Calendar, Settings, LogOut } from 'lucide-react';
import { signOutCustomerAction } from '@/lib/actions/customer-auth.actions';

export default function MinhaContaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const links = [
    { href: '/minha-conta', label: 'Minha Conta', icon: User },
    { href: '/minha-conta/reservas', label: 'Minhas Reservas', icon: Calendar },
    { href: '/minha-conta/dados', label: 'Meus Dados', icon: Settings },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-preto-carvao border-r border-marrom-madeira/30 text-creme-gastronomico p-4">
      <div className="mb-8 px-2">
        <h2 className="text-xl font-bold text-ambar-premium tracking-wider">CASARÃO 360</h2>
        <p className="text-xs text-creme-gastronomico/50">Área do Cliente</p>
      </div>

      <nav className="flex-1 space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href || (link.href !== '/minha-conta' && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                isActive 
                  ? 'bg-ambar-premium/10 text-ambar-premium font-medium' 
                  : 'hover:bg-marrom-madeira/20 text-creme-gastronomico/80 hover:text-creme-gastronomico'
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon className="w-5 h-5" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-4 border-t border-marrom-madeira/30">
        <button
          onClick={() => signOutCustomerAction()}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-md text-vermelho-brasa hover:bg-vermelho-brasa/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-preto-carvao">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 w-64 animate-in slide-in-from-left duration-300">
            <SidebarContent />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Topbar */}
        <header className="md:hidden flex h-16 shrink-0 items-center justify-between border-b border-marrom-madeira/30 bg-preto-carvao px-4">
          <span className="font-bold text-creme-gastronomico tracking-wider">MINHA CONTA</span>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md text-creme-gastronomico hover:bg-marrom-madeira/20 transition-colors"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-black/20">
          {children}
        </main>
      </div>
    </div>
  );
}
