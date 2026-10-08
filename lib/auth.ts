import jwt from 'jsonwebtoken';

export interface AuthPayload {
  userId: number;
}

export function generateToken(userId: number): string {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'dev-secret-key',
    { expiresIn: process.env.JWT_EXPIRY || '7d' }
  );
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'dev-secret-key'
    );
    return decoded as AuthPayload;
  } catch {
    return null;
  }
}

export function getTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
}
