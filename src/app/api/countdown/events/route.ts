import { NextResponse } from 'next/server';
import { db } from '@/db';
import { countdowns } from '@/db/schema';

export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendCountdown = async () => {
        try {
          console.log('Fetching countdown data...');
          const result = await db.select().from(countdowns).limit(1);
          console.log('Fetch result:', result);
          const data = result[0] || { targetValue: 2000, currentValue: 2000 };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (error) {
          console.error('Error fetching countdown:', error);
        }
      };

      await sendCountdown();
      const interval = setInterval(sendCountdown, 10000);

      return () => {
        clearInterval(interval);
      };
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
} 