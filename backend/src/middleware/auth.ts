import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';

export type AuthedUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  storeId: string | null;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthedUser;
    }
  }
}

const SECRET = process.env.JWT_SECRET || 'dev-secret';

export function signToken(user: AuthedUser): string {
  return jwt.sign(user, SECRET, { expiresIn: '8h' });
}

export function verifyToken(token: string): AuthedUser {
  return jwt.verify(token, SECRET) as AuthedUser;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    req.user = verifyToken(auth.slice(7));
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
