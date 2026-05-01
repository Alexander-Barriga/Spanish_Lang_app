import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';

/**
 * 403 envelope used by every paywalled endpoint. The mobile client matches on
 * `code === 'PAYWALL'` to route the user to the paywall screen.
 */
const PAYWALL_RESPONSE = {
  error: 'Premium subscription required',
  code: 'PAYWALL' as const,
  tier: 'free' as const,
};

/**
 * Strict premium gate. Must run AFTER `authenticateToken` so `req.user` is
 * populated. Admins bypass the gate.
 */
export const requirePremium = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.user.is_admin || req.user.is_premium) {
    return next();
  }
  return res.status(403).json(PAYWALL_RESPONSE);
};

/**
 * Free users may access episode 1 ("E1 always free"); episodes >= 2 require
 * premium. Pass a function that extracts the episode number from the request
 * (route param, body, or query). If extraction fails, we err on the side of
 * gating to avoid leaking content.
 */
export const requirePremiumForEpisode = (
  getEpisodeNumber: (req: Request) => number | undefined
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (req.user.is_admin || req.user.is_premium) {
      return next();
    }
    const episodeNumber = getEpisodeNumber(req);
    if (typeof episodeNumber === 'number' && episodeNumber <= 1) {
      return next();
    }
    return res.status(403).json(PAYWALL_RESPONSE);
  };
};

/**
 * Async variant that resolves the episode_number from the `episodes` table
 * given an `episodeId` route param (or any field-extractor passed in).
 *
 * Behaviour:
 *  - admin / premium / valid episode_number === 1: pass-through.
 *  - episode_number > 1 + free user: 403 PAYWALL.
 *  - missing param: 400 (callers should always provide an episodeId).
 *  - episode lookup fails: 404 (don't leak existence).
 */
export const requirePremiumForEpisodeId = (
  getEpisodeId: (req: Request) => string | undefined = (req) => req.params.episodeId
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (req.user.is_admin || req.user.is_premium) {
      return next();
    }

    const episodeId = getEpisodeId(req);
    if (!episodeId) {
      return res.status(400).json({ error: 'Missing episode id' });
    }

    try {
      const { data, error } = await supabaseAdmin
        .from('episodes')
        .select('episode_number')
        .eq('id', episodeId)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: 'Episode not found' });
      }

      if ((data.episode_number ?? 0) <= 1) {
        return next();
      }

      return res.status(403).json(PAYWALL_RESPONSE);
    } catch (err) {
      console.error('[requirePremiumForEpisodeId] lookup error:', err);
      return res.status(500).json({ error: 'Authorization check failed' });
    }
  };
};

/**
 * Like `requirePremiumForEpisodeId` but resolves the episode via a conversation
 * id (`req.params.conversationId`). Used by routes that operate on an existing
 * episode_conversations row.
 */
export const requirePremiumForConversationId = (
  conversationTable: string,
  getConversationId: (req: Request) => string | undefined = (req) => req.params.conversationId
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (req.user.is_admin || req.user.is_premium) {
      return next();
    }

    const conversationId = getConversationId(req);
    if (!conversationId) {
      return res.status(400).json({ error: 'Missing conversation id' });
    }

    try {
      const { data: conv, error: convErr } = await supabaseAdmin
        .from(conversationTable)
        .select('episode_id')
        .eq('id', conversationId)
        .single();

      if (convErr || !conv?.episode_id) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      const { data: ep, error: epErr } = await supabaseAdmin
        .from('episodes')
        .select('episode_number')
        .eq('id', conv.episode_id)
        .single();

      if (epErr || !ep) {
        return res.status(404).json({ error: 'Episode not found' });
      }

      if ((ep.episode_number ?? 0) <= 1) {
        return next();
      }

      return res.status(403).json(PAYWALL_RESPONSE);
    } catch (err) {
      console.error('[requirePremiumForConversationId] lookup error:', err);
      return res.status(500).json({ error: 'Authorization check failed' });
    }
  };
};
