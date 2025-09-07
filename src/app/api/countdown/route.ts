import { NextResponse } from 'next/server';
import { db } from '@/db';
import { countdowns } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const result = await db.select().from(countdowns).limit(1);
    return NextResponse.json(result[0] || { targetValue: 2000, currentValue: 2000 });
  } catch (error) {
    console.error('Error in GET:', error);
    return NextResponse.json({ error: 'Failed to fetch countdown' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { targetValue } = await request.json();
    // 既存のレコードがあるか確認
    const existingRecord = await db.select().from(countdowns).limit(1);
    
    if (existingRecord.length > 0) {
      // 既存のレコードを更新
      const result = await db.update(countdowns)
        .set({
          targetValue,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(countdowns.id, existingRecord[0].id))
        .returning();
      
      return NextResponse.json(result[0]);
    } else {
      // レコードが存在しない場合は新規作成
      const result = await db.insert(countdowns).values({
        targetValue,
        currentValue: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).returning();
      
      return NextResponse.json(result[0]);
    }
  } catch (error) {
    console.error('Error in POST:', error);
    return NextResponse.json({ error: 'Failed to create countdown' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, currentValue } = await request.json();
    const result = await db.update(countdowns)
      .set({
        currentValue,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(countdowns.id, id))
      .returning();
    
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error in PUT:', error);
    return NextResponse.json({ error: 'Failed to update countdown' }, { status: 500 });
  }
} 