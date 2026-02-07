import { NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';

import { getDb } from '@/db/client';
import { documentRevisions, documents } from '@/db/schema';

import { getSessionUser } from '../../_lib/auth';

const saveSchema = z.object({
  documentId: z.string().uuid().optional(),
  title: z.string().min(1).max(120),
  content: z.string().min(0),
  pages: z
    .array(z.object({ id: z.string(), content: z.string() }))
    .optional(),
  createRevision: z.boolean().optional(),
});

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const db = getDb();
  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      updatedAt: documents.updatedAt,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(eq(documents.userId, session.user.id))
    .orderBy(desc(documents.updatedAt));

  return NextResponse.json({ documents: rows });
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  try {
    const payload = saveSchema.parse(await request.json());
    const db = getDb();
    const now = Date.now();

    const values = {
      title: payload.title,
      content: payload.content,
      pagesJson: payload.pages ? JSON.stringify(payload.pages) : null,
      updatedAt: now,
    } as const;

    let savedDocument;

    if (payload.documentId) {
      const updated = await db
        .update(documents)
        .set(values)
        .where(
          and(
            eq(documents.id, payload.documentId),
            eq(documents.userId, session.user.id)
          )
        )
        .returning({
          id: documents.id,
          title: documents.title,
          updatedAt: documents.updatedAt,
        });

      savedDocument = updated[0];
    } else {
      const inserted = await db
        .insert(documents)
        .values({
          userId: session.user.id,
          title: payload.title,
          content: payload.content,
          pagesJson: payload.pages ? JSON.stringify(payload.pages) : null,
          updatedAt: now,
          createdAt: now,
        })
        .returning({
          id: documents.id,
          title: documents.title,
          updatedAt: documents.updatedAt,
        });

      savedDocument = inserted[0];
    }

    if (!savedDocument) {
      return NextResponse.json(
        { error: '対象のテキストが見つかりません' },
        { status: 404 }
      );
    }

    const shouldCreateRevision = payload.createRevision !== false;
    if (savedDocument && shouldCreateRevision) {
      await db.insert(documentRevisions).values({
        documentId: savedDocument.id,
        userId: session.user.id,
        title: payload.title,
        content: payload.content,
        pagesJson: payload.pages ? JSON.stringify(payload.pages) : null,
        createdAt: now,
      });
    }

    return NextResponse.json({ document: savedDocument });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '入力内容を確認してください' }, { status: 400 });
    }
    console.error('[cloud/documents] save failed', error);
    return NextResponse.json({ error: 'クラウド保存に失敗しました' }, { status: 500 });
  }
}
