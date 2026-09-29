import jwt from 'jsonwebtoken';
import { AppError } from '../errors/AppError';

export interface JwtPayload {
  sub: string;
  email?: string;
  role?: string;
}

// ─── Access Token (15 minutos) ──────────────────────────────────────────────

export function signAccessToken(payload: JwtPayload): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new AppError(500, 'JWT_ACCESS_SECRET is not configured');
  return jwt.sign(payload, secret, { expiresIn: '15m' });
}

export function verifyAccessToken(token: string): JwtPayload {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new AppError(500, 'JWT_ACCESS_SECRET is not configured');
  return jwt.verify(token, secret) as JwtPayload;
}

// ─── Refresh Token (7 días) ─────────────────────────────────────────────────

export function signRefreshToken(payload: Pick<JwtPayload, 'sub'>): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new AppError(500, 'JWT_REFRESH_SECRET is not configured');
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

export function verifyRefreshToken(token: string): JwtPayload {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new AppError(500, 'JWT_REFRESH_SECRET is not configured');
  return jwt.verify(token, secret) as JwtPayload;
}
