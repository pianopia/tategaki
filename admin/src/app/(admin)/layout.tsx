import { redirect } from 'next/navigation';

import { AdminSidebar } from '@/components/admin-sidebar';
import { destroyAdminSession, requireAdmin } from '@/lib/auth';

async function logoutAction() {
  'use server';
  await destroyAdminSession();
  redirect('/login');
}

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireAdmin();

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="mx-auto flex w-full max-w-[1440px]">
        <aside className="sticky top-0 h-screen w-64 border-r border-gray-200 bg-white p-5">
          <div className="flex h-full flex-col">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">tategaki admin</h1>
              <p className="mt-1 text-xs text-gray-500">ログイン中: {session.loginId}</p>
            </div>

            <div className="mt-6">
              <AdminSidebar />
            </div>

            <form action={logoutAction} className="mt-auto">
              <button
                type="submit"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                ログアウト
              </button>
            </form>
          </div>
        </aside>

        <main className="min-h-screen flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
