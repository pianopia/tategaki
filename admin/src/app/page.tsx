import { desc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { destroyAdminSession, requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { featureRequests } from '@/lib/schema';

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}/${mm}/${dd} ${hh}:${mi}`;
};

async function logoutAction() {
  'use server';
  await destroyAdminSession();
  redirect('/login');
}

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

export default async function AdminPage() {
  await requireAdmin();

  const db = getDb();
  const requests = await db.select().from(featureRequests).orderBy(desc(featureRequests.createdAt));

  return (
    <main className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">要望一覧</h1>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              ログアウト
            </button>
          </form>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-700">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">受付日時</th>
                <th className="text-left px-4 py-3 font-semibold">ステータス</th>
                <th className="text-left px-4 py-3 font-semibold">送信者</th>
                <th className="text-left px-4 py-3 font-semibold">メール</th>
                <th className="text-left px-4 py-3 font-semibold">内容</th>
                <th className="text-left px-4 py-3 font-semibold">操作</th>
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
                  <tr key={request.id} className="border-b border-gray-100 align-top">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">{formatDate(request.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          request.status === 'reviewed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {request.status === 'reviewed' ? '確認済み' : '未確認'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-800">{request.name || '-'}</td>
                    <td className="px-4 py-3 text-gray-700">{request.email}</td>
                    <td className="px-4 py-3 text-gray-900 whitespace-pre-wrap break-words max-w-[520px]">
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
    </main>
  );
}
