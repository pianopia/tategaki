import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'プライバシーポリシー | tategaki',
  description:
    'tategaki のプライバシーポリシーです。収集する情報と利用目的、保存期間、第三者提供についてご確認いただけます。',
};

const sections = [
  {
    title: '収集する情報',
    body:
      'メールアドレス、表示名などのアカウント情報に加え、クラウド同期を利用した場合の原稿データや操作ログの一部を取得することがあります。',
  },
  {
    title: '情報の利用目的',
    body:
      'クラウド保存やセッション維持、サービス改善、問い合わせへの対応、セキュリティ確保のために情報を利用します。広告目的で第三者に提供することはありません。',
  },
  {
    title: '保存期間と管理',
    body:
      'アカウント情報は利用者が削除を依頼するまで安全に保存されます。不要になったデータは合理的な期間内に削除します。',
  },
  {
    title: '第三者提供',
    body:
      '法令に基づく場合やサービス運営に必要な外部業者へ委託する場合を除き、第三者へ個人情報を提供することはありません。委託先には適切な安全管理措置を義務付けます。',
  },
  {
    title: '安全管理措置',
    body:
      'アクセス制限、暗号化、定期的な監査を通じて情報の安全を確保します。漏えいが発生した場合は速やかに通知と再発防止策を講じます。',
  },
  {
    title: '利用者の権利',
    body:
      '利用者は自身の情報について、開示・訂正・利用停止・削除を請求できます。手続きは下記の問い合わせ先までご連絡ください。',
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 px-4 py-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-semibold mb-4">プライバシーポリシー</h1>
          <p className="text-sm text-gray-600">
            tategaki（以下「当サービス」）は、利用者の個人情報を適切に取り扱うため、以下の方針を定めています。
          </p>
        </div>

        <div className="space-y-6">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-semibold mb-2">{section.title}</h2>
              <p className="text-sm leading-6 text-gray-700">{section.body}</p>
            </section>
          ))}
        </div>

        <div className="text-sm text-gray-600 space-y-1">
          <p>制定日: 2024年1月1日</p>
          <p>最終更新日: 2024年11月15日</p>
          <p>お問い合わせ: privacy@tategaki.app</p>
        </div>
      </div>
    </div>
  );
}
