import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getSessionUser } from '@/app/api/_lib/auth';
import { getDb } from '@/db/client';
import { featureRequests } from '@/db/schema';

const requestSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().max(80).optional(),
  message: z.string().trim().min(10).max(5000),
});

export async function POST(request: Request) {
  try {
    const payload = requestSchema.parse(await request.json());
    const session = await getSessionUser();
    const db = getDb();

    const inserted = await db
      .insert(featureRequests)
      .values({
        userId: session?.user.id ?? null,
        email: payload.email,
        name: payload.name || session?.user.displayName || null,
        message: payload.message,
        status: 'new',
      })
      .returning({ id: featureRequests.id, createdAt: featureRequests.createdAt });

    return NextResponse.json({ ok: true, request: inserted[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '入力内容を確認してください', details: error.issues },
        { status: 400 }
      );
    }

    console.error('[requests] failed', error);
    return NextResponse.json(
      { error: '要望の送信に失敗しました。時間をおいて再試行してください。' },
      { status: 500 }
    );
  }
}
