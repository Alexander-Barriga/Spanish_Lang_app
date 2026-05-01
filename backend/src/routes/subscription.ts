import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';

const router = Router();

router.use(authenticateToken);

/**
 * Returns the cached entitlement state for the authenticated user.
 *
 * The mobile app reads this on launch and after any purchase / redemption to
 * keep its own UI in sync with the source-of-truth on the backend (which is
 * itself updated via the RevenueCat webhook and the redemption endpoint).
 */
router.get('/status', async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  // Effective premium access: cached entitlement OR admin bypass. The mobile
  // client mirrors this OR client-side; making the API agree keeps behaviour
  // consistent across the two sources of truth.
  const effectivePremium = !!req.user.is_admin || !!req.user.is_premium;

  res.json({
    isPremium: effectivePremium,
    tier: req.user.subscription_tier ?? null,
    expiresAt: req.user.subscription_expires_at ?? null,
    source: req.user.entitlement_source ?? null,
  });
});

/**
 * Defense-in-depth verify endpoint. Forces a fresh lookup from RevenueCat's
 * REST API (bypassing the cached `users.is_premium`) and reconciles the cache
 * if they disagree. Useful as a fallback when the webhook is delayed.
 */
router.get('/verify', async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const userId = req.user.id;
  const rcSecretKey = process.env.REVENUECAT_SECRET_KEY;

  if (!rcSecretKey) {
    res.json({
      isPremium: !!req.user.is_premium,
      source: req.user.entitlement_source ?? 'cache_only',
    });
    return;
  }

  try {
    const response = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${rcSecretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('[Subscription] RevenueCat API error:', response.status);
      res.json({
        isPremium: !!req.user.is_premium,
        source: req.user.entitlement_source ?? 'rc_error_fallback_cache',
      });
      return;
    }

    const data = (await response.json()) as any;
    const entitlements = data?.subscriber?.entitlements || {};
    const premium = entitlements['premium'];
    const expiresDate: string | null = premium?.expires_date ?? null;
    const isActive = !!premium && (!expiresDate || new Date(expiresDate).getTime() > Date.now());

    // If RC disagrees with our cache, only update when RC says "active" or
    // when our cache says "active" but the RC-sourced entitlement has lapsed.
    // Comp/admin entitlements are never overwritten by this reconciliation.
    if (req.user.entitlement_source !== 'comp_code' && req.user.entitlement_source !== 'admin') {
      if (!!isActive !== !!req.user.is_premium) {
        await supabaseAdmin
          .from('users')
          .update({
            is_premium: isActive,
            subscription_expires_at: expiresDate,
            entitlement_source: isActive ? 'revenuecat' : null,
            subscription_tier: isActive ? req.user.subscription_tier ?? 'monthly' : 'free',
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
      }
    }

    res.json({
      isPremium: !!isActive,
      expiresAt: expiresDate,
      source: 'revenuecat',
    });
  } catch (error) {
    console.error('[Subscription] Verification error:', error);
    res.json({
      isPremium: !!req.user.is_premium,
      source: req.user.entitlement_source ?? 'error_fallback_cache',
    });
  }
});

export default router;
