import { prisma } from './prisma';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'jbiet_session';
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

export interface SessionUser {
  id: string;
  username: string;
  role: string;
  email: string | null;
  mustChangePassword: boolean;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function createSession(userId: string): Promise<string> {
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  return token;
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) return null;

  const session = await prisma.session.findUnique({
    where: { token: sessionToken },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } });
    }
    return null;
  }

  return {
    id: session.user.id,
    username: session.user.username,
    role: session.user.role,
    email: session.user.email,
    mustChangePassword: session.user.mustChangePassword,
  };
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    await prisma.session.deleteMany({ where: { token: sessionToken } });
    cookieStore.delete(SESSION_COOKIE_NAME);
  }
}

export async function invalidateAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

export function setSessionCookie(token: string): void {
  // This is called from API routes where we can set headers
  // The actual cookie setting happens in the route handler
}

export function getSessionCookieOptions() {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_DURATION_MS / 1000,
  };
}

// Rate limiting for login
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

export function checkRateLimit(key: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record) {
    loginAttempts.set(key, { count: 1, lastAttempt: now });
    return { allowed: true };
  }

  // Reset after 15 minutes
  if (now - record.lastAttempt > 15 * 60 * 1000) {
    loginAttempts.set(key, { count: 1, lastAttempt: now });
    return { allowed: true };
  }

  if (record.count >= 5) {
    const retryAfter = Math.ceil((15 * 60 * 1000 - (now - record.lastAttempt)) / 1000);
    return { allowed: false, retryAfter };
  }

  record.count++;
  record.lastAttempt = now;
  return { allowed: true };
}

export function requireRole(userRole: string, allowedRoles: string[]): boolean {
  return allowedRoles.includes(userRole);
}
