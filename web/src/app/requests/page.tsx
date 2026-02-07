'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';

type SessionUser = {
  id: string;
  email: string;
  displayName: string | null;
};

type SubmitState = {
  tone: 'success' | 'error';
  message: string;
} | null;

export default function RequestsPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch('/api/auth/session', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const sessionUser = data?.user ?? null;
        setUser(sessionUser);
        if (sessionUser?.email) {
          setEmail((prev) => prev || sessionUser.email);
        }
        if (sessionUser?.displayName) {
          setName((prev) => prev || sessionUser.displayName);
        }
      } catch {
        return;
      }
    };

    void fetchSession();
  }, []);

  const remaining = useMemo(() => 5000 - message.length, [message.length]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitState(null);

    if (message.trim().length < 10) {
      setSubmitState({ tone: 'error', message: '要望内容は10文字以上で入力してください。' });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: name || undefined, message }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || '送信に失敗しました。');
      }

      setMessage('');
      setSubmitState({
        tone: 'success',
        message: '要望を受け付けました。ありがとうございます！',
      });
    } catch (error) {
      setSubmitState({
        tone: 'error',
        message:
          error instanceof Error
            ? error.message
            : '送信に失敗しました。時間をおいて再試行してください。',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">要望フォーム</h1>
          <Link href="/" className="text-sm text-blue-700 dark:text-blue-400 hover:underline underline-offset-2">
            エディタに戻る
          </Link>
        </div>

        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          追加してほしい機能や改善点を送ってください。管理画面で確認して、優先度付けの参考にします。
        </p>

        {user ? (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">ログイン中: {user.email}</p>
        ) : (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">未ログインでも送信できます。</p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
              連絡先メールアドレス
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
              お名前（任意）
            </label>
            <input
              id="name"
              type="text"
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ペンネームなど"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="message" className="block text-sm font-medium text-gray-800 dark:text-gray-200">
                要望内容
              </label>
              <span className={`text-xs ${remaining < 0 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                残り {remaining}
              </span>
            </div>
            <textarea
              id="message"
              required
              minLength={10}
              maxLength={5000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full min-h-44 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm leading-relaxed text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: ルビ入力をサポートしてほしい、リビジョン比較を見やすくしてほしい、など"
            />
          </div>

          {submitState && (
            <div
              className={`rounded-lg px-3 py-2 text-sm ${
                submitState.tone === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {submitState.message}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || remaining < 0}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
          >
            {isSubmitting ? '送信中...' : '要望を送信'}
          </button>
        </form>
      </div>
    </main>
  );
}
