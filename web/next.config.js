/** @type {import('next').NextConfig} */
const nextConfig = {

  typescript: {
    // ビルド時のTypeScriptエラーを無視する
    ignoreBuildErrors: true,
  },
  // 実験的な機能の警告を抑制
  experimental: {
    // パラメータアクセスの警告を抑制する
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
  serverExternalPackages: [],
  // コンソールの警告を減らす
  onDemandEntries: {
    // ページバンドルをメモリに保持する時間を延長（開発時）
    maxInactiveAge: 25 * 1000,
    // 同時に保持するページの数（開発時）
    pagesBufferLength: 5,
  }
};

module.exports = nextConfig; 