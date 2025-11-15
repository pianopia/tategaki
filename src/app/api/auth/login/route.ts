import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { getDb } from '@/db/client';
import { sessions, users } from '@/db/schema';

import { persistSessionCookie, SESSION_TTL_MS } from '../../_lib/auth';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(80).optional(),
  mode: z.enum(['login', 'signup']).default('login'),
});

export async function POST(request: Request) {
  try {
    const payload = loginSchema.parse(await request.json());
    const db = getDb();

    const existingUserResult = await db
      .select()
      .from(users)
      .where(eq(users.email, payload.email))
      .limit(1);

    let userRecord = existingUserResult[0] ?? null;

    if (payload.mode === 'signup') {
      if (userRecord && userRecord.passwordHash) {
        return NextResponse.json(
          { error: 'このメールアドレスは既に登録されています' },
          { status: 409 }
        );
      }

      const passwordHash = await bcrypt.hash(payload.password, 12);

      if (userRecord) {
        const updated = await db
          .update(users)
          .set({
            passwordHash,
            displayName: payload.displayName ?? userRecord.displayName ?? null,
          })
          .where(eq(users.id, userRecord.id))
          .returning();
        userRecord = updated[0];
      } else {
        const inserted = await db
          .insert(users)
          .values({
            email: payload.email,
            displayName: payload.displayName ?? null,
            passwordHash,
          })
          .returning();
        userRecord = inserted[0];
      }
    } else {
      if (!userRecord || !userRecord.passwordHash) {
        return NextResponse.json(
          { error: 'メールアドレスまたはパスワードが正しくありません' },
          { status: 401 }
        );
      }

      const isPasswordValid = await bcrypt.compare(
        payload.password,
        userRecord.passwordHash
      );

      if (!isPasswordValid) {
        return NextResponse.json(
          { error: 'メールアドレスまたはパスワードが正しくありません' },
          { status: 401 }
        );
      }

      if (
        payload.displayName &&
        payload.displayName !== userRecord.displayName
      ) {
        const updated = await db
          .update(users)
          .set({ displayName: payload.displayName })
          .where(eq(users.id, userRecord.id))
          .returning();
        userRecord = updated[0];
      }
    }

    if (!userRecord) {
      return NextResponse.json(
        { error: 'ユーザー情報の取得に失敗しました' },
        { status: 500 }
      );
    }

    const expiresAt = Date.now() + SESSION_TTL_MS;
    const sessionId = crypto.randomUUID();

    await db.insert(sessions).values({
      id: sessionId,
      userId: userRecord.id,
      expiresAt,
    });

    await persistSessionCookie(sessionId, expiresAt);

    return NextResponse.json({
      user: {
        id: userRecord.id,
        email: userRecord.email,
        displayName: userRecord.displayName,
      },
      expiresAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '入力内容を確認してください', details: error.issues },
        { status: 400 }
      );
    }
    console.error('[auth/login] failed', error);
    return NextResponse.json(
      { error: 'ログイン処理に失敗しました' },
      { status: 500 }
    );
  }
}
