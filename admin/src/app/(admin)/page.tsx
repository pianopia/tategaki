import { desc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { featureRequests } from '@/lib/schema';

async function markReviewedAction(formData: FormData) {
  'use server';
  await requireAdmin();

  const id = String(formData.get('id') || '');
  if (!id) return;

  const db = getDb();
  await db.update(featureRequests).set({ status: 'reviewed' }).where(eq(featureRequests.id, id));
  revalidatePath('/');
}

async function markNewAction(formData: FormData) {
  'use server';
  await requireAdmin();

  const id = String(formData.get('id') || '');
  if (!id) return;

  const db = getDb();
  await db.update(featureRequests).set({ status: 'new' }).where(eq(featureRequests.id, id));
  revalidatePath('/');
}

export default async function RequestsPage() {
  const db = getDb();
  const requests = await db.select().from(featureRequests).orderBy(desc(featureRequests.createdAt));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">要望管理</h2>
        <p className="mt-1 text-sm text-gray-600">ユーザーから届いた要望を確認・ステータス更新します。</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-gray-700">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">受付日時</th>
              <th className="px-4 py-3 text-left font-semibold">ステータス</th>
              <th className="px-4 py-3 text-left font-semibold">送信者</th>
              <th className="px-4 py-3 text-left font-semibold">メール</th>
              <th className="px-4 py-3 text-left font-semibold">内容</th>
              <th className="px-4 py-3 text-left font-semibold">操作</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  要望はまだありません。
                </td>
              </tr>
            ) : (
              requests.map((request) => (
                <tr key={request.id} className="align-top border-b border-gray-100">
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatDate(request.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        request.status === 'reviewed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {request.status === 'reviewed' ? '確認済み' : '未確認'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-800">{request.name || '-'}</td>
                  <td className="px-4 py-3 text-gray-700">{request.email}</td>
                  <td className="max-w-[520px] break-words whitespace-pre-wrap px-4 py-3 text-gray-900">
                    {request.message}
                  </td>
                  <td className="px-4 py-3">
                    {request.status === 'reviewed' ? (
                      <form action={markNewAction}>
                        <input type="hidden" name="id" value={request.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          未確認に戻す
                        </button>
                      </form>
                    ) : (
                      <form action={markReviewedAction}>
                        <input type="hidden" name="id" value={request.id} />
                        <button
                          type="submit"
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                          確認済みにする
                        </button>
                      </form>
                    )}
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
