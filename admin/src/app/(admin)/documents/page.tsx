import { desc, eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { documents, users } from '@/lib/schema';

export default async function DocumentsPage() {
  const db = getDb();

  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
      userEmail: users.email,
      userDisplayName: users.displayName,
    })
    .from(documents)
    .leftJoin(users, eq(documents.userId, users.id))
    .orderBy(desc(documents.updatedAt));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">ドキュメント管理</h2>
        <p className="mt-1 text-sm text-gray-600">作成済みドキュメントの一覧と更新状況を確認できます。</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-gray-700">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">最終更新</th>
              <th className="px-4 py-3 text-left font-semibold">作成日</th>
              <th className="px-4 py-3 text-left font-semibold">タイトル</th>
              <th className="px-4 py-3 text-left font-semibold">所有ユーザー</th>
              <th className="px-4 py-3 text-left font-semibold">ドキュメントID</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  ドキュメントはまだありません。
                </td>
              </tr>
            ) : (
              rows.map((document) => (
                <tr key={document.id} className="border-b border-gray-100 align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatDate(document.updatedAt)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatDate(document.createdAt)}</td>
                  <td className="max-w-[420px] break-words px-4 py-3 text-gray-900">{document.title}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {document.userDisplayName || '-'}
                    <div className="text-xs text-gray-500">{document.userEmail || '-'}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{document.id}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
