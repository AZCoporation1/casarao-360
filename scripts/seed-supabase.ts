// =============================================
// Seed Supabase Script
// Run: npx tsx scripts/seed-supabase.ts
// =============================================

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    console.log('');
    console.log('Configure as variáveis em .env.local:');
    console.log('  NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co');
    console.log('  SUPABASE_SERVICE_ROLE_KEY=eyJ...');
    process.exit(1);
  }

  console.log('🌱 Seed data should be applied via Supabase Dashboard or CLI.');
  console.log('');
  console.log('Options:');
  console.log('  1. Supabase Dashboard > SQL Editor > Paste supabase/seed.sql');
  console.log('  2. npx supabase db reset (with CLI configured)');
  console.log('  3. Use MCP Supabase to execute SQL directly');
  console.log('');
  console.log('✅ Script completed.');
}

main().catch(console.error);
