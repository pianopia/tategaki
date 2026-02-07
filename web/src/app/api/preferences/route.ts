import { NextRequest, NextResponse } from 'next/server';

import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { getSessionUser } from '../_lib/auth';
import { getDb } from '@/db/client';
import { userPreferences } from '@/db/schema';

const updatePreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'custom']).optional(),
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  fontPreset: z.enum(['classic', 'modern', 'neutral', 'mono']).optional(),
  maxLinesPerPage: z.number().min(1).max(100).optional(),
  editorMode: z.enum(['paged', 'continuous']).optional(),
  autoSave: z.boolean().optional(),
  revisionIntervalMinutes: z.number().min(1).max(60).optional(),
  keybindings: z.record(z.string()).optional(),
});

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    const [record] = await db
      .select({
        id: userPreferences.id,
        userId: userPreferences.userId,
        preferences: userPreferences.preferences,
        updatedAt: userPreferences.updatedAt,
        createdAt: userPreferences.createdAt,
      })
      .from(userPreferences)
      .where(eq(userPreferences.userId, session.user.id))
      .limit(1);

    const defaultPrefs = {
      theme: 'light',
      backgroundColor: '#FFFFFF',
      textColor: '#000000',
      fontPreset: 'classic',
      maxLinesPerPage: 40,
      editorMode: 'paged',
      autoSave: true,
      revisionIntervalMinutes: 10,
      keybindings: {},
    };

    if (!record) {
      return NextResponse.json(defaultPrefs);
    }

    // Parse preferences JSON
    let prefs = defaultPrefs;
    try {
      if (record.preferences) {
        const parsed = JSON.parse(record.preferences);
        // Merge with defaults to ensure all properties exist
        prefs = { ...defaultPrefs, ...parsed };
      }
    } catch {
      prefs = defaultPrefs;
    }

    return NextResponse.json(prefs);
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updatePreferencesSchema.parse(body);

    const db = getDb();
    const now = Date.now();

    // Check if preferences exist
    const [existing] = await db
      .select({
        id: userPreferences.id,
        userId: userPreferences.userId,
        preferences: userPreferences.preferences,
      })
      .from(userPreferences)
      .where(eq(userPreferences.userId, session.user.id))
      .limit(1);

    const preferencesJson = JSON.stringify(validatedData);

    if (existing) {
      // Update existing preferences
      await db
        .update(userPreferences)
        .set({
          preferences: preferencesJson,
          updatedAt: now,
        })
        .where(eq(userPreferences.userId, session.user.id));
    } else {
      // Create new preferences
      await db.insert(userPreferences).values({
        userId: session.user.id,
        preferences: preferencesJson,
        updatedAt: now,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
