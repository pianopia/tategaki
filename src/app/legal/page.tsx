import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '特定商取引法に基づく表記 | tategaki',
  description:
    'tategaki の特定商取引法に基づく表記ページです。事業者情報、問い合わせ窓口、料金、提供方法などを掲載しています。',
};

const legalItems = [
  { label: '販売事業者', value: 'tategaki' },
  { label: '運営責任者', value: 'tategaki 運営事務局' },
  { label: '所在地', value: '東京都内（詳細はお問い合わせ後に開示いたします）' },
  { label: '連絡先', value: 'legal@tategaki.app（24時間受付、原則3営業日以内に返信）' },
  { label: '販売価格', value: '本サービスは無料で提供しています。' },
  { label: '商品代金以外の必要料金', value: 'インターネット接続に関する通信料金は利用者負担となります。' },
  { label: '支払方法・支払時期', value: '有料プランが導入された場合に別途案内いたします。' },
  { label: 'サービス提供時期', value: 'アカウント登録完了後、即時にご利用いただけます。' },
  { label: '返品・キャンセル', value: 'デジタルサービスの性質上、返品・返金には応じられません。利用停止はいつでも可能です。' },
  { label: '動作環境', value: '最新の Chromium / Firefox / Safari / Edge ブラウザでの利用を推奨します。' },
];

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 px-4 py-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-semibold mb-4">特定商取引法に基づく表記</h1>
          <p className="text-sm text-gray-600">
            tategaki（以下「当サービス」）に関する事業者情報および各種法令に基づく表示は以下の通りです。
          </p>
        </div>

        <dl className="bg-gray-50 border border-gray-200 rounded-lg divide-y">
          {legalItems.map((item) => (
            <div key={item.label} className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 gap-1">
              <dt className="text-sm font-semibold text-gray-700">{item.label}</dt>
              <dd className="text-sm text-gray-700 sm:text-right">{item.value}</dd>
            </div>
          ))}
        </dl>

        <p className="text-xs text-gray-500">
          ※ 表示内容は状況に応じて更新される場合があります。最新の情報が必要な際はお問い合わせください。
        </p>
      </div>
    </div>
  );
}
