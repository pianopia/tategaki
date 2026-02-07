import { cookies } from 'next/headers';

import { eq } from 'drizzle-orm';

import { getDb } from '@/db/client';
import { sessions, users } from '@/db/schema';

export const SESSION_COOKIE_NAME = 'tategaki_session';
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export type SessionUser = {
  sessionId: string;
  expiresAt: number;
  user: {
    id: string;
    email: string;
    displayName: string | null;
  };
};

export const getSessionUser = async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionId) return null;

  const db = getDb();
  const result = await db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      userId: users.id,
      email: users.email,
      displayName: users.displayName,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, sessionId))
    .limit(1);

  const record = result[0];
  if (!record) {
    cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }

  if (record.expiresAt <= Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }

  return {
    sessionId: record.sessionId,
    expiresAt: record.expiresAt,
    user: {
      id: record.userId,
      email: record.email,
      displayName: record.displayName,
    },
  };
};

export const destroySession = async () => {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionId) return;

  cookieStore.delete(SESSION_COOKIE_NAME);
  const db = getDb();
  await db.delete(sessions).where(eq(sessions.id, sessionId));
};

export const persistSessionCookie = async (
  sessionId: string,
  expiresAt: number
) => {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(expiresAt),
  });
};
