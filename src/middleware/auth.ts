import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface JwtPayload {
  sub: number; // user id
  role: 'producer' | 'consumer' | 'admin';
  name?: string;
  email?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }
  const token = header.substring('Bearer '.length);
  try {
    const secret = process.env.JWT_SECRET || 'please_change_me';
    const decoded = jwt.verify(token, secret);
    const maybe = decoded as Partial<JwtPayload>;
    if (!maybe || typeof maybe !== 'object' || typeof maybe.sub !== 'number' || !maybe.role) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }
    req.user = { sub: maybe.sub, role: maybe.role, name: maybe.name, email: maybe.email } as JwtPayload;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireRole(roles: Array<JwtPayload['role']>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    return next();
  };
}


