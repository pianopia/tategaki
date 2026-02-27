# Web脆弱性観点シート（tategaki）

最終更新日: 2026-02-20  
対象リポジトリ: `/Users/nakagawa_shota/repo/valit/tategaki`

## 1. 目的

このドキュメントは、今回実施したWeb脆弱性試験（特に入力起点のインジェクション）を、今後も同じ観点で再実施できるようにするための観点シート兼テスト手順書です。

## 2. 対象範囲

- `web` アプリ（エディタ本体、API、クラウド保存、要望フォーム）
- `admin` アプリ（要望管理、ユーザー/ドキュメント一覧、管理者認証API）

## 3. 今回の試験方針（2026-02-20実施）

- 静的解析で「入力 -> 保存/処理 -> 出力」のデータフローを確認
- 入力可能箇所で以下を重点確認
1. XSS（Stored/Reflected/DOM）
2. SQL Injection
3. Command Injection
4. テンプレート/HTML注入
5. パストラバーサル（ファイル/パス入力）

## 4. 再実施手順

### 4.1 静的解析（コード観点）

以下をプロジェクトルートで実行する。

```bash
cd /Users/nakagawa_shota/repo/valit/tategaki

# 入力処理・危険APIの検索
rg -n "dangerouslySetInnerHTML|innerHTML|contentEditable|onPaste|eval\\(|new Function|child_process|exec\\(|spawn\\(|db\\.execute|sql\\.raw|raw\\(|fetch\\(" web/src admin/src

# APIエンドポイント一覧
rg --files web/src/app/api admin/src/app/api

# 代表ルートの確認（必要に応じて追加）
nl -ba web/src/app/page.tsx
nl -ba web/src/components/ContinuousScrollEditor.tsx
nl -ba web/src/app/api/cloud/documents/route.ts
nl -ba web/src/app/api/cloud/documents/[documentId]/route.ts
nl -ba web/src/app/api/requests/route.ts
nl -ba admin/src/app/api/requests/route.ts
```

確認ポイント:

- 入力値を `innerHTML` に直接代入していないか
- DBクエリが文字列結合で組み立てられていないか
- OSコマンド実行にユーザー入力が混入していないか
- 入力値を再表示する箇所でエスケープ/サニタイズされているか

### 4.2 動的試験（挙動観点）

ローカル起動後にブラウザで実施する。

```bash
# web
cd /Users/nakagawa_shota/repo/valit/tategaki/web
npm run dev

# admin（別ターミナル）
cd /Users/nakagawa_shota/repo/valit/tategaki/admin
npm run dev
```

## 5. 観点シート（チェックリスト）

| ID | 分類 | 入力点 | テスト手順 | ペイロード例 | 合格基準 | 今回結果 (2026-02-20) |
|---|---|---|---|---|---|---|
| XSS-01 | Stored/DOM XSS | web: ファイル取込 `.txt` | エディタで「ファイルを開く」からテキスト取込 | `<img src=x onerror=alert('xss')>` | スクリプト実行されず、文字列として扱われる | **NG（脆弱）** |
| XSS-02 | Stored XSS | web: クラウド保存 `pages[].content` | 悪性HTMLを含む内容を保存→再読込 | 同上 | 再読込時に実行されない | **NG（脆弱）** |
| XSS-03 | Stored XSS（管理画面反映） | web要望フォーム `message` -> admin表示 | 要望にHTML/JS入力して送信、adminで表示 | `<script>alert(1)</script>` | admin画面で実行されず文字列表示 | OK |
| SQLI-01 | SQL Injection | web: `/api/auth/login` | `email/password` に `' OR 1=1 --` を投入 | `' OR 1=1 --` | 認証回避不可、正常に401/バリデーションエラー | OK |
| SQLI-02 | SQL Injection | web: `/api/cloud/documents/[documentId]` | `documentId` にSQL風文字列を指定 | `abc' OR '1'='1` | 他人データ取得不可、404/400 | OK |
| SQLI-03 | SQL Injection | admin: `/api/requests?status=` | `status` にSQL風文字列 | `new' OR 1=1 --` | 不正な条件注入不可（列挙値のみ適用） | OK |
| CMD-01 | Command Injection | 全API | JSON入力にコマンド文字列を混入 | `;cat /etc/passwd` など | サーバーコマンド実行に繋がらない | OK（該当実装未検出） |
| PATH-01 | パストラバーサル | URL/ファイル名入力系 | `../` 混入パスを投入 | `../../etc/passwd` | サーバーファイル読み出し不可 | OK（該当実装未検出） |

## 6. 今回確認した主要所見

### 6.1 High: XSS（要修正）

入力HTMLがサニタイズ無しで `innerHTML` に流入しているため、悪性属性（例: `onerror`）が実行されるリスクがある。

主な確認箇所:

- `web/src/app/page.tsx:1482`
- `web/src/app/page.tsx:2271`
- `web/src/components/ContinuousScrollEditor.tsx:56`
- `web/src/app/api/cloud/documents/route.ts:15`

### 6.2 SQLi/CMD Injection（今回範囲では未検出）

Drizzle ORMの条件式を使っており、ユーザー入力を直接SQL文字列連結する実装は確認できなかった。  
OSコマンド実行にユーザー入力を渡す実装も確認できなかった。

## 7. 修正後の再試験（必須）

XSS修正後は、少なくとも以下を再実施する。

1. XSS-01: ファイル取込でペイロード実行されないこと
2. XSS-02: クラウド保存→再読込でも実行されないこと
3. 通常入力の回帰: 改行、見出し変換、保存/読込、AI生成挿入が壊れていないこと

## 8. 記録テンプレート（運用用）

各試験で以下を記録する。

- 実施日
- 実施者
- 対象コミット
- 試験ID
- 実施手順（URL/API、入力値）
- 実結果（レスポンス/画面挙動）
- 判定（OK/NG）
- 証跡（スクショ、ログ、HAR）

簡易フォーマット:

```text
[試験ID] XSS-01
実施日: YYYY-MM-DD
実施者: <name>
対象コミット: <hash>
手順: ...
入力値: ...
結果: ...
判定: OK / NG
証跡: <path or URL>
```

