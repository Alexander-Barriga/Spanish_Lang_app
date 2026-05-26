/**
 * Purges stale scene-dialogue audio from the pre_generated_audio table and
 * the episode-audio Supabase storage bucket.
 *
 * SAFE TO DELETE:
 *   - DB rows with content_type = 'scene_dialogue' (old interactive episode scenes)
 *   - Storage files under episode-audio/episode-1/ … episode-audio/episode-8/
 *
 * KEPT:
 *   - DB rows with content_type = 'episode_intro' (the 8 new florencia conv greetings)
 *   - Storage files under episode-audio/florencia-greetings/
 *
 * Run from the backend directory:
 *   npx ts-node scripts/purge-stale-episode-audio.ts
 */

import dotenv from 'dotenv';
import { supabaseAdmin } from '../src/config/supabase';

dotenv.config();

const AUDIO_BUCKET = 'episode-audio';
// Old scene audio lives in these top-level folders inside the bucket
const STALE_FOLDERS = [
  'episode-1',
  'episode-2',
  'episode-3',
  'episode-4',
  'episode-5',
  'episode-6',
  'episode-7',
  'episode-8',
];

// ============================================
// Step 1: Dry-run — show what will be deleted
// ============================================
async function dryRun(): Promise<void> {
  console.log('=== DRY RUN: rows that will be deleted from pre_generated_audio ===\n');

  const { data: rows, error } = await supabaseAdmin
    .from('pre_generated_audio')
    .select('content_key, content_type, character_id, audio_url')
    .eq('content_type', 'scene_dialogue')
    .order('content_key');

  if (error) throw new Error(`Dry-run query failed: ${error.message}`);

  if (!rows || rows.length === 0) {
    console.log('  No scene_dialogue rows found — nothing to delete.\n');
    return;
  }

  for (const row of rows) {
    console.log(`  [${row.content_key}]  character=${row.character_id}  url=${row.audio_url}`);
  }
  console.log(`\n  Total: ${rows.length} row(s) to delete.\n`);
}

// ============================================
// Step 2: Delete DB rows
// ============================================
async function deleteDbRows(): Promise<number> {
  console.log('=== Deleting pre_generated_audio rows (content_type = scene_dialogue) ===\n');

  const { data, error, count } = await supabaseAdmin
    .from('pre_generated_audio')
    .delete({ count: 'exact' })
    .eq('content_type', 'scene_dialogue');

  if (error) throw new Error(`DB delete failed: ${error.message}`);

  const deleted = count ?? 0;
  console.log(`  ✅ Deleted ${deleted} row(s) from pre_generated_audio.\n`);
  return deleted;
}

// ============================================
// Step 3: Delete storage files
// ============================================
async function deleteStorageFolder(folder: string): Promise<void> {
  console.log(`  📂 Listing files in ${AUDIO_BUCKET}/${folder}/…`);

  const { data: files, error: listError } = await supabaseAdmin.storage
    .from(AUDIO_BUCKET)
    .list(folder);

  if (listError) {
    console.warn(`    ⚠️  Could not list ${folder}: ${listError.message}`);
    return;
  }

  if (!files || files.length === 0) {
    console.log(`    (empty — skipping)`);
    return;
  }

  const paths = files.map(f => `${folder}/${f.name}`);
  console.log(`    Found ${paths.length} file(s): ${paths.join(', ')}`);

  const { error: removeError } = await supabaseAdmin.storage
    .from(AUDIO_BUCKET)
    .remove(paths);

  if (removeError) {
    console.warn(`    ⚠️  Remove failed for ${folder}: ${removeError.message}`);
  } else {
    console.log(`    ✅ Deleted ${paths.length} file(s).`);
  }
}

async function deleteStorageFiles(): Promise<void> {
  console.log('=== Deleting stale files from Supabase storage ===\n');
  for (const folder of STALE_FOLDERS) {
    await deleteStorageFolder(folder);
  }
  console.log('');
}

// ============================================
// Step 4: Verify what remains
// ============================================
async function verifyRemaining(): Promise<void> {
  console.log('=== Rows remaining in pre_generated_audio ===\n');

  const { data: rows, error } = await supabaseAdmin
    .from('pre_generated_audio')
    .select('content_key, content_type, audio_url')
    .order('content_key');

  if (error) {
    console.warn(`  Could not verify: ${error.message}`);
    return;
  }

  if (!rows || rows.length === 0) {
    console.log('  (table is now empty)');
    return;
  }

  for (const row of rows) {
    console.log(`  [${row.content_key}]  type=${row.content_type}`);
  }
  console.log(`\n  Total remaining: ${rows.length} row(s).`);
}

// ============================================
// Main
// ============================================
async function main(): Promise<void> {
  console.log('🧹 Purge Stale Episode Audio\n');

  await dryRun();
  await deleteDbRows();
  await deleteStorageFiles();
  await verifyRemaining();

  console.log('\n✅ Purge complete.');
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n❌ Script failed:', err);
    process.exit(1);
  });
