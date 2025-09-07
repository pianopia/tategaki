import { NextResponse } from 'next/server';
import { db } from '@/db';
import { countdowns } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { currentValue } = await request.json();
    const result = await db
      .update(countdowns)
      .set({ currentValue, updatedAt: new Date().toISOString() })
      .where(eq(countdowns.id, parseInt(params.id)))
      .returning();
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Update failed:', error);
    return NextResponse.json({ error: 'Failed to update countdown' }, { status: 500 });
  }
} 