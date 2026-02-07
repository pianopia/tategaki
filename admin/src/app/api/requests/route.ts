import { desc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { featureRequests } from '@/lib/schema';

const updateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['new', 'reviewed']),
});

export async function GET(request: Request) {
  await requireAdmin();
  const db = getDb();
  const url = new URL(request.url);
  const status = url.searchParams.get('status');

  const whereClause =
    status === 'new' || status === 'reviewed' ? eq(featureRequests.status, status) : undefined;

  const rows = await db
    .select()
    .from(featureRequests)
    .where(whereClause)
    .orderBy(desc(featureRequests.createdAt));

  return NextResponse.json({ requests: rows });
}

export async function PATCH(request: Request) {
  await requireAdmin();
  const db = getDb();

  try {
    const payload = updateSchema.parse(await request.json());

    const updated = await db
      .update(featureRequests)
      .set({ status: payload.status })
      .where(eq(featureRequests.id, payload.id))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: '対象の要望が見つかりません' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, request: updated[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '入力内容を確認してください' }, { status: 400 });
    }

    console.error('[admin/requests] failed', error);
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 });
  }
}
