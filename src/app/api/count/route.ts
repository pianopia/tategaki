import { NextResponse } from 'next/server';
import { db } from '@/db';
import { countdowns } from '@/db/schema';

// 全てのカウントアップを取得
export async function GET() {
  try {
    const result = await db.select().from(countdowns);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET:', error);
    return NextResponse.json({ error: 'Failed to fetch countdowns' }, { status: 500 });
  }
}

// 新しいカウントアップを作成
export async function POST(request: Request) {
  try {
    console.log('POST request received');
    const data = await request.json();
    console.log('Request data:', data);
    
    const { name, targetValue } = data;
    
    if (!name || !targetValue) {
      console.log('Validation failed - missing name or targetValue');
      return NextResponse.json(
        { error: '名前と目標値は必須です' }, 
        { status: 400 }
      );
    }

    console.log('Attempting to insert data into DB');
    const insertData = {
      name,
      targetValue: parseInt(targetValue.toString()),
      currentValue: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    console.log('Insert data:', insertData);
    
    const result = await db.insert(countdowns).values(insertData).returning();
    console.log('DB insert result:', result);
    
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error in POST:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json({ 
      error: 'Failed to create countdown', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
} 