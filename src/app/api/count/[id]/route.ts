import { NextResponse } from 'next/server';
import { db } from '@/db';
import { countdowns } from '@/db/schema';
import { eq } from 'drizzle-orm';

// 特定のカウントアップを取得
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsedId = parseInt(id);
    if (isNaN(parsedId)) {
      return NextResponse.json({ error: '無効なID' }, { status: 400 });
    }

    const result = await db.select().from(countdowns).where(eq(countdowns.id, parsedId));
    
    if (result.length === 0) {
      return NextResponse.json({ error: 'カウントアップが見つかりません' }, { status: 404 });
    }
    
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error in GET:', error);
    return NextResponse.json({ error: 'Failed to fetch countdown' }, { status: 500 });
  }
}

// カウントアップを更新
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsedId = parseInt(id);
    if (isNaN(parsedId)) {
      return NextResponse.json({ error: '無効なID' }, { status: 400 });
    }

    const { name, targetValue, currentValue, increment } = await request.json();
    
    // 現在のデータを取得
    const currentRecord = await db.select().from(countdowns).where(eq(countdowns.id, parsedId));
    
    if (currentRecord.length === 0) {
      return NextResponse.json({ error: 'カウントアップが見つかりません' }, { status: 404 });
    }
    
    const updateData: {
      name?: string;
      targetValue?: number;
      currentValue?: number;
      updatedAt: string;
    } = { updatedAt: new Date().toISOString() };
    
    if (name !== undefined) updateData.name = name;
    if (targetValue !== undefined) updateData.targetValue = targetValue;
    
    // increment=trueの場合、現在の値に1を加える
    if (increment === true) {
      const newValue = currentRecord[0].currentValue + 1;
      // 目標値を超えないようにチェック
      if (newValue <= currentRecord[0].targetValue) {
        updateData.currentValue = newValue;
      }
    } else if (currentValue !== undefined) {
      // 通常のcurrentValue更新
      updateData.currentValue = currentValue;
    }
    
    const result = await db.update(countdowns)
      .set(updateData)
      .where(eq(countdowns.id, parsedId))
      .returning();
    
    if (result.length === 0) {
      return NextResponse.json({ error: 'カウントアップの更新に失敗しました' }, { status: 500 });
    }
    
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error in PUT:', error);
    return NextResponse.json({ error: 'Failed to update countdown' }, { status: 500 });
  }
}

// カウントアップを更新
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsedId = parseInt(id);
    if (isNaN(parsedId)) {
      return NextResponse.json({ error: '無効なID' }, { status: 400 });
    }

    const { name, targetValue, currentValue, increment } = await request.json();
    
    // 現在のデータを取得
    const currentRecord = await db.select().from(countdowns).where(eq(countdowns.id, parsedId));
    
    if (currentRecord.length === 0) {
      return NextResponse.json({ error: 'カウントアップが見つかりません' }, { status: 404 });
    }
    
    const updateData: {
      name?: string;
      targetValue?: number;
      currentValue?: number;
      updatedAt: string;
    } = { updatedAt: new Date().toISOString() };
    
    if (name !== undefined) updateData.name = name;
    if (targetValue !== undefined) updateData.targetValue = targetValue;
    
    // increment=trueの場合、現在の値に1を加える
    if (increment === true) {
      const newValue = currentRecord[0].currentValue + 1;
      // 目標値を超えないようにチェック
      if (newValue <= currentRecord[0].targetValue) {
        updateData.currentValue = newValue;
      }
    } else if (currentValue !== undefined) {
      // 通常のcurrentValue更新
      updateData.currentValue = currentValue;
    }
    
    const result = await db.update(countdowns)
      .set(updateData)
      .where(eq(countdowns.id, parsedId))
      .returning();
    
    if (result.length === 0) {
      return NextResponse.json({ error: 'カウントアップの更新に失敗しました' }, { status: 500 });
    }
    
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error in PUT:', error);
    return NextResponse.json({ error: 'Failed to update countdown' }, { status: 500 });
  }
}

// カウントアップを削除
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsedId = parseInt(id);
    if (isNaN(parsedId)) {
      return NextResponse.json({ error: '無効なID' }, { status: 400 });
    }

    const result = await db.delete(countdowns)
      .where(eq(countdowns.id, parsedId))
      .returning();
    
    if (result.length === 0) {
      return NextResponse.json({ error: 'カウントアップが見つかりません' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, deleted: result[0] });
  } catch (error) {
    console.error('Error in DELETE:', error);
    return NextResponse.json({ error: 'Failed to delete countdown' }, { status: 500 });
  }
} 