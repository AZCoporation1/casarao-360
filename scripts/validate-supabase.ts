// =============================================
// Validate Supabase Connection
// Run: npx tsx scripts/validate-supabase.ts
// =============================================

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('🔍 Validando configuração Supabase...\n');

  // Check env vars
  const checks: { label: string; ok: boolean; detail: string }[] = [];

  checks.push({
    label: 'NEXT_PUBLIC_SUPABASE_URL',
    ok: !!supabaseUrl && supabaseUrl !== 'your_supabase_project_url',
    detail: supabaseUrl ? '✅ Configurada' : '❌ Ausente',
  });

  checks.push({
    label: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ok: !!supabaseAnonKey && supabaseAnonKey !== 'your_supabase_anon_key',
    detail: supabaseAnonKey ? '✅ Configurada' : '❌ Ausente',
  });

  checks.push({
    label: 'SUPABASE_SERVICE_ROLE_KEY',
    ok: !!serviceRoleKey && serviceRoleKey !== 'your_supabase_service_role_key',
    detail: serviceRoleKey ? '✅ Configurada (server-only)' : '⚠️  Ausente (necessária apenas para admin)',
  });

  checks.forEach(c => {
    console.log(`  ${c.ok ? '✅' : '❌'} ${c.label}: ${c.detail}`);
  });

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'your_supabase_project_url') {
    console.log('\n❌ Configuração incompleta. Configure .env.local com dados do Supabase.');
    process.exit(1);
  }

  // Test connection
  console.log('\n🔗 Testando conexão...');
  
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Test public read (events)
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, title')
    .limit(1);

  if (eventsError) {
    console.log(`  ❌ Leitura de eventos: ${eventsError.message}`);
    if (eventsError.message.includes('does not exist')) {
      console.log('     → Tabela não encontrada. Execute as migrations primeiro.');
    }
  } else {
    console.log(`  ✅ Leitura de eventos: ${events?.length || 0} evento(s) encontrado(s)`);
  }

  // Test RLS (should not be able to read customers as anon)
  const { data: customers, error: customersError } = await supabase
    .from('customers')
    .select('id')
    .limit(1);

  if (customersError || (customers && customers.length === 0)) {
    console.log('  ✅ RLS ativo: anon não acessa clientes');
  } else if (customers && customers.length > 0) {
    console.log('  ⚠️  RLS pode não estar ativo: anon leu dados de clientes');
  }

  // Test RPC
  const { error: rpcError } = await supabase.rpc('get_executive_summary', {
    p_organization_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  });

  if (rpcError) {
    console.log(`  ❌ RPC get_executive_summary: ${rpcError.message}`);
  } else {
    console.log('  ✅ RPC get_executive_summary: OK');
  }

  console.log('\n🎉 Validação concluída!');
}

main().catch(console.error);
