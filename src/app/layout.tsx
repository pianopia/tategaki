import type { Metadata } from "next";
import { Noto_Serif_JP } from "next/font/google";
import "./globals.css";

const notoSerifJP = Noto_Serif_JP({
  variable: "--font-noto-serif-jp",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "tategaki - AI搭載縦書き小説エディタ | 無料で使える文芸創作ツール",
  description: "縦書き表示とAI執筆支援機能を搭載した無料の小説エディタ。原稿用紙風のレイアウトで集中して創作できます。文字数カウント、改ページ機能、テキスト出力対応。小説家・ライター・同人作家の創作活動を支援します。",
  keywords: [
    "縦書き小説エディタ", "AI執筆支援", "小説執筆", "文芸創作", "原稿用紙",
    "小説家", "ライター", "同人小説", "創作ツール", "無料エディタ",
    "文章作成", "テキストエディタ", "執筆環境", "文字数カウント",
    "改ページ機能", "Gemini AI", "文章生成", "執筆支援AI",
    "縦書き表示", "日本語縦書き", "小説投稿", "Web小説",
    "執筆効率化", "創作活動", "文学創作", "物語執筆"
  ],
  authors: [{ name: "tategaki" }],
  robots: "index, follow",
  applicationName: "tategaki",
  category: "Writing Tools",
  openGraph: {
    title: "tategaki - AI搭載縦書き小説エディタ | 無料で使える文芸創作ツール",
    description: "縦書き表示とAI執筆支援機能を搭載した無料の小説エディタ。原稿用紙風のレイアウトで集中して創作できます。小説家・ライター・同人作家の創作活動を支援。",
    type: "website",
    locale: "ja_JP",
    siteName: "tategaki",
    url: "https://tategaki.vercel.app",
    images: [
      {
        url: "/editor_ogp.png",
        width: 1200,
        height: 630,
        alt: "tategaki 縦書き小説エディタのスクリーンショット - AI執筆支援機能搭載",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "tategaki - AI搭載縦書き小説エディタ",
    description: "縦書き表示とAI執筆支援機能を搭載した無料の小説エディタ。原稿用紙風のレイアウトで集中して創作。",
    images: ["/editor_ogp.png"],
  },
  alternates: {
    canonical: "https://tategaki.vercel.app",
  },
  other: {
    "msapplication-TileColor": "#ffffff",
    "theme-color": "#ffffff",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "tategaki",
    "applicationCategory": "Writing Software",
    "operatingSystem": "Web Browser",
    "description": "縦書き表示とAI執筆支援機能を搭載した無料の小説エディタ。原稿用紙風のレイアウトで集中して創作できます。",
    "url": "https://tategaki.vercel.app",
    "author": {
      "@type": "Organization",
      "name": "tategaki"
    },
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "JPY"
    },
    "featureList": [
      "縦書き・横書き表示切替",
      "AI執筆支援（Gemini搭載）",
      "ページ管理機能",
      "文字数・行数カウント",
      "テキストファイル入出力",
      "ショートカットキー対応"
    ],
    "screenshot": "https://tategaki.vercel.app/editor_ogp.png",
    "softwareVersion": "1.0",
    "downloadUrl": "https://tategaki.vercel.app",
    "datePublished": "2024-01-01",
    "inLanguage": "ja",
    "audience": {
      "@type": "Audience",
      "audienceType": "小説家, ライター, 同人作家, 文芸創作者"
    }
  };

  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData)
          }}
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body
        className={`${notoSerifJP.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
