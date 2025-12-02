import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';

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

