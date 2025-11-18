import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { userPreferences } from '@/db/schema';
import { getSessionUser } from '../_lib/auth';

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();

    // Try to select from user_preferences with explicit columns (same as documents)
    let prefsData = null;
    let prefsError = null;
    let parsedPrefs = null;
    try {
      const result = await db
        .select({
          id: userPreferences.id,
          userId: userPreferences.userId,
          preferences: userPreferences.preferences,
          updatedAt: userPreferences.updatedAt,
          createdAt: userPreferences.createdAt,
        })
        .from(userPreferences)
        .where(eq(userPreferences.userId, session.user.id));

      prefsData = result;
      if (result.length > 0 && result[0].preferences) {
        try {
          parsedPrefs = JSON.parse(result[0].preferences);
        } catch {
          parsedPrefs = { error: 'Failed to parse JSON' };
        }
      }
    } catch (err) {
      prefsError = String(err);
    }

    return NextResponse.json({
      userId: session.user.id,
      prefsCount: prefsData ? prefsData.length : 0,
      prefsRaw: prefsData,
      prefsParsed: parsedPrefs,
      prefsError: prefsError,
    });
  } catch (error) {
    console.error('Error in debug:', error);
    return NextResponse.json(
      { error: String(error), stack: error instanceof Error ? error.stack : undefined },
      { status: 500 }
    );
  }
}
