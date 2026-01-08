import { Request, Response, NextFunction } from 'express';
import { validateSession, AuthUser } from '../services/auth.js';

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  const token = authHeader.substring(7);
  const user = await validateSession(token);

  if (!user) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
    return;
  }

  req.user = user;
  next();
}

export function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    validateSession(token).then((user) => {
      if (user) {
        req.user = user;
      }
      next();
    });
  } else {
    next();
  }
}
