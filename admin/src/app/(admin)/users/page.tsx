import { desc, eq, sql } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { documents, users } from '@/lib/schema';

export default async function UsersPage() {
  const db = getDb();

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      createdAt: users.createdAt,
      documentsCount: sql<number>`count(${documents.id})`,
      latestDocumentUpdatedAt: sql<number | null>`max(${documents.updatedAt})`,
    })
    .from(users)
    .leftJoin(documents, eq(documents.userId, users.id))
    .groupBy(users.id)
    .orderBy(desc(users.createdAt));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">ユーザー管理</h2>
        <p className="mt-1 text-sm text-gray-600">登録ユーザーと作成ドキュメント状況を確認できます。</p>
        <p className="mt-2 text-sm font-medium text-gray-800">総ユーザー数: {rows.length}</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-gray-700">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">登録日</th>
              <th className="px-4 py-3 text-left font-semibold">表示名</th>
              <th className="px-4 py-3 text-left font-semibold">メール</th>
              <th className="px-4 py-3 text-left font-semibold">ドキュメント数</th>
              <th className="px-4 py-3 text-left font-semibold">最終更新</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  ユーザーはまだいません。
                </td>
              </tr>
            ) : (
              rows.map((user) => (
                <tr key={user.id} className="border-b border-gray-100">
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3 text-gray-800">{user.displayName || '-'}</td>
                  <td className="px-4 py-3 text-gray-700">{user.email}</td>
                  <td className="px-4 py-3 text-gray-700">{Number(user.documentsCount)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                    {formatDate(user.latestDocumentUpdatedAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
