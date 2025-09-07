import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { userPrompt, context, model = 'gemini-1.5-flash' } = await request.json();

    if (!userPrompt) {
      return NextResponse.json({ error: 'プロンプトが必要です' }, { status: 400 });
    }

    // 環境変数チェック
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API キーが設定されていません。環境変数 GOOGLE_GENERATIVE_AI_API_KEY を設定してください。' },
        { status: 500 }
      );
    }

    // Google AIクライアントを初期化
    const google = createGoogleGenerativeAI({
      apiKey: apiKey,
    });

    // プロンプトを構築
    let fullPrompt = userPrompt;
    if (context && context.trim()) {
      fullPrompt = `以下は現在書いている文章の文脈です：\n\n${context}\n\n---\n\n以下の指示に従って文章を生成してください：\n${userPrompt}`;
    }

    const result = await generateText({
      model: google(model),
      prompt: fullPrompt,
      maxRetries: 2,
      temperature: 0.7,
    });

    return NextResponse.json({ text: result.text });
  } catch (error) {
    console.error('AI生成エラー:', error);
    return NextResponse.json(
      { error: `AI生成に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}` },
      { status: 500 }
    );
  }
}
