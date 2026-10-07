"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Menu, X, User as UserIcon } from 'lucide-react';
import { getNavSessionAction } from '@/lib/actions/customer-auth.actions';
import { isMockMode } from '@/lib/data/data-source';

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(() => !isMockMode());

  // Sessão resolvida NO SERVIDOR (cookies) via server action — o Navbar
  // remonta a cada navegação, então o estado acompanha login/logout.
  useEffect(() => {
    let active = true;
    if (isMockMode()) {
      return;
    }

    getNavSessionAction()
      .then(({ isAuthenticated, isAdmin }) => {
        if (!active) return;
        setUser(isAuthenticated);
        setIsAdmin(isAdmin);
        setIsLoading(false);
      })
      .catch(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-marrom-madeira/20 bg-preto-carvao/80 backdrop-blur-md">
      <div className="w-full max-w-7xl mx-auto flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
          <Image 
            src="/logo-casarao.jpg" 
            alt="O Casarão Logo" 
            width={48} 
            height={48} 
            className="rounded-full object-cover border border-marrom-madeira"
          />
          <div className="flex flex-col">
            <span className="font-bold text-lg text-creme-gastronomico leading-none tracking-wider">O CASARÃO</span>
            <span className="text-[10px] text-ambar-premium tracking-[0.2em] uppercase mt-1">Eventos &amp; Gastronomia</span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <Link href="/" className="text-creme-gastronomico hover:text-laranja-fogo transition-colors">Início</Link>
          <Link href="/eventos" className="text-creme-gastronomico hover:text-laranja-fogo transition-colors">Programação</Link>
          {!isLoading && user && !isAdmin ? (
            <Link href="/minha-conta/reservas" className="text-creme-gastronomico hover:text-laranja-fogo transition-colors">Minhas Reservas</Link>
          ) : (
            <Link href="/eventos" className="text-creme-gastronomico hover:text-laranja-fogo transition-colors">Reservas</Link>
          )}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          {!isLoading && user ? (
            <>
              {isAdmin && (
                <Button variant="ghost" asChild>
                  <Link href="/admin">Painel Admin</Link>
                </Button>
              )}
              <Button variant="outline" className="border-marrom-madeira text-creme-gastronomico hover:bg-marrom-madeira/20" asChild>
                <Link href="/minha-conta" className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4" />
                  Minha Conta
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/admin">Acesso Restrito</Link>
              </Button>
              <Button variant="outline" className="border-marrom-madeira text-creme-gastronomico hover:bg-marrom-madeira/20" asChild>
                <Link href="/entrar">Entrar</Link>
              </Button>
              <Button variant="premium" asChild>
                <Link href="/eventos">Garanta sua Experiência</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 rounded-md text-creme-gastronomico hover:bg-marrom-madeira/20 transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t border-marrom-madeira/20 bg-preto-carvao/95 backdrop-blur-md animate-in slide-in-from-top duration-200">
          <div className="flex flex-col gap-1 p-4">
            <Link href="/" className="text-creme-gastronomico hover:text-laranja-fogo py-3 px-4 rounded-md hover:bg-marrom-madeira/10 transition-colors font-medium" onClick={() => setMenuOpen(false)}>Início</Link>
            <Link href="/eventos" className="text-creme-gastronomico hover:text-laranja-fogo py-3 px-4 rounded-md hover:bg-marrom-madeira/10 transition-colors font-medium" onClick={() => setMenuOpen(false)}>Programação</Link>
            
            {!isLoading && user && !isAdmin ? (
              <Link href="/minha-conta/reservas" className="text-creme-gastronomico hover:text-laranja-fogo py-3 px-4 rounded-md hover:bg-marrom-madeira/10 transition-colors font-medium" onClick={() => setMenuOpen(false)}>Minhas Reservas</Link>
            ) : (
              <Link href="/eventos" className="text-creme-gastronomico hover:text-laranja-fogo py-3 px-4 rounded-md hover:bg-marrom-madeira/10 transition-colors font-medium" onClick={() => setMenuOpen(false)}>Reservas</Link>
            )}
            
            {!isLoading && user ? (
              <>
                {isAdmin && (
                  <Link href="/admin" className="text-creme-gastronomico/60 hover:text-laranja-fogo py-3 px-4 rounded-md hover:bg-marrom-madeira/10 transition-colors font-medium text-sm" onClick={() => setMenuOpen(false)}>Painel Admin</Link>
                )}
                <Link href="/minha-conta" className="text-creme-gastronomico hover:text-laranja-fogo py-3 px-4 rounded-md hover:bg-marrom-madeira/10 transition-colors font-medium" onClick={() => setMenuOpen(false)}>Minha Conta</Link>
              </>
            ) : (
              <>
                <Link href="/admin" className="text-creme-gastronomico/60 hover:text-laranja-fogo py-3 px-4 rounded-md hover:bg-marrom-madeira/10 transition-colors font-medium text-sm" onClick={() => setMenuOpen(false)}>Acesso Restrito</Link>
                <Link href="/entrar" className="text-creme-gastronomico hover:text-laranja-fogo py-3 px-4 rounded-md hover:bg-marrom-madeira/10 transition-colors font-medium" onClick={() => setMenuOpen(false)}>Entrar</Link>
                <div className="pt-2">
                  <Button variant="premium" className="w-full" asChild>
                    <Link href="/eventos" onClick={() => setMenuOpen(false)}>Garanta sua Experiência</Link>
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
