'use server';

import { redirect } from 'next/navigation';
import { isMockMode } from '@/lib/data/data-source';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function signUpCustomerAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string;
  const phone = formData.get('phone') as string;
  const cpf = formData.get('cpf') as string;

  if (!email || !password || !fullName || !phone || !cpf) {
    return { error: 'Preencha todos os campos obrigatórios.' };
  }

  if (password.length < 6) {
    return { error: 'A senha deve ter pelo menos 6 caracteres.' };
  }

  if (isMockMode()) {
    return { success: true, customerId: 'mock-customer-id' };
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone,
        cpf
      }
    }
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.user) {
    return { error: 'Erro ao criar usuário.' };
  }

  // Ensure customer record is linked/created via RPC
  const { data: customerData, error: rpcError } = await (supabase as any).rpc('ensure_customer_for_auth_user', {
    p_auth_user_id: data.user.id,
    p_full_name: fullName,
    p_phone: phone,
    p_email: email,
    p_cpf: cpf
  });

  if (rpcError) {
    return { error: 'Erro ao vincular perfil de cliente: ' + rpcError.message };
  }

  return { success: true, customerId: customerData };
}

export async function signInCustomerAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Preencha todos os campos.' };
  }

  if (isMockMode()) {
    if (email === 'cliente@teste.com' && password === 'teste123') {
      return { success: true };
    }
    return { error: 'Credenciais inválidas. (Mock: cliente@teste.com / teste123)' };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message.includes('Invalid login')) {
      return { error: 'Credenciais inválidas. Verifique seu email e senha.' };
    }
    return { error: 'Erro ao entrar. Tente novamente.' };
  }

  return { success: true };
}

export async function signOutCustomerAction() {
  if (isMockMode()) {
    redirect('/');
  }

  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/');
}

/**
 * Estado de sessão para o Navbar — resolvido NO SERVIDOR (cookies), sem
 * depender de getUser() no browser (lento/sujeito a contenção de lock com
 * o canal realtime na mesma página).
 */
export async function getNavSessionAction(): Promise<{ isAuthenticated: boolean; isAdmin: boolean }> {
  if (isMockMode()) {
    return { isAuthenticated: false, isAdmin: false };
  }

  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { isAuthenticated: false, isAdmin: false };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return { isAuthenticated: true, isAdmin: !!profile };
}

export async function getCustomerSessionAction() {
  if (isMockMode()) {
    return { user: { id: 'mock-user' }, customer: { id: 'mock-customer', full_name: 'Cliente Mock', email: 'cliente@teste.com' } };
  }

  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: customer, error } = await (supabase as any)
    .from('customers')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();

  if (error || !customer) {
    return { user, customer: null };
  }

  return { user, customer };
}

export async function updateCustomerProfileAction(input: {
  fullName?: string;
  phone?: string;
  email?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (isMockMode()) {
    return { success: true };
  }

  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Não autenticado.' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('update_customer_profile', {
    p_full_name: input.fullName || null,
    p_phone: input.phone || null,
    p_email: input.email || null,
  });

  if (error) {
    return { success: false, error: 'Erro ao atualizar perfil: ' + error.message };
  }

  return { success: true };
}
