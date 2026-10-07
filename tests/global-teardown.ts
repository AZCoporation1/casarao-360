// Limpeza pós-E2E — remove TODOS os dados criados pelos testes no projeto
// vivo, identificados pelo domínio de email @casarao360.test (customers/auth)
// e pelo prefixo "E2E " (large_party_requests). Roda com service role.
// NUNCA toca dados que não casem com essas marcas.
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { loadEnv } from './env';

const E2E_EMAIL_DOMAIN = 'casarao360.test';

export default async function globalTeardown() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.warn('[e2e-cleanup] SUPABASE_SERVICE_ROLE_KEY ausente — limpeza pulada.');
    return;
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  // 1. Customers E2E
  const { data: customers } = await supabase
    .from('customers')
    .select('id, auth_user_id, email')
    .like('email', `%@${E2E_EMAIL_DOMAIN}`);

  const customerIds = (customers ?? []).map(c => c.id);
  console.log(`[e2e-cleanup] customers E2E: ${customerIds.length}`);

  if (customerIds.length > 0) {
    // 2. Reservas desses customers + mesas a liberar
    const { data: reservations } = await supabase
      .from('reservations')
      .select('id')
      .in('customer_id', customerIds);
    const reservationIds = (reservations ?? []).map(r => r.id);

    let tableIds: string[] = [];
    if (reservationIds.length > 0) {
      const { data: allocs } = await supabase
        .from('reservation_tables')
        .select('event_table_id')
        .in('reservation_id', reservationIds)
        .eq('allocation_status', 'active');
      tableIds = [...new Set((allocs ?? []).map(a => a.event_table_id))];

      // Delete cascata: reservation_tables + reservation_status_history
      const { error: delRes } = await supabase.from('reservations').delete().in('id', reservationIds);
      if (delRes) console.error('[e2e-cleanup] erro ao deletar reservas:', delRes.message);
      else console.log(`[e2e-cleanup] reservas removidas: ${reservationIds.length}`);
    }

    // 3. Libera as mesas que ficaram sem allocation ativa
    for (const tid of tableIds) {
      const { count } = await supabase
        .from('reservation_tables')
        .select('id', { count: 'exact', head: true })
        .eq('event_table_id', tid)
        .eq('allocation_status', 'active');
      if (!count) {
        await supabase.from('event_tables').update({ status: 'free' }).eq('id', tid);
      }
    }
    if (tableIds.length) console.log(`[e2e-cleanup] mesas verificadas/liberadas: ${tableIds.length}`);

    // 4. Customers
    const { error: delCust } = await supabase.from('customers').delete().in('id', customerIds);
    if (delCust) console.error('[e2e-cleanup] erro ao deletar customers:', delCust.message);
  }

  // 5. Leads E2E (large_party_requests criados com nome "E2E ...")
  await supabase.from('large_party_requests').delete().like('name', 'E2E %');

  // 6. Waitlist/interesse E2E
  await supabase.from('waitlist_entries').delete().like('full_name', 'E2E %');

  // 7. Usuários de Auth E2E (paginado)
  let page = 1;
  let deletedAuth = 0;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) break;
    for (const u of data.users) {
      if (u.email?.endsWith(`@${E2E_EMAIL_DOMAIN}`) && u.email !== process.env.E2E_ADMIN_EMAIL) {
        const { error: delErr } = await supabase.auth.admin.deleteUser(u.id);
        if (!delErr) deletedAuth += 1;
      }
    }
    if (data.users.length < 200) break;
    page += 1;
  }
  console.log(`[e2e-cleanup] auth users removidos: ${deletedAuth}`);

  // 8. Estado compartilhado entre specs
  const stateFile = path.resolve(__dirname, '.e2e-state.json');
  if (fs.existsSync(stateFile)) fs.unlinkSync(stateFile);
}
