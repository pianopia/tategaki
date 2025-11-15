import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'サービス利用規約 | tategaki',
  description:
    'tategaki をご利用いただく前にご確認いただきたい利用規約です。利用条件や禁止事項、免責事項について記載しています。',
};

const sections = [
  {
    title: '第1条（適用）',
    body:
      '本規約は、tategaki（以下「当サービス」）の利用に関わる一切の関係に適用されます。当サービスを利用することで、本規約に同意したものとみなします。',
  },
  {
    title: '第2条（アカウント登録）',
    body:
      '利用者は、正確かつ最新の情報を用いてアカウントを登録する必要があります。不正確な情報や他者になりすました登録が確認された場合、利用停止となることがあります。',
  },
  {
    title: '第3条（禁止事項）',
    body:
      '法令違反、著作権侵害、サービスの不正利用、第三者になりすます行為、当サービスの運営を妨害する行為などを禁止します。',
  },
  {
    title: '第4条（データの取り扱い）',
    body:
      '利用者が作成または保存したコンテンツは利用者に帰属しますが、バックアップや障害復旧のために当サービスが保持する場合があります。詳細はプライバシーポリシーをご確認ください。',
  },
  {
    title: '第5条（サービスの変更・停止）',
    body:
      '当サービスは、事前の予告なく機能の追加・変更・停止を行うことがあります。これに伴い利用者に生じた損害について、当サービスは責任を負いません。',
  },
  {
    title: '第6条（免責事項）',
    body:
      '当サービスは、利用者が当サービスを通じて得た情報の正確性・完全性を保証するものではありません。利用により生じた損害について、当サービスは責任を負わないものとします。',
  },
  {
    title: '第7条（規約の改定）',
    body:
      '必要に応じて本規約を改定することがあります。重要な変更がある場合、当サービス上で告知します。規約改定後も当サービスを利用することで、改定後の規約に同意したものとみなします。',
  },
  {
    title: '第8条（準拠法・裁判管轄）',
    body:
      '本規約の解釈には日本法を準拠法とし、当サービスに関して紛争が生じた場合には、運営者の所在地を管轄する裁判所を専属的合意管轄とします。',
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 px-4 py-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-semibold mb-4">サービス利用規約</h1>
          <p className="text-sm text-gray-600">
            tategaki（以下「当サービス」）をご利用いただく前に、本規約をお読みください。利用者は本規約に同意のうえで当サービスを利用するものとします。
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

        <div className="text-sm text-gray-600">
          <p>制定日: 2024年1月1日</p>
          <p>お問い合わせ: support@tategaki.app</p>
        </div>
      </div>
    </div>
  );
}
