import { Request, Response, NextFunction } from 'express';
import { supabase, supabaseAdmin, SubscriptionTier, EntitlementSource } from '../config/supabase';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        is_admin?: boolean;
        is_premium?: boolean;
        subscription_tier?: SubscriptionTier | null;
        subscription_expires_at?: string | null;
        entitlement_source?: EntitlementSource | null;
      };
    }
  }
}

interface UserProfileEssentials {
  exists: boolean;
  is_admin: boolean;
  is_premium: boolean;
  subscription_tier: SubscriptionTier | null;
  subscription_expires_at: string | null;
  entitlement_source: EntitlementSource | null;
}

const EMPTY_PROFILE: UserProfileEssentials = {
  exists: false,
  is_admin: false,
  is_premium: false,
  subscription_tier: null,
  subscription_expires_at: null,
  entitlement_source: null,
};

/**
 * Returns true when the cached entitlement on the users row is still valid.
 * For comp codes / admin overrides we trust the flag directly; for paid
 * subscriptions we also require subscription_expires_at to be in the future
 * (or NULL, which we treat as a non-expiring entitlement).
 */
const isEntitlementCurrentlyActive = (row: {
  is_premium: boolean | null;
  subscription_tier: SubscriptionTier | null;
  subscription_expires_at: string | null;
  entitlement_source: EntitlementSource | null;
}): boolean => {
  if (!row.is_premium) return false;
  if (row.entitlement_source === 'comp_code' || row.entitlement_source === 'admin') {
    return true;
  }
  if (!row.subscription_expires_at) return true;
  return new Date(row.subscription_expires_at).getTime() > Date.now();
};

/**
 * Ensures the authenticated user has a row in public.users table and returns
 * the entitlement-relevant fields so the request handler can use them without
 * an extra query.
 */
export const ensureUserExists = async (
  userId: string,
  email: string
): Promise<UserProfileEssentials> => {
  try {
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, is_admin, is_premium, subscription_tier, subscription_expires_at, entitlement_source')
      .eq('id', userId)
      .single();

    if (existingUser) {
      const active = isEntitlementCurrentlyActive(existingUser);
      return {
        exists: true,
        is_admin: !!existingUser.is_admin,
        is_premium: active,
        subscription_tier: existingUser.subscription_tier ?? null,
        subscription_expires_at: existingUser.subscription_expires_at ?? null,
        entitlement_source: existingUser.entitlement_source ?? null,
      };
    }

    console.log('📝 Creating missing user profile for:', userId);
    const { error: createError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        email: email,
        spanish_level: 'A1',
        goals: [],
        preferred_topics: [],
        correction_depth: 'standard',
        voice_speed: 1.0,
        accent_preference: 'mexico',
      });

    if (createError) {
      console.error('❌ Failed to create user profile:', createError);
      return EMPTY_PROFILE;
    }

    console.log('✅ Created user profile for:', userId);
    return { ...EMPTY_PROFILE, exists: true };
  } catch (error) {
    console.error('Error in ensureUserExists:', error);
    return EMPTY_PROFILE;
  }
};

const attachUser = (req: Request, profile: UserProfileEssentials, userId: string, email: string) => {
  req.user = {
    id: userId,
    email,
    is_admin: profile.is_admin,
    is_premium: profile.is_premium,
    subscription_tier: profile.subscription_tier,
    subscription_expires_at: profile.subscription_expires_at,
    entitlement_source: profile.entitlement_source,
  };
};

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.substring(7);

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const profile = await ensureUserExists(user.id, user.email || '');
    attachUser(req, profile, user.id, user.email || '');

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Optional auth - allows unauthenticated requests but populates user if token provided
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      console.log('🔓 No auth header provided for:', req.path);
      return next();
    }

    const token = authHeader.substring(7);
    console.log('🔑 Auth token received for:', req.path, '- Token length:', token.length);

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
      console.log('❌ Token validation error:', error.message);
    }

    if (user) {
      console.log('✅ User authenticated:', user.id);

      const profile = await ensureUserExists(user.id, user.email || '');
      attachUser(req, profile, user.id, user.email || '');
    } else {
      console.log('⚠️ No user found for token');
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    // Don't fail on auth errors for optional auth
    next();
  }
};

