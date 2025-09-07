import { NextResponse } from 'next/server';
import { db } from '@/db';
import { countdowns } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // paramsをawaitしてからIDを取得
  const { id } = await params;
  const parsedId = parseInt(id);
  
  // IDが無効な場合は早期にエラーレスポンスを返す
  if (isNaN(parsedId)) {
    return NextResponse.json({ error: '無効なID' }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;
      
      // 指定されたIDのカウントアップを取得する関数
      const sendCountdown = async () => {
        // コントローラーが閉じられている場合は何もしない
        if (isClosed) {
          return;
        }
        
        try {
          console.log(`Fetching countdown data for ID: ${parsedId}`);
          const result = await db.select().from(countdowns).where(eq(countdowns.id, parsedId)).limit(1);
          
          if (result.length === 0) {
            if (!isClosed) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'カウントアップが見つかりません' })}\n\n`));
            }
            return;
          }
          
          if (!isClosed) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(result[0])}\n\n`));
          }
        } catch (error) {
          console.error('Error fetching countdown:', error);
          if (!isClosed) {
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'データ取得エラー' })}\n\n`));
            } catch (enqueueError) {
              console.error('Controller already closed:', enqueueError);
              isClosed = true;
            }
          }
        }
      };

      // 初回実行
      await sendCountdown();
      
      // 10秒ごとに実行するinterval
      const interval = setInterval(sendCountdown, 10000);

      // クリーンアップ関数を返す
      return () => {
        isClosed = true;
        clearInterval(interval);
      };
    },
    
    cancel() {
      // ストリームがキャンセルされた時の処理
      console.log('SSE stream cancelled');
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
} 