import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminSession, isAdminCredentialValid } from '@/lib/auth';

const loginSchema = z.object({
  loginId: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const payload = loginSchema.parse(await request.json());

    if (!isAdminCredentialValid(payload.loginId, payload.password)) {
      return NextResponse.json({ error: 'ログインIDまたはパスワードが違います' }, { status: 401 });
    }

    await createAdminSession(payload.loginId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '入力内容を確認してください' }, { status: 400 });
    }

    console.error('[admin/auth/login] failed', error);
    return NextResponse.json({ error: 'ログイン処理に失敗しました' }, { status: 500 });
  }
}
