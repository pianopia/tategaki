import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { getDb } from '@/db/client';
import { documents } from '@/db/schema';

import { getSessionUser } from '../../../_lib/auth';

type DocumentParams = {
  params: {
    documentId?: string;
  };
};

export async function GET(_request: Request, context: DocumentParams) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  try {
    const documentId = context.params?.documentId;
    if (!documentId) {
      return NextResponse.json(
        { error: '不正なパラメータです' },
        { status: 400 }
      );
    }
    const db = getDb();

    const result = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.id, documentId),
          eq(documents.userId, session.user.id)
        )
      )
      .limit(1);

    const record = result[0];
    if (!record) {
      return NextResponse.json({ error: 'データが見つかりません' }, { status: 404 });
    }

    let pages: unknown = null;
    if (record.pagesJson) {
      try {
        pages = JSON.parse(record.pagesJson);
      } catch (parseError) {
        console.error('[cloud/document] parse error', parseError);
      }
    }

    return NextResponse.json({
      document: {
        id: record.id,
        title: record.title,
        content: record.content,
        pages,
        updatedAt: record.updatedAt,
      },
    });
  } catch (error) {
    console.error('[cloud/document] load failed', error);
    return NextResponse.json({ error: 'クラウドデータの取得に失敗しました' }, { status: 500 });
  }
}
