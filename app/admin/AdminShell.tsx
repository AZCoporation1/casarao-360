"use client";

import { useState } from 'react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { Menu, X } from 'lucide-react';

export function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-preto-carvao">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <AdminSidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 w-64 animate-in slide-in-from-left duration-300">
            <AdminSidebar />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Topbar */}
        <header className="md:hidden flex h-16 shrink-0 items-center justify-between border-b border-marrom-madeira/30 bg-preto-carvao px-4">
          <span className="font-bold text-creme-gastronomico tracking-wider">O CASARÃO</span>
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
