import { NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';

import { getDb } from '@/db/client';
import { documentRevisions } from '@/db/schema';

import { getSessionUser } from '../../../../_lib/auth';

type RevisionParams = {
  params: {
    documentId?: string;
  };
};

export async function GET(_request: Request, context: RevisionParams) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const documentId = context.params?.documentId;
  if (!documentId) {
    return NextResponse.json(
      { error: '不正なパラメータです' },
      { status: 400 }
    );
  }

  try {
    const db = getDb();
    const rows = await db
      .select({
        id: documentRevisions.id,
        title: documentRevisions.title,
        content: documentRevisions.content,
        pagesJson: documentRevisions.pagesJson,
        createdAt: documentRevisions.createdAt,
      })
      .from(documentRevisions)
      .where(
        and(
          eq(documentRevisions.documentId, documentId),
          eq(documentRevisions.userId, session.user.id)
        )
      )
      .orderBy(asc(documentRevisions.createdAt));

    const revisions = rows.map((row) => {
      let pages: unknown = null;
      if (row.pagesJson) {
        try {
          pages = JSON.parse(row.pagesJson);
        } catch (error) {
          console.error('[document revisions] parse error', error);
        }
      }
      return {
        id: row.id,
        title: row.title,
        content: row.content,
        pages,
        createdAt: row.createdAt,
      };
    });

    return NextResponse.json({ revisions });
  } catch (error) {
    console.error('[document revisions] fetch failed', error);
    return NextResponse.json(
      { error: 'リビジョンの取得に失敗しました' },
      { status: 500 }
    );
  }
}
