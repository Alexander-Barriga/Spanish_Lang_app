import { supabaseAdmin } from '../src/config/supabase';

type ColumnCheck = { column: string; ok: boolean; detail?: string };
type TableCheck = { table: string; ok: boolean; detail?: string };

const REQUIRED_USER_COLUMNS = [
  'is_premium',
  'subscription_tier',
  'subscription_expires_at',
  'entitlement_source',
  'revenuecat_app_user_id',
];

const REQUIRED_TABLES = ['redemption_codes', 'redemption_code_uses'];

async function checkUserColumns(): Promise<ColumnCheck[]> {
  const results: ColumnCheck[] = [];
  for (const column of REQUIRED_USER_COLUMNS) {
    const { error } = await supabaseAdmin.from('users').select(column).limit(1);
    if (error) {
      results.push({ column, ok: false, detail: error.message });
    } else {
      results.push({ column, ok: true });
    }
  }
  return results;
}

async function checkTables(): Promise<TableCheck[]> {
  const results: TableCheck[] = [];
  for (const table of REQUIRED_TABLES) {
    const { error } = await supabaseAdmin.from(table).select('*').limit(1);
    if (error) {
      results.push({ table, ok: false, detail: error.message });
    } else {
      results.push({ table, ok: true });
    }
  }
  return results;
}

async function main() {
  console.log('Probing public.users columns…');
  const cols = await checkUserColumns();
  for (const c of cols) {
    console.log(`  ${c.ok ? 'OK ' : 'FAIL'}  ${c.column}${c.detail ? `  -> ${c.detail}` : ''}`);
  }

  console.log('\nProbing public.* tables…');
  const tables = await checkTables();
  for (const t of tables) {
    console.log(`  ${t.ok ? 'OK ' : 'FAIL'}  ${t.table}${t.detail ? `  -> ${t.detail}` : ''}`);
  }

  const allOk = cols.every((c) => c.ok) && tables.every((t) => t.ok);
  console.log(`\n${allOk ? 'Migration applied.' : 'Migration NOT fully applied — paste backend/supabase-schema.sql into Supabase SQL editor and rerun.'}`);
  process.exit(allOk ? 0 : 1);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(2);
});
