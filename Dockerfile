# ベースイメージを指定
FROM node:20-alpine AS build

WORKDIR /app

# パッケージ依存関係のコピーとインストール
COPY package*.json ./
RUN npm ci

# ビルド時に必要な環境変数を設定
ENV NODE_ENV=production

# ソースコードをコピー
COPY . .

# キャッシュを活用してビルド
RUN npm run build

CMD ["npm", "run", "start"]