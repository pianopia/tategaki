import { NextResponse } from 'next/server';

import { getSessionUser } from '../../_lib/auth';

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: session.user,
    expiresAt: session.expiresAt,
  });
}
