import { Request, Response, NextFunction } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

/**
 * Ensures the authenticated user has a row in public.users table.
 * This handles cases where users signed up through Supabase Auth directly
 * or where profile creation failed during signup.
 */
export const ensureUserExists = async (userId: string, email: string): Promise<boolean> => {
  try {
    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (existingUser) {
      return true; // User already exists
    }

    // Create the user profile
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
      return false;
    }

    console.log('✅ Created user profile for:', userId);
    return true;
  } catch (error) {
    console.error('Error in ensureUserExists:', error);
    return false;
  }
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

    // Ensure user exists in public.users table
    await ensureUserExists(user.id, user.email || '');

    req.user = {
      id: user.id,
      email: user.email || '',
    };

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
      
      // Ensure user exists in public.users table
      await ensureUserExists(user.id, user.email || '');
      
      req.user = {
        id: user.id,
        email: user.email || '',
      };
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

