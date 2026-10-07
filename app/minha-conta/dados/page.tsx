import { getSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ProfileForm } from './ProfileForm';

export default async function MinhaContaDadosPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/entrar');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: customerData } = await (supabase as any)
    .from('customers')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();

  if (!customerData) {
    return <div className="text-creme-gastronomico">Perfil não encontrado.</div>;
  }

  const initialData = {
    name: customerData.full_name || '',
    phone: customerData.phone || '',
    email: customerData.email || user.email || '',
    cpf_last4: customerData.cpf_last4 || 'XXXX',
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-creme-gastronomico">Meus Dados</h1>
        <p className="text-creme-gastronomico/70 mt-1">
          Gerencie suas informações pessoais e de contato.
        </p>
      </div>

      <ProfileForm initialData={initialData} />
    </div>
  );
}
