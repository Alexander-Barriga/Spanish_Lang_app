/* eslint-disable no-console */
/**
 * Autonomous end-to-end runner for the paywall testing playbook.
 *
 * Covers:
 *   Phase A: admin path (full bypass).
 *   Phase B: free-tier server-side enforcement (403 PAYWALL on E2 endpoints,
 *            E1 regression guard).
 *   Phase C: comp code redemption + the six negative cases.
 *   Phase D: webhook auth + happy paths + comp_code lock + EXPIRATION.
 *
 * Phases B's UI assertions (signup -> onboarding -> tap E2) and Phase E
 * (real IAP) are out of scope here because they need Expo Go + StoreKit.
 *
 * The harness is idempotent: it creates two ephemeral users
 * (paywall-admin@... and paywall-free@...) the first run, then reuses them.
 * A `--cleanup` flag deletes them on exit.
 *
 * Usage (from backend/):
 *   ./node_modules/.bin/ts-node scripts/run-paywall-e2e.ts
 *   ./node_modules/.bin/ts-node scripts/run-paywall-e2e.ts --cleanup
 */
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../src/config/supabase';
import { hashRedemptionCode } from '../src/routes/redemption';

const API_BASE = process.env.API_BASE || 'http://localhost:3001';
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const RC_WEBHOOK_SECRET = process.env.RC_WEBHOOK_SECRET || '';

const ADMIN_EMAIL = 'paywall-admin@e2e.spanlab.local';
const FREE_EMAIL = 'paywall-free@e2e.spanlab.local';
const TEST_PASSWORD = 'PaywallE2EPassword!2026';

const cleanup = process.argv.includes('--cleanup');

type Result = { name: string; passed: boolean; detail?: string };
const results: Result[] = [];

const record = (name: string, passed: boolean, detail?: string) => {
  results.push({ name, passed, detail });
  const tag = passed ? 'PASS' : 'FAIL';
  console.log(`  [${tag}] ${name}${detail ? `  -> ${detail}` : ''}`);
};

// ---------- helpers ----------

interface TestUser {
  id: string;
  email: string;
  accessToken: string;
}

async function ensureUser(email: string, password: string): Promise<TestUser> {
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Try sign-in first (idempotent reruns).
  const signIn = await anon.auth.signInWithPassword({ email, password });
  if (signIn.data?.session?.access_token && signIn.data.user) {
    return {
      id: signIn.data.user.id,
      email,
      accessToken: signIn.data.session.access_token,
    };
  }

  // Otherwise, admin-create the user, then sign in.
  const created = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error || !created.data?.user) {
    throw new Error(`Failed to create ${email}: ${created.error?.message}`);
  }

  // Wait briefly for any trigger that mirrors auth.users -> public.users.
  await new Promise((r) => setTimeout(r, 250));

  // Make sure a public.users row exists (some schemas have a trigger; others
  // don't). We upsert defensively so the rest of the suite has a row to read.
  await supabaseAdmin
    .from('users')
    .upsert(
      {
        id: created.data.user.id,
        email,
        is_admin: false,
        is_premium: false,
      },
      { onConflict: 'id' }
    );

  const signIn2 = await anon.auth.signInWithPassword({ email, password });
  if (!signIn2.data?.session?.access_token || !signIn2.data.user) {
    throw new Error(`Failed to sign in ${email} after create: ${signIn2.error?.message}`);
  }
  return {
    id: signIn2.data.user.id,
    email,
    accessToken: signIn2.data.session.access_token,
  };
}

async function deleteUserIfExists(email: string) {
  const { data } = await supabaseAdmin.auth.admin.listUsers();
  const existing = data?.users?.find((u) => u.email === email);
  if (existing) {
    await supabaseAdmin.auth.admin.deleteUser(existing.id);
  }
}

async function api(
  path: string,
  init: { method?: string; token?: string; body?: any; headers?: Record<string, string> } = {}
): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
    ...(init.headers ?? {}),
  };
  const res = await fetch(`${API_BASE}${path}`, {
    method: init.method ?? 'GET',
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  let body: any = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* keep text */
  }
  return { status: res.status, body };
}

async function setEntitlement(
  userId: string,
  patch: Partial<{
    is_premium: boolean;
    subscription_tier: string | null;
    entitlement_source: string | null;
    subscription_expires_at: string | null;
    is_admin: boolean;
  }>
) {
  const { error } = await supabaseAdmin.from('users').update(patch).eq('id', userId);
  if (error) throw new Error(`Failed to patch entitlement: ${error.message}`);
}

async function fetchUserRow(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('is_admin,is_premium,subscription_tier,subscription_expires_at,entitlement_source')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

async function fetchE1andE2(): Promise<{ e1: { id: string }; e2: { id: string }; e2ArticleId: string | null }> {
  // Pick the lowest-numbered story arc that has at least episodes 1 and 2.
  const { data: arcs } = await supabaseAdmin
    .from('story_arcs')
    .select('id')
    .order('arc_number', { ascending: true });

  if (!arcs || arcs.length === 0) {
    throw new Error('No story_arcs in DB; cannot run paywall E2E.');
  }

  for (const arc of arcs) {
    const { data: eps } = await supabaseAdmin
      .from('episodes')
      .select('id, episode_number')
      .eq('story_arc_id', arc.id)
      .in('episode_number', [1, 2])
      .order('episode_number');
    const e1 = eps?.find((e) => e.episode_number === 1);
    const e2 = eps?.find((e) => e.episode_number === 2);
    if (e1 && e2) {
      const { data: art } = await supabaseAdmin
        .from('episode_articles')
        .select('id')
        .eq('episode_id', e2.id)
        .limit(1)
        .maybeSingle();
      return {
        e1: { id: e1.id },
        e2: { id: e2.id },
        e2ArticleId: art?.id ?? null,
      };
    }
  }
  throw new Error('No story arc had both E1 and E2; seed the DB or pick a different arc.');
}

const isPaywall403 = (r: { status: number; body: any }) =>
  r.status === 403 && r.body?.code === 'PAYWALL';

// ---------- Phase A ----------

async function phaseA(admin: TestUser) {
  console.log('\n== Phase A: admin bypass ==');

  await setEntitlement(admin.id, { is_admin: true, is_premium: false, subscription_tier: null, entitlement_source: null });

  const status = await api('/api/v1/subscription/status', { token: admin.accessToken });
  record(
    'A4a /subscription/status sees admin as premium',
    status.status === 200 && status.body?.isPremium === true,
    `status=${status.status} body=${JSON.stringify(status.body)}`
  );

  const { e2 } = await fetchE1andE2();
  const start = await api(`/api/v1/episode-conversation/${e2.id}/start`, {
    method: 'POST',
    token: admin.accessToken,
    body: {},
  });
  record(
    'A4b admin can hit a paywalled E2 endpoint (not 403)',
    start.status !== 403,
    `status=${start.status}`
  );
}

// ---------- Phase B ----------

async function phaseB(free: TestUser) {
  console.log('\n== Phase B: free-tier server-side enforcement ==');

  await setEntitlement(free.id, {
    is_admin: false,
    is_premium: false,
    subscription_tier: null,
    entitlement_source: null,
  });

  const status = await api('/api/v1/subscription/status', { token: free.accessToken });
  record(
    'B5a /subscription/status reports isPremium=false',
    status.status === 200 && status.body?.isPremium === false,
    `body=${JSON.stringify(status.body)}`
  );

  const { e1, e2, e2ArticleId } = await fetchE1andE2();

  const startE2 = await api(`/api/v1/episode-conversation/${e2.id}/start`, {
    method: 'POST',
    token: free.accessToken,
    body: {},
  });
  record(
    'B5b POST /episode-conversation/<E2>/start -> 403 PAYWALL',
    isPaywall403(startE2),
    `status=${startE2.status} body=${JSON.stringify(startE2.body)}`
  );

  const startE1 = await api(`/api/v1/episode-conversation/${e1.id}/start`, {
    method: 'POST',
    token: free.accessToken,
    body: {},
  });
  record(
    'B5c (regression) POST /episode-conversation/<E1>/start NOT 403',
    startE1.status !== 403,
    `status=${startE1.status}`
  );

  if (e2ArticleId) {
    const submitE2 = await api(`/api/v1/episode-articles/${e2ArticleId}/submit`, {
      method: 'POST',
      token: free.accessToken,
      body: { submission_text: 'Hola', submission_type: 'text' },
    });
    record(
      'B5d POST /episode-articles/<E2>/submit -> 403 PAYWALL',
      isPaywall403(submitE2),
      `status=${submitE2.status} body=${JSON.stringify(submitE2.body)}`
    );
  } else {
    record('B5d POST /episode-articles/<E2>/submit -> 403 PAYWALL', false, 'no E2 article in DB');
  }

  const attemptE2 = await api('/api/v1/stories/attempt', {
    method: 'POST',
    token: free.accessToken,
    body: { episodeId: e2.id },
  });
  record(
    'B5e POST /stories/attempt {E2} -> 403 PAYWALL',
    isPaywall403(attemptE2),
    `status=${attemptE2.status} body=${JSON.stringify(attemptE2.body)}`
  );
}

// ---------- Phase C ----------

interface IssuedCode {
  id: string;
  plaintext: string;
}

async function issueCode(opts: {
  plaintext: string;
  maxUses?: number;
  expiresAt?: Date | null;
  revoked?: boolean;
  note?: string;
}): Promise<IssuedCode> {
  const code_hash = hashRedemptionCode(opts.plaintext);
  const { data, error } = await supabaseAdmin
    .from('redemption_codes')
    .insert({
      code_hash,
      code_kind: 'full_access',
      max_uses: opts.maxUses ?? 1,
      uses_count: 0,
      expires_at: opts.expiresAt ? opts.expiresAt.toISOString() : null,
      revoked_at: opts.revoked ? new Date().toISOString() : null,
      note: opts.note ?? 'paywall-e2e',
    })
    .select('id')
    .single();
  if (error || !data) {
    throw new Error(`issueCode failed: ${error?.message}`);
  }
  return { id: data.id, plaintext: opts.plaintext };
}

const newPlaintext = (suffix: string) => `SPANLAB-E2E-${suffix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

async function phaseC(free: TestUser, second: TestUser) {
  console.log('\n== Phase C: comp code redemption ==');

  // Reset entitlement to free for the redemption tests.
  await setEntitlement(free.id, {
    is_admin: false,
    is_premium: false,
    subscription_tier: null,
    entitlement_source: null,
  });

  // C1: bulk issue using the same hashing the script uses, sized for negatives.
  const happy = await issueCode({ plaintext: newPlaintext('HAPPY'), note: 'paywall-e2e-happy' });
  const expired = await issueCode({
    plaintext: newPlaintext('EXP'),
    expiresAt: new Date(Date.now() - 60_000),
    note: 'paywall-e2e-expired',
  });
  const revoked = await issueCode({
    plaintext: newPlaintext('REV'),
    revoked: true,
    note: 'paywall-e2e-revoked',
  });

  // C2/C3: happy path
  const redeem = await api('/api/v1/redemption/redeem', {
    method: 'POST',
    token: free.accessToken,
    body: { code: happy.plaintext },
  });
  record(
    'C2 redeem fresh code -> 200 ok=true',
    redeem.status === 200 && redeem.body?.ok === true && redeem.body?.entitlement?.isPremium === true,
    `status=${redeem.status} body=${JSON.stringify(redeem.body)}`
  );

  const after = await fetchUserRow(free.id);
  record(
    'C3 user row updated: is_premium=true, tier=comp, source=comp_code',
    after.is_premium === true && after.subscription_tier === 'comp' && after.entitlement_source === 'comp_code',
    JSON.stringify(after)
  );

  const { data: codeRow } = await supabaseAdmin
    .from('redemption_codes')
    .select('uses_count')
    .eq('id', happy.id)
    .single();
  record(
    'C3 code uses_count incremented to 1',
    codeRow?.uses_count === 1,
    `uses_count=${codeRow?.uses_count}`
  );

  const { data: useRow } = await supabaseAdmin
    .from('redemption_code_uses')
    .select('user_id')
    .eq('code_id', happy.id);
  record(
    'C3 redemption_code_uses ledger has the test user',
    !!useRow?.find((r) => r.user_id === free.id),
    JSON.stringify(useRow)
  );

  // C4: same user, same code, second time -> 409 ALREADY_REDEEMED_BY_USER
  const replay = await api('/api/v1/redemption/redeem', {
    method: 'POST',
    token: free.accessToken,
    body: { code: happy.plaintext },
  });
  record(
    'C4a same-user replay -> 409 ALREADY_REDEEMED_BY_USER',
    replay.status === 409 && replay.body?.error === 'ALREADY_REDEEMED_BY_USER',
    `status=${replay.status} body=${JSON.stringify(replay.body)}`
  );

  // C4: second user, exhausted code -> 409 CODE_EXHAUSTED
  // Reset second user (admin user) entitlement so the redemption attempt
  // exercises the gate purely on the code state, not on the user row.
  await setEntitlement(second.id, {
    is_admin: false,
    is_premium: false,
    subscription_tier: null,
    entitlement_source: null,
  });
  const exhausted = await api('/api/v1/redemption/redeem', {
    method: 'POST',
    token: second.accessToken,
    body: { code: happy.plaintext },
  });
  record(
    'C4b second user, exhausted code -> 409 CODE_EXHAUSTED',
    exhausted.status === 409 && exhausted.body?.error === 'CODE_EXHAUSTED',
    `status=${exhausted.status} body=${JSON.stringify(exhausted.body)}`
  );

  // C4: bad code -> 404 INVALID_CODE
  const bad = await api('/api/v1/redemption/redeem', {
    method: 'POST',
    token: free.accessToken,
    body: { code: 'SPANLAB-AAAA-BBBB-CCCC-DOES-NOT-EXIST' },
  });
  record(
    'C4c bad code -> 404 INVALID_CODE',
    bad.status === 404 && bad.body?.error === 'INVALID_CODE',
    `status=${bad.status} body=${JSON.stringify(bad.body)}`
  );

  // C4: bad format -> 400 INVALID_CODE_FORMAT
  const malformed = await api('/api/v1/redemption/redeem', {
    method: 'POST',
    token: free.accessToken,
    body: { code: 'a' },
  });
  record(
    'C4d bad format -> 400 INVALID_CODE_FORMAT',
    malformed.status === 400 && malformed.body?.error === 'INVALID_CODE_FORMAT',
    `status=${malformed.status} body=${JSON.stringify(malformed.body)}`
  );

  // C4: expired -> 410 CODE_EXPIRED
  await setEntitlement(free.id, {
    is_admin: false,
    is_premium: false,
    subscription_tier: null,
    entitlement_source: null,
  });
  const expiredRedeem = await api('/api/v1/redemption/redeem', {
    method: 'POST',
    token: free.accessToken,
    body: { code: expired.plaintext },
  });
  record(
    'C4e expired -> 410 CODE_EXPIRED',
    expiredRedeem.status === 410 && expiredRedeem.body?.error === 'CODE_EXPIRED',
    `status=${expiredRedeem.status} body=${JSON.stringify(expiredRedeem.body)}`
  );

  // C4: revoked -> 410 CODE_REVOKED
  const revokedRedeem = await api('/api/v1/redemption/redeem', {
    method: 'POST',
    token: free.accessToken,
    body: { code: revoked.plaintext },
  });
  record(
    'C4f revoked -> 410 CODE_REVOKED',
    revokedRedeem.status === 410 && revokedRedeem.body?.error === 'CODE_REVOKED',
    `status=${revokedRedeem.status} body=${JSON.stringify(revokedRedeem.body)}`
  );

  return { codeIds: [happy.id, expired.id, revoked.id] };
}

// ---------- Phase D ----------

async function waitForBackend(timeoutMs = 8_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(`${API_BASE}/health`);
      if (r.ok) return;
    } catch {
      /* nodemon restarting */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Backend did not come back online after .env edit');
}

async function phaseD(free: TestUser) {
  console.log('\n== Phase D: webhook ==');

  if (!RC_WEBHOOK_SECRET) {
    record('D2-D4 webhook tests', false, 'RC_WEBHOOK_SECRET not exported into this process; skipping');
    return;
  }

  // D1 already verified out-of-band when the secret was unset. Re-verify with
  // the secret set: an unauthenticated request should now 401, not 503.
  const noBearer = await fetch(`${API_BASE}/api/v1/webhooks/revenuecat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  record(
    'D2a no Authorization header -> 401 (secret is set)',
    noBearer.status === 401,
    `status=${noBearer.status}`
  );

  const badBearer = await fetch(`${API_BASE}/api/v1/webhooks/revenuecat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer wrong' },
    body: '{}',
  });
  record('D2b bad bearer -> 401', badBearer.status === 401, `status=${badBearer.status}`);

  const malformed = await fetch(`${API_BASE}/api/v1/webhooks/revenuecat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RC_WEBHOOK_SECRET}` },
    body: '{}',
  });
  record(
    'D2c good bearer + malformed payload -> 400',
    malformed.status === 400,
    `status=${malformed.status}`
  );

  // Reset free user before INITIAL_PURCHASE so we observe a clean transition.
  await setEntitlement(free.id, {
    is_admin: false,
    is_premium: false,
    subscription_tier: null,
    entitlement_source: null,
    subscription_expires_at: null,
  });

  const expiresAtMs = Date.now() + 30 * 86_400_000;
  const initial = await fetch(`${API_BASE}/api/v1/webhooks/revenuecat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RC_WEBHOOK_SECRET}` },
    body: JSON.stringify({
      event: {
        type: 'INITIAL_PURCHASE',
        app_user_id: free.id,
        product_id: 'spanishlab_monthly_1499',
        expiration_at_ms: expiresAtMs,
      },
    }),
  });
  const initialBody = (await initial.json().catch(() => ({}))) as any;
  record(
    'D2d INITIAL_PURCHASE -> 200 ok=true',
    initial.status === 200 && initialBody.ok === true && initialBody.skipped !== true,
    `status=${initial.status} body=${JSON.stringify(initialBody)}`
  );

  const afterInitial = await fetchUserRow(free.id);
  record(
    'D2e DB shows tier=monthly source=revenuecat',
    afterInitial.is_premium === true &&
      afterInitial.subscription_tier === 'monthly' &&
      afterInitial.entitlement_source === 'revenuecat',
    JSON.stringify(afterInitial)
  );

  // D3: lock to comp_code and replay; webhook should respond skipped, DB stays.
  await setEntitlement(free.id, {
    is_premium: true,
    subscription_tier: 'comp',
    entitlement_source: 'comp_code',
    subscription_expires_at: null,
  });
  const replay = await fetch(`${API_BASE}/api/v1/webhooks/revenuecat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RC_WEBHOOK_SECRET}` },
    body: JSON.stringify({
      event: {
        type: 'INITIAL_PURCHASE',
        app_user_id: free.id,
        product_id: 'spanishlab_monthly_1499',
        expiration_at_ms: expiresAtMs,
      },
    }),
  });
  const replayBody = (await replay.json().catch(() => ({}))) as any;
  record(
    'D3a comp_code locked: replay -> 200 skipped=true',
    replay.status === 200 && replayBody.ok === true && replayBody.skipped === true,
    `body=${JSON.stringify(replayBody)}`
  );

  const afterReplay = await fetchUserRow(free.id);
  record(
    'D3b comp_code row was NOT overwritten',
    afterReplay.subscription_tier === 'comp' && afterReplay.entitlement_source === 'comp_code',
    JSON.stringify(afterReplay)
  );

  // D4: reset back to revenuecat-sourced premium, then send EXPIRATION.
  await setEntitlement(free.id, {
    is_premium: true,
    subscription_tier: 'monthly',
    entitlement_source: 'revenuecat',
    subscription_expires_at: new Date(expiresAtMs).toISOString(),
  });
  const expire = await fetch(`${API_BASE}/api/v1/webhooks/revenuecat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RC_WEBHOOK_SECRET}` },
    body: JSON.stringify({
      event: { type: 'EXPIRATION', app_user_id: free.id },
    }),
  });
  const expireBody = (await expire.json().catch(() => ({}))) as any;
  record('D4a EXPIRATION -> 200 ok=true', expire.status === 200 && expireBody.ok === true, JSON.stringify(expireBody));

  const afterExpire = await fetchUserRow(free.id);
  record(
    'D4b DB shows is_premium=false tier=free source=null',
    afterExpire.is_premium === false &&
      afterExpire.subscription_tier === 'free' &&
      afterExpire.entitlement_source === null,
    JSON.stringify(afterExpire)
  );
}

// ---------- main ----------

async function deleteIssuedTestCodes() {
  await supabaseAdmin
    .from('redemption_codes')
    .delete()
    .ilike('note', 'paywall-e2e%');
}

async function main() {
  console.log(`Using API ${API_BASE}`);

  if (cleanup) {
    console.log('Cleanup mode: deleting test users + paywall-e2e codes.');
    await deleteIssuedTestCodes();
    await deleteUserIfExists(ADMIN_EMAIL);
    await deleteUserIfExists(FREE_EMAIL);
    console.log('Done.');
    return;
  }

  console.log('\n[setup] Ensuring test users exist…');
  const admin = await ensureUser(ADMIN_EMAIL, TEST_PASSWORD);
  const free = await ensureUser(FREE_EMAIL, TEST_PASSWORD);
  console.log(`  admin user: ${admin.id} (${admin.email})`);
  console.log(`  free user:  ${free.id} (${free.email})`);

  await waitForBackend();

  await phaseA(admin);
  await phaseB(free);
  await phaseC(free, admin);
  await phaseD(free);

  // Final entitlement reset so the test users are in a known state for reruns.
  await setEntitlement(admin.id, {
    is_admin: false,
    is_premium: false,
    subscription_tier: null,
    entitlement_source: null,
    subscription_expires_at: null,
  });
  await setEntitlement(free.id, {
    is_admin: false,
    is_premium: false,
    subscription_tier: null,
    entitlement_source: null,
    subscription_expires_at: null,
  });

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  console.log(`\n== Summary: ${passed}/${results.length} passed (${failed} failed) ==`);
  if (failed > 0) {
    console.log('\nFailures:');
    for (const r of results.filter((x) => !x.passed)) {
      console.log(`  - ${r.name}: ${r.detail ?? ''}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(2);
});
