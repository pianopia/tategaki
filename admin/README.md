# tategaki admin

要望管理用の管理画面です。

## セットアップ

```bash
npm install
cp .env.example .env.local
npm run dev
```

## 必須環境変数

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `ADMIN_LOGIN_ID`
- `ADMIN_LOGIN_PASSWORD`
- `ADMIN_SESSION_SECRET`

`web` と同じDBを参照することで、`web` から送信された `feature_requests` を確認できます。
