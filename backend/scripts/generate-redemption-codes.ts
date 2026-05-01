import crypto from 'crypto';
import { supabaseAdmin } from '../src/config/supabase';
import { hashRedemptionCode } from '../src/routes/redemption';

/**
 * Generates N single-use server-side comp codes that grant `full_access`.
 *
 * Usage:
 *   npx ts-node scripts/generate-redemption-codes.ts [count] [note] [expiresInDays]
 *
 * Examples:
 *   # 5 codes, no expiry, generic note
 *   npx ts-node scripts/generate-redemption-codes.ts 5
 *
 *   # 1 code for the Apple App Review demo, expires in 90 days
 *   npx ts-node scripts/generate-redemption-codes.ts 1 "apple-review-2026" 90
 *
 * Plaintext codes are printed ONCE. Save them somewhere safe; the database
 * only stores the SHA-256 hash so we cannot recover them later.
 */

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // omit confusing chars (0/O, 1/I/L)
const SEGMENTS = [4, 4, 4]; // SPANLAB-XXXX-XXXX-XXXX

const generatePlaintextCode = (): string => {
  const prefix = 'SPANLAB';
  const segments = SEGMENTS.map((len) => {
    const bytes = crypto.randomBytes(len);
    let out = '';
    for (let i = 0; i < len; i++) {
      out += CHARSET[bytes[i] % CHARSET.length];
    }
    return out;
  });
  return [prefix, ...segments].join('-');
};

async function main() {
  const args = process.argv.slice(2);
  const count = Math.max(1, Math.min(parseInt(args[0] || '1', 10), 500));
  const note = args[1] || null;
  const expiresInDays = args[2] ? parseInt(args[2], 10) : null;
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const rows: Array<{
    code_hash: string;
    code_kind: 'full_access';
    max_uses: number;
    note: string | null;
    expires_at: string | null;
  }> = [];

  const plaintexts: string[] = [];

  for (let i = 0; i < count; i++) {
    const plaintext = generatePlaintextCode();
    plaintexts.push(plaintext);
    rows.push({
      code_hash: hashRedemptionCode(plaintext),
      code_kind: 'full_access',
      max_uses: 1,
      note,
      expires_at: expiresAt,
    });
  }

  const { error } = await supabaseAdmin.from('redemption_codes').insert(rows);
  if (error) {
    console.error('❌ Failed to insert redemption codes:', error);
    process.exit(1);
  }

  console.log('');
  console.log(`✅ Generated ${count} comp code${count === 1 ? '' : 's'}.`);
  if (note) console.log(`   Note: ${note}`);
  if (expiresAt) console.log(`   Expires: ${expiresAt}`);
  console.log('');
  console.log('Save these now — they cannot be recovered later:');
  console.log('');
  plaintexts.forEach((code, i) => {
    console.log(`  ${(i + 1).toString().padStart(3, ' ')}.  ${code}`);
  });
  console.log('');
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
