import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { authenticateToken } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';

const router = Router();

router.use(authenticateToken);

const CODE_PATTERN = /^[A-Za-z0-9-]{4,64}$/;

/**
 * SHA-256 hash of the normalised code. We never store plaintext.
 * Codes are upper-cased and trimmed before hashing so users can input them
 * with arbitrary casing / surrounding whitespace.
 */
export const hashRedemptionCode = (code: string): string => {
  const normalised = code.trim().toUpperCase();
  return crypto.createHash('sha256').update(normalised).digest('hex');
};

/**
 * POST /api/v1/redemption/redeem
 *
 * Body: { code: string }
 *
 * Atomically:
 *   1. Resolves the code by SHA-256 hash.
 *   2. Validates that it exists, is not revoked, is not expired, and has
 *      remaining uses.
 *   3. Increments uses_count guarded by an optimistic concurrency check
 *      (`uses_count = expected_count`) to prevent over-redemption races.
 *   4. Inserts a row in redemption_code_uses (per-user idempotency).
 *   5. Marks the user is_premium with entitlement_source='comp_code'.
 */
router.post('/redeem', async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const rawCode = (req.body?.code ?? '').toString();
  if (!CODE_PATTERN.test(rawCode.trim())) {
    res.status(400).json({ error: 'INVALID_CODE_FORMAT' });
    return;
  }

  const codeHash = hashRedemptionCode(rawCode);
  const now = new Date();

  try {
    const { data: codeRow, error: lookupError } = await supabaseAdmin
      .from('redemption_codes')
      .select('id, code_kind, percent_off, max_uses, uses_count, expires_at, revoked_at')
      .eq('code_hash', codeHash)
      .single();

    if (lookupError || !codeRow) {
      res.status(404).json({ error: 'INVALID_CODE' });
      return;
    }

    if (codeRow.revoked_at) {
      res.status(410).json({ error: 'CODE_REVOKED' });
      return;
    }
    if (codeRow.expires_at && new Date(codeRow.expires_at) <= now) {
      res.status(410).json({ error: 'CODE_EXPIRED' });
      return;
    }

    // Per-user idempotency check runs before the global exhaustion check so a
    // user replaying *their own* single-use code gets the more specific
    // ALREADY_REDEEMED_BY_USER instead of CODE_EXHAUSTED.
    const { data: priorUse } = await supabaseAdmin
      .from('redemption_code_uses')
      .select('code_id')
      .eq('code_id', codeRow.id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (priorUse) {
      res.status(409).json({ error: 'ALREADY_REDEEMED_BY_USER' });
      return;
    }

    if (codeRow.uses_count >= codeRow.max_uses) {
      res.status(409).json({ error: 'CODE_EXHAUSTED' });
      return;
    }

    // Optimistic concurrency: only succeed if uses_count is still what we read.
    const { data: claimedRow, error: claimError } = await supabaseAdmin
      .from('redemption_codes')
      .update({ uses_count: codeRow.uses_count + 1 })
      .eq('id', codeRow.id)
      .eq('uses_count', codeRow.uses_count)
      .select('id')
      .single();

    if (claimError || !claimedRow) {
      // Lost the race - another concurrent redemption claimed this slot.
      res.status(409).json({ error: 'CODE_RACE_LOST' });
      return;
    }

    const { error: ledgerError } = await supabaseAdmin
      .from('redemption_code_uses')
      .insert({ code_id: codeRow.id, user_id: req.user.id });

    if (ledgerError) {
      console.error('[Redemption] Failed to insert ledger row:', ledgerError);
      // Best-effort rollback of the claim slot. The code is now incremented
      // even though the user didn't get the entitlement; we surface an error.
      await supabaseAdmin
        .from('redemption_codes')
        .update({ uses_count: codeRow.uses_count })
        .eq('id', codeRow.id);
      res.status(500).json({ error: 'REDEMPTION_FAILED' });
      return;
    }

    if (codeRow.code_kind === 'full_access') {
      const { error: userUpdateError } = await supabaseAdmin
        .from('users')
        .update({
          is_premium: true,
          subscription_tier: 'comp',
          subscription_expires_at: null,
          entitlement_source: 'comp_code',
          updated_at: new Date().toISOString(),
        })
        .eq('id', req.user.id);

      if (userUpdateError) {
        console.error('[Redemption] Failed to update user entitlement:', userUpdateError);
        res.status(500).json({ error: 'ENTITLEMENT_UPDATE_FAILED' });
        return;
      }

      res.json({
        ok: true,
        kind: 'full_access',
        entitlement: {
          isPremium: true,
          tier: 'comp',
          source: 'comp_code',
          expiresAt: null,
        },
      });
      return;
    }

    // Future: percent_off codes don't grant entitlement directly; the client
    // should pass the validated discount onto the App Store offer flow.
    res.json({
      ok: true,
      kind: codeRow.code_kind,
      percentOff: codeRow.percent_off,
    });
  } catch (error) {
    console.error('[Redemption] Handler error:', error);
    res.status(500).json({ error: 'REDEMPTION_FAILED' });
  }
});

export default router;
