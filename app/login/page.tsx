'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState, useTransition } from 'react';
import { loginAction } from '@/lib/actions/auth.actions';
import { Flame, Lock, Mail, Eye, EyeOff, ArrowRight, Shield } from 'lucide-react';

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/admin';
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await loginAction(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-preto-carvao relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-vermelho-brasa/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-laranja-fogo/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-ambar-premium/3 rounded-full blur-3xl" />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: 'linear-gradient(rgba(248,231,201,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(248,231,201,0.3) 1px, transparent 1px)',
        backgroundSize: '60px 60px'
      }} />

      {/* Login card */}
      <div className="relative w-full max-w-md mx-4">
        {/* Glow border */}
        <div className="absolute -inset-[1px] bg-gradient-to-br from-laranja-fogo/40 via-vermelho-brasa/20 to-ambar-premium/40 rounded-3xl blur-sm" />
        
        <div className="relative bg-preto-carvao/95 backdrop-blur-xl border border-marrom-madeira/30 rounded-3xl p-8 shadow-2xl">
          {/* Logo area */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-vermelho-brasa to-laranja-fogo shadow-lg shadow-vermelho-brasa/30 mb-5">
              <Flame className="w-10 h-10 text-creme-gastronomico" />
            </div>
            <h1 className="text-3xl font-bold text-creme-gastronomico tracking-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Central Casarão
            </h1>
            <p className="text-creme-gastronomico/50 text-sm mt-1 tracking-widest uppercase font-medium">
              Painel Executivo
            </p>
          </div>

          {/* Welcome message */}
          <div className="bg-gradient-to-r from-laranja-fogo/10 to-ambar-premium/10 border border-laranja-fogo/20 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-laranja-fogo shrink-0" />
              <p className="text-sm text-creme-gastronomico/80">
                <span className="font-bold text-laranja-fogo">Área restrita.</span>{' '}
                Acesso exclusivo para gestores do Casarão.
              </p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-vermelho-brasa/15 border border-vermelho-brasa/30 rounded-xl p-4 mb-6 animate-shake">
              <p className="text-sm text-vermelho-brasa font-medium">{error}</p>
            </div>
          )}

          {/* Form */}
          <form action={handleSubmit} className="space-y-5">
            <input type="hidden" name="redirect" value={redirectTo} />
            
            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="login-email" className="text-xs font-bold text-creme-gastronomico/60 uppercase tracking-wider">
                Email
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-creme-gastronomico/30 group-focus-within:text-laranja-fogo transition-colors" />
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  placeholder="davi@casarao360.com"
                  required
                  autoComplete="email"
                  className="w-full pl-12 pr-4 py-3.5 bg-preto-carvao/80 border border-marrom-madeira/40 rounded-xl text-creme-gastronomico placeholder-creme-gastronomico/25 focus:outline-none focus:border-laranja-fogo/60 focus:ring-2 focus:ring-laranja-fogo/20 transition-all font-medium"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label htmlFor="login-password" className="text-xs font-bold text-creme-gastronomico/60 uppercase tracking-wider">
                Senha
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-creme-gastronomico/30 group-focus-within:text-laranja-fogo transition-colors" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="••••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-12 pr-12 py-3.5 bg-preto-carvao/80 border border-marrom-madeira/40 rounded-xl text-creme-gastronomico placeholder-creme-gastronomico/25 focus:outline-none focus:border-laranja-fogo/60 focus:ring-2 focus:ring-laranja-fogo/20 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-creme-gastronomico/30 hover:text-laranja-fogo transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-4 bg-gradient-to-r from-vermelho-brasa to-laranja-fogo hover:from-vermelho-brasa/90 hover:to-laranja-fogo/90 text-creme-gastronomico font-bold rounded-xl shadow-lg shadow-vermelho-brasa/30 hover:shadow-vermelho-brasa/50 transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group text-lg"
            >
              {isPending ? (
                <>
                  <div className="w-5 h-5 border-2 border-creme-gastronomico/30 border-t-creme-gastronomico rounded-full animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  Entrar no Painel
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-marrom-madeira/20 text-center">
            <p className="text-xs text-creme-gastronomico/30">
              Central Casarão 360 • Previsibilidade & Operação
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-preto-carvao">
        <div className="w-8 h-8 border-2 border-laranja-fogo/30 border-t-laranja-fogo rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
