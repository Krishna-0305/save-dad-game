import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { User, IUser } from '../models/User.js';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.cookies[config.COOKIE_NAME] || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const decoded = jwt.verify(token, config.JWT_SECRET) as { userId: string };
    const user = await User.findById(decoded.userId);

    if (!user || user.accountStatus !== 'active') {
      res.clearCookie(config.COOKIE_NAME, {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'lax'
      });
      res.status(401).json({ error: 'Invalid or suspended session' });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    res.clearCookie(config.COOKIE_NAME, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    res.status(401).json({ error: 'Session expired or invalid' });
  }
}

export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.cookies[config.COOKIE_NAME] || req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      const decoded = jwt.verify(token, config.JWT_SECRET) as { userId: string };
      const user = await User.findById(decoded.userId);
      if (user && user.accountStatus === 'active') {
        req.user = user;
      } else {
        res.clearCookie(config.COOKIE_NAME, {
          httpOnly: true,
          secure: config.NODE_ENV === 'production',
          sameSite: config.NODE_ENV === 'production' ? 'none' : 'lax'
        });
      }
    }
  } catch {
    // Ignore invalid token for optional auth
  }
  next();
}
