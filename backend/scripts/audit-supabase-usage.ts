/**
 * Audit Supabase project headroom against the free-tier caps.
 *
 * Reports:
 *   - Storage: per-bucket file count + total bytes vs the 1 GB free cap.
 *   - Database: per-table row counts for the largest user-data tables.
 *
 * Read-only — performs no writes. Uses the service role key and queries
 * `storage.objects` directly when permitted, falling back to the storage
 * REST API otherwise.
 *
 * Limitations:
 *   - Bandwidth (5 GB/mo free) is NOT queryable via the public REST API.
 *     Read it from the Supabase dashboard → Settings → Usage.
 *   - Exact pg_database_size() requires a small RPC; this script approximates
 *     DB pressure with row counts and prints the SQL to add the RPC if you
 *     want exact numbers later.
 */
import { supabaseAdmin } from '../src/config/supabase';

const FREE_TIER_STORAGE_BYTES = 1 * 1024 * 1024 * 1024;
const FREE_TIER_DB_BYTES = 500 * 1024 * 1024;

const TABLES_TO_COUNT = [
  'users',
  'conversations',
  'messages',
  'episode_progress',
  'episode_conversations',
  'episode_articles',
  'redemption_codes',
  'redemption_code_uses',
  'narrative_images',
  'audio_cache',
  'progress',
  'placement_results',
  'stories',
  'journal_entries',
];

type StorageRow = {
  bucket_id: string;
  name: string;
  metadata: { size?: number } | null;
};

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

function pct(part: number, whole: number): string {
  if (!whole) return '0.0%';
  return `${((part / whole) * 100).toFixed(1)}%`;
}

async function readStorageObjects(): Promise<{ ok: boolean; rows?: StorageRow[]; error?: string }> {
  try {
    // supabase-js v2.5+ exposes .schema() so we can read storage.objects with
    // the service role key and avoid recursive listing.
    const { data, error } = await (supabaseAdmin as any)
      .schema('storage')
      .from('objects')
      .select('bucket_id, name, metadata');
    if (error) return { ok: false, error: error.message };
    return { ok: true, rows: (data ?? []) as StorageRow[] };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function sumBucketViaList(
  bucket: string,
  prefix = ''
): Promise<{ count: number; bytes: number }> {
  let count = 0;
  let bytes = 0;
  let offset = 0;
  const PAGE = 100;
  while (true) {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .list(prefix, { limit: PAGE, offset });
    if (error || !data) break;
    for (const item of data) {
      const meta: any = (item as any).metadata;
      if (meta && typeof meta.size === 'number') {
        count += 1;
        bytes += meta.size;
      } else {
        const child = prefix ? `${prefix}/${item.name}` : item.name;
        const sub = await sumBucketViaList(bucket, child);
        count += sub.count;
        bytes += sub.bytes;
      }
    }
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return { count, bytes };
}

async function auditStorageViaListFallback() {
  const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
  if (error || !buckets) {
    console.log(`  Could not list buckets: ${error?.message ?? 'unknown error'}`);
    return;
  }
  let totalBytes = 0;
  let totalCount = 0;
  console.log('  bucket                          files       size           share');
  for (const b of buckets) {
    const { count, bytes } = await sumBucketViaList(b.name);
    totalBytes += bytes;
    totalCount += count;
    console.log(
      `  ${b.name.padEnd(30)} ${String(count).padStart(8)}   ${fmtBytes(bytes).padStart(10)}   ${pct(bytes, FREE_TIER_STORAGE_BYTES).padStart(6)} of 1 GB`
    );
  }
  console.log('  ' + '─'.repeat(58));
  console.log(
    `  ${'TOTAL'.padEnd(30)} ${String(totalCount).padStart(8)}   ${fmtBytes(totalBytes).padStart(10)}   ${pct(totalBytes, FREE_TIER_STORAGE_BYTES).padStart(6)} of 1 GB`
  );
  return totalBytes;
}

async function auditStorage() {
  console.log('Storage');
  console.log('─'.repeat(60));

  const sql = await readStorageObjects();
  let totalBytes = 0;
  let totalCount = 0;

  if (sql.ok && sql.rows) {
    const byBucket = new Map<string, { count: number; bytes: number }>();
    for (const r of sql.rows) {
      const size = Number(r.metadata?.size ?? 0);
      const cur = byBucket.get(r.bucket_id) ?? { count: 0, bytes: 0 };
      cur.count += 1;
      cur.bytes += size;
      byBucket.set(r.bucket_id, cur);
    }

    console.log('  bucket                          files       size           share');
    for (const [bucket, stats] of [...byBucket.entries()].sort()) {
      totalBytes += stats.bytes;
      totalCount += stats.count;
      console.log(
        `  ${bucket.padEnd(30)} ${String(stats.count).padStart(8)}   ${fmtBytes(stats.bytes).padStart(10)}   ${pct(stats.bytes, FREE_TIER_STORAGE_BYTES).padStart(6)} of 1 GB`
      );
    }
    console.log('  ' + '─'.repeat(58));
    console.log(
      `  ${'TOTAL'.padEnd(30)} ${String(totalCount).padStart(8)}   ${fmtBytes(totalBytes).padStart(10)}   ${pct(totalBytes, FREE_TIER_STORAGE_BYTES).padStart(6)} of 1 GB`
    );
  } else {
    console.log(`  storage.objects not directly readable (${sql.error}). Falling back.`);
    const fallback = await auditStorageViaListFallback();
    totalBytes = fallback ?? 0;
  }

  console.log('');
  if (totalBytes > 0.8 * FREE_TIER_STORAGE_BYTES) {
    console.log('  🛑  >80% of free storage used. Plan a paid Supabase tier or migrate cold');
    console.log('       audio to S3/R2 before launch.');
  } else if (totalBytes > 0.5 * FREE_TIER_STORAGE_BYTES) {
    console.log('  ⚠️   >50% of free storage used. Audit retention policies for audio recordings.');
  } else if (totalBytes > 0) {
    console.log('  ✅  Plenty of storage headroom on the free tier.');
  } else {
    console.log('  ✅  No stored objects yet — full 1 GB free-tier budget available.');
  }
  console.log('');
}

async function auditTables() {
  console.log('Database (row counts on major user-data tables)');
  console.log('─'.repeat(60));
  console.log(`  Free DB cap is ~${fmtBytes(FREE_TIER_DB_BYTES)}. Row counts are a proxy.`);
  console.log('');
  console.log('  table                              rows');
  let total = 0;
  for (const table of TABLES_TO_COUNT) {
    const { count, error } = await supabaseAdmin
      .from(table)
      .select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`  ${table.padEnd(34)} (skipped: ${error.message})`);
      continue;
    }
    const c = count ?? 0;
    total += c;
    console.log(`  ${table.padEnd(34)} ${String(c).padStart(6)}`);
  }
  console.log('  ' + '─'.repeat(58));
  console.log(`  ${'sum (proxy only)'.padEnd(34)} ${String(total).padStart(6)}`);
  console.log('');
}

async function main() {
  console.log('Supabase free-tier budget audit');
  console.log('═'.repeat(60));
  console.log(`Project: ${process.env.SUPABASE_URL ?? '(SUPABASE_URL not set)'}`);
  console.log('');

  await auditStorage();
  await auditTables();

  console.log('Notes');
  console.log('─'.repeat(60));
  console.log('  • Bandwidth (5 GB/mo free) is not exposed via the REST API.');
  console.log('    Read it from the Supabase dashboard → Settings → Usage.');
  console.log('  • Exact DB size requires a custom RPC. To enable it, run once:');
  console.log('');
  console.log('      create or replace function public.pg_db_size_bytes()');
  console.log('      returns bigint language sql security definer set search_path = ""');
  console.log('      as $$ select pg_database_size(current_database()) $$;');
  console.log('      grant execute on function public.pg_db_size_bytes() to service_role;');
  console.log('');
  console.log('    Then call supabaseAdmin.rpc("pg_db_size_bytes") for an exact byte count.');
  console.log('');
  console.log('  • Audio retention is the single highest-leverage knob for free-tier life:');
  console.log('    deleting recordings older than e.g. 30 days from `audio-recordings/`');
  console.log('    typically reclaims most of the storage growth.');
}

main().catch((err) => {
  console.error('audit-supabase-usage failed:', err);
  process.exit(1);
});
