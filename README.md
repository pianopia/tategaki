# tategaki - 縦書き小説エディタ

シンプルで美しい縦書き文章エディタです。AI支援機能付きで創作活動をサポートします。

## 機能

- ✍️ **縦書き・横書き対応** - 日本語文章に最適な縦書き表示
- 📄 **ページ管理** - 複数ページでの執筆、改ページ機能
- 💾 **ファイル操作** - テキストファイルのインポート・エクスポート
- ✨ **AI文章生成** - Gemini AIによる文章生成支援
- ⌨️ **ショートカットキー** - 効率的な執筆環境
- 📊 **統計表示** - 文字数・行数のリアルタイム表示

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

AI機能を使用するには、Google AI Studio APIキーが必要です。

1. [Google AI Studio](https://aistudio.google.com/app/apikey) でAPIキーを取得
2. `.env.local` ファイルを作成
3. 以下のように環境変数を設定

```env
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 でアクセスできます。

## 使用方法

### ショートカットキー

- **Ctrl + Enter**: 新しいページを作成
- **Cmd + K**: AI文章生成ダイアログを開く
- **← / →**: ページ移動 (ボタンクリック)

### AI文章生成

1. ✨ボタンをクリックまたは Cmd+K を押下
2. プロンプト入力ダイアログが表示
3. AIへの指示を入力 (例: "続きを書いて", "対話を追加して")
4. 「生成」ボタンをクリック
5. カーソル位置に生成文章が挿入されます

### 利用可能なAIモデル

- **Flash (gemini-1.5-flash)**: 高速・軽量
- **Pro (gemini-1.5-pro)**: 高性能・高品質
- **2.0 Flash (gemini-2.0-flash-exp)**: 実験版・最新

## 技術スタック

- **Next.js 15** - Reactフレームワーク
- **TypeScript** - 型安全な開発
- **TailwindCSS** - ユーティリティファーストCSS
- **Vercel AI SDK** - AI統合
- **Google Gemini** - 文章生成AI

## ライセンス

MIT License