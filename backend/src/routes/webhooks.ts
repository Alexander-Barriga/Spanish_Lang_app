import { Router, Request, Response } from 'express';
import { supabaseAdmin, SubscriptionTier } from '../config/supabase';

const router = Router();

/**
 * Map RevenueCat product identifiers to our internal subscription tier label.
 * Keep in sync with the products created in App Store Connect.
 */
const PRODUCT_ID_TO_TIER: Record<string, SubscriptionTier> = {
  spanishlab_monthly_1499: 'monthly',
  spanishlab_annual_9999: 'annual',
};

const tierFromProductId = (productId: string | undefined): SubscriptionTier | null => {
  if (!productId) return null;
  return PRODUCT_ID_TO_TIER[productId] ?? null;
};

/**
 * RevenueCat webhook events we care about. See:
 * https://www.revenuecat.com/docs/integrations/webhooks/event-flows
 */
type RcEventType =
  | 'INITIAL_PURCHASE'
  | 'RENEWAL'
  | 'PRODUCT_CHANGE'
  | 'CANCELLATION'
  | 'EXPIRATION'
  | 'BILLING_ISSUE'
  | 'NON_RENEWING_PURCHASE'
  | 'SUBSCRIBER_ALIAS'
  | 'TRANSFER'
  | 'UNCANCELLATION';

interface RcWebhookEvent {
  type: RcEventType;
  app_user_id: string;
  original_app_user_id?: string;
  aliases?: string[];
  product_id?: string;
  expiration_at_ms?: number;
  purchased_at_ms?: number;
  entitlement_id?: string | null;
  entitlement_ids?: string[] | null;
  store?: string;
}

interface RcWebhookPayload {
  event: RcWebhookEvent;
  api_version?: string;
}

/**
 * RevenueCat webhook receiver. Configure the dashboard to send events here
 * with an Authorization header of `Bearer ${RC_WEBHOOK_SECRET}`.
 *
 * Mounted at `/api/v1/webhooks/revenuecat`. NO auth middleware applies here:
 * the request is signed by RevenueCat, not by an end user.
 */
router.post('/revenuecat', async (req: Request, res: Response) => {
  const expectedSecret = process.env.RC_WEBHOOK_SECRET;
  if (!expectedSecret) {
    console.error('[Webhook] RC_WEBHOOK_SECRET is not configured; rejecting all webhooks.');
    res.status(503).json({ error: 'Webhook receiver not configured' });
    return;
  }

  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${expectedSecret}`) {
    console.warn('[Webhook] Rejected RevenueCat webhook: bad authorization header');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const payload = req.body as RcWebhookPayload | undefined;
  const event = payload?.event;
  if (!event || !event.type || !event.app_user_id) {
    res.status(400).json({ error: 'Malformed RevenueCat webhook payload' });
    return;
  }

  const userId = event.app_user_id;
  const eventType = event.type;
  const productId = event.product_id;
  const expiresAtMs = event.expiration_at_ms;
  const expiresAt = expiresAtMs ? new Date(expiresAtMs).toISOString() : null;
  const tier = tierFromProductId(productId) ?? 'monthly';

  console.log(`[Webhook] RC event ${eventType} for ${userId} (product=${productId})`);

  try {
    // Fetch the current entitlement source so we never accidentally overwrite a
    // comp_code / admin entitlement with a stale RC event.
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('entitlement_source, is_premium')
      .eq('id', userId)
      .single();

    const sourceIsLocked =
      existing?.entitlement_source === 'comp_code' ||
      existing?.entitlement_source === 'admin';

    if (sourceIsLocked) {
      console.log(`[Webhook] Skipping update for ${userId}: entitlement_source=${existing?.entitlement_source} (locked)`);
      res.json({ ok: true, skipped: true, reason: 'entitlement_locked_to_non_revenuecat_source' });
      return;
    }

    let update: Record<string, unknown> | null = null;

    switch (eventType) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'UNCANCELLATION':
      case 'PRODUCT_CHANGE':
      case 'NON_RENEWING_PURCHASE':
        update = {
          is_premium: true,
          subscription_tier: tier,
          subscription_expires_at: expiresAt,
          entitlement_source: 'revenuecat',
          revenuecat_app_user_id: userId,
          updated_at: new Date().toISOString(),
        };
        break;

      case 'CANCELLATION':
        // User cancelled but the period may still be active until expiration_at_ms.
        // Keep is_premium true; just record the upcoming end date.
        if (expiresAt) {
          update = {
            subscription_expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          };
        }
        break;

      case 'EXPIRATION':
      case 'BILLING_ISSUE':
        update = {
          is_premium: false,
          subscription_tier: 'free',
          subscription_expires_at: expiresAt,
          entitlement_source: null,
          updated_at: new Date().toISOString(),
        };
        break;

      case 'SUBSCRIBER_ALIAS':
      case 'TRANSFER':
        // Identity events; no entitlement change required for our model.
        break;

      default:
        console.log(`[Webhook] Unhandled RC event type: ${eventType}`);
    }

    if (update) {
      const { error } = await supabaseAdmin
        .from('users')
        .update(update)
        .eq('id', userId);
      if (error) {
        console.error('[Webhook] Failed to update user:', error);
        res.status(500).json({ error: 'Update failed' });
        return;
      }
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('[Webhook] Handler error:', error);
    res.status(500).json({ error: 'Handler error' });
  }
});

export default router;
