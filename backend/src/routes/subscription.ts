import { Router, Request, Response } from 'express';

const router = Router();

/**
 * Verify subscription status via RevenueCat server-side API.
 * This is a defense-in-depth endpoint — the mobile app checks
 * RevenueCat client-side, but the backend can also verify
 * to prevent tampering.
 */
router.get('/verify', async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const rcApiKey = process.env.REVENUECAT_API_KEY;
  if (!rcApiKey) {
    res.json({ isPremium: false, source: 'no_rc_key' });
    return;
  }

  try {
    const response = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${userId}`,
      {
        headers: {
          'Authorization': `Bearer ${rcApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('[Subscription] RevenueCat API error:', response.status);
      res.json({ isPremium: false, source: 'rc_error' });
      return;
    }

    const data = await response.json() as any;
    const entitlements = data?.subscriber?.entitlements || {};
    const premium = entitlements['premium'];
    const isActive = premium && new Date(premium.expires_date) > new Date();

    res.json({ isPremium: !!isActive, expiresDate: premium?.expires_date || null });
  } catch (error) {
    console.error('[Subscription] Verification error:', error);
    res.json({ isPremium: false, source: 'error' });
  }
});

export default router;
