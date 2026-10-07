import { redirect } from 'next/navigation';
import { isMockMode } from '@/lib/data/data-source';
import { AdminShell } from './AdminShell';

const STAFF_ROLES = ['owner', 'admin', 'manager', 'staff', 'viewer'];

// Defesa em profundidade: o proxy já barra não-staff, mas o layout revalida
// no servidor (matchers podem sofrer drift de configuração).
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isMockMode()) {
    const { getSupabaseServerClient } = await import('@/lib/supabase/server');
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      redirect('/login');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !STAFF_ROLES.includes(profile.role)) {
      redirect('/minha-conta?erro=acesso');
    }
  }

  return <AdminShell>{children}</AdminShell>;
}
