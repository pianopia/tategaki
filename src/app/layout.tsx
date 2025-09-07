import type { Metadata } from "next";
import { Noto_Serif_JP } from "next/font/google";
import "./globals.css";

const notoSerifJP = Noto_Serif_JP({
  variable: "--font-noto-serif-jp",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "tategaki - 縦書き小説エディタ",
  description: "シンプルで美しい縦書き文章エディタ。小説や詩の執筆に最適です。",
  keywords: ["縦書き", "エディタ", "小説", "文章", "執筆", "日本語"],
  authors: [{ name: "tategaki" }],
  openGraph: {
    title: "tategaki - 縦書き小説エディタ",
    description: "シンプルで美しい縦書き文章エディタ",
    type: "website",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "tategaki - 縦書き小説エディタ",
    description: "シンプルで美しい縦書き文章エディタ",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body
        className={`${notoSerifJP.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
