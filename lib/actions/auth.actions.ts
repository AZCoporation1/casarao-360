'use server';

import { redirect } from 'next/navigation';
import { isMockMode } from '@/lib/data/data-source';

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const redirectTo = formData.get('redirect') as string || '/admin';

  if (!email || !password) {
    return { error: 'Preencha todos os campos.' };
  }

  // Modo mock: aceita credenciais demo
  if (isMockMode()) {
    if (email === 'davi@casarao360.com' && password === 'casarao2024') {
      redirect(redirectTo);
    }
    return { error: 'Credenciais inválidas. Use: davi@casarao360.com / casarao2024' };
  }

  // Modo Supabase: autenticação real
  const { getSupabaseServerClient } = await import('@/lib/supabase/server');
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    if (error?.message.includes('Invalid login')) {
      return { error: 'Credenciais inválidas. Verifique seu email e senha.' };
    }
    return { error: 'Erro ao entrar. Tente novamente.' };
  }

  // Acesso Restrito exige profile administrativo (profiles = domínio staff).
  // Cliente comum: sessão encerrada e orientação para a área do cliente.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single();

  const staffRoles = ['owner', 'admin', 'manager', 'staff', 'viewer'];
  if (!profile || !staffRoles.includes(profile.role)) {
    await supabase.auth.signOut();
    return { error: 'Esta conta não tem acesso administrativo. Use "Entrar" na página inicial para acessar sua conta de cliente.' };
  }

  redirect(redirectTo);
}

export async function logoutAction() {
  // Modo mock: apenas redireciona
  if (isMockMode()) {
    redirect('/login');
  }

  // Modo Supabase: signOut real
  const { getSupabaseServerClient } = await import('@/lib/supabase/server');
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}
