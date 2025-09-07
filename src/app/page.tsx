'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Countdown = {
  id: number;
  name: string;
  targetValue: number;
  currentValue: number;
  createdAt: string;
  updatedAt: string;
};

export default function Home() {
  const [countdowns, setCountdowns] = useState<Countdown[]>([]);
  const [name, setName] = useState('');
  const [targetValue, setTargetValue] = useState('100');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCountdowns();
  }, []);

  const fetchCountdowns = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/count');
      const data = await response.json();
      setCountdowns(data);
      setError('');
    } catch (err) {
      setError('カウントアップの取得に失敗しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await fetch('/api/count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          targetValue: parseInt(targetValue) 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || '作成に失敗しました');
      }

      const newCountdown = await response.json();
      setCountdowns([...countdowns, newCountdown]);
      setName('');
      setTargetValue('100');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '作成に失敗しました');
      console.error('Creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('このカウントアップを削除してもよろしいですか？')) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/count/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '削除に失敗しました');
      }
      
      setCountdowns(countdowns.filter(countdown => countdown.id !== id));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* 背景装飾 */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25px 25px, rgba(156, 146, 172, 0.1) 2px, transparent 2px)`,
          backgroundSize: '50px 50px'
        }}></div>
      </div>
      
      {/* 浮遊する装飾要素 */}
      <div className="absolute top-20 left-4 sm:left-10 w-12 h-12 sm:w-20 sm:h-20 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full opacity-20 animate-pulse"></div>
      <div className="absolute top-40 right-4 sm:right-20 w-10 h-10 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full opacity-20 animate-bounce"></div>
      <div className="absolute bottom-20 left-4 sm:left-20 w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full opacity-20 animate-pulse delay-1000"></div>
      <div className="absolute bottom-40 right-4 sm:right-10 w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-r from-green-400 to-teal-400 rounded-full opacity-20 animate-bounce delay-500"></div>
      
      <div className="relative z-10 flex flex-col items-center p-4 sm:p-8">
        <div className="w-full max-w-6xl">
          {/* ヘッダー */}
          <div className="text-center mb-8 sm:mb-12 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mb-4 sm:mb-6 shadow-2xl">
              <span className="text-2xl sm:text-3xl">🎯</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent mb-4 drop-shadow-lg">
              カウントアップチャレンジ
            </h1>
            <p className="text-lg sm:text-xl text-purple-200 opacity-90">目標に向かって一歩ずつ進もう</p>
          </div>
          
          {/* 新規作成フォーム */}
          <div className="bg-white/10 backdrop-blur-lg p-4 sm:p-8 rounded-3xl shadow-2xl mb-8 sm:mb-12 border border-white/20 hover:bg-white/15 transition-all duration-300 transform hover:scale-[1.02]">
            <div className="flex items-center mb-4 sm:mb-6">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-green-400 to-blue-400 rounded-full flex items-center justify-center mr-3">
                <span className="text-white text-sm sm:text-lg">✨</span>
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">新規カウントアップ作成</h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div className="space-y-2">
                <label htmlFor="name" className="block text-white/90 font-semibold text-base sm:text-lg">📝 名前</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white/20 backdrop-blur-sm border border-white/30 p-3 sm:p-4 rounded-2xl shadow-lg text-white placeholder-white/60 focus:outline-none focus:ring-4 focus:ring-purple-400/50 focus:border-purple-400 transition-all duration-300 text-sm sm:text-base"
                  placeholder="例：読書チャレンジ、筋トレ回数など"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="targetValue" className="block text-white/90 font-semibold text-base sm:text-lg">🎯 目標値</label>
                <input
                  id="targetValue"
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  className="w-full bg-white/20 backdrop-blur-sm border border-white/30 p-3 sm:p-4 rounded-2xl shadow-lg text-white placeholder-white/60 focus:outline-none focus:ring-4 focus:ring-purple-400/50 focus:border-purple-400 transition-all duration-300 text-sm sm:text-base"
                  placeholder="達成したい数値"
                  min="1"
                  required
                />
              </div>
              <button 
                type="submit" 
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-2xl shadow-2xl font-bold text-base sm:text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    作成中...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <span className="mr-2">🚀</span>
                    作成する
                  </div>
                )}
              </button>
            </form>
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="bg-red-500/20 backdrop-blur-sm border border-red-400/50 text-red-100 px-6 py-4 rounded-2xl mb-8 shadow-lg animate-shake">
              <div className="flex items-center">
                <span className="text-2xl mr-3">⚠️</span>
                {error}
              </div>
            </div>
          )}
          
          {/* カウントアップ一覧 */}
          <div className="bg-white/10 backdrop-blur-lg p-4 sm:p-8 rounded-3xl shadow-2xl border border-white/20">
            <div className="flex items-center mb-6 sm:mb-8">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex items-center justify-center mr-3">
                <span className="text-white text-sm sm:text-lg">📊</span>
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">カウントアップ一覧</h2>
            </div>
            
            {loading && countdowns.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-white/20 rounded-full mb-4 animate-spin">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-white/30 border-t-white rounded-full"></div>
                </div>
                <p className="text-white/80 text-lg sm:text-xl">読み込み中...</p>
              </div>
            ) : countdowns.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <div className="text-4xl sm:text-6xl mb-4">📈</div>
                <p className="text-white/80 text-lg sm:text-xl mb-4">カウントアップがありません</p>
                <p className="text-white/60 text-sm sm:text-base">新しく作成して目標に向かって進みましょう！</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:gap-6">
                {countdowns.map((countdown, index) => {
                  const progress = Math.round((countdown.currentValue / countdown.targetValue) * 100);
                  const isCompleted = countdown.currentValue >= countdown.targetValue;
                  
                  return (
                    <div 
                      key={countdown.id} 
                      className={`bg-white/10 backdrop-blur-sm border border-white/20 p-4 sm:p-6 rounded-2xl shadow-lg hover:bg-white/15 transition-all duration-300 transform hover:scale-[1.02] animate-fade-in-up ${isCompleted ? 'ring-2 ring-yellow-400/50' : ''}`}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center mb-3">
                            <span className="text-xl sm:text-2xl mr-3">{isCompleted ? '🏆' : '🎯'}</span>
                            <h3 className="font-bold text-lg sm:text-xl lg:text-2xl text-white">{countdown.name}</h3>
                            {isCompleted && (
                              <span className="ml-3 bg-gradient-to-r from-yellow-400 to-orange-400 text-black px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold animate-pulse">
                                完了！
                              </span>
                            )}
                          </div>
                          
                          {/* プログレスバー */}
                          <div className="mb-4">
                            <div className="flex justify-between text-white/80 text-xs sm:text-sm mb-2">
                              <span>進捗: {countdown.currentValue} / {countdown.targetValue}</span>
                              <span>{progress}%</span>
                            </div>
                            <div className="w-full bg-white/20 rounded-full h-2 sm:h-3 overflow-hidden">
                              <div 
                                className={`h-2 sm:h-3 rounded-full transition-all duration-1000 ease-out ${
                                  isCompleted 
                                    ? 'bg-gradient-to-r from-yellow-400 to-orange-400' 
                                    : 'bg-gradient-to-r from-blue-400 to-purple-400'
                                }`}
                                style={{ width: `${Math.min(100, progress)}%` }}
                              ></div>
                            </div>
                          </div>
                          
                          <p className="text-white/70 text-xs sm:text-sm">
                            作成日: {new Date(countdown.createdAt).toLocaleDateString('ja-JP')}
                          </p>
                        </div>
                        
                        <div className="flex flex-row lg:flex-col gap-3 lg:ml-6">
                          <Link
                            href={`/count/${countdown.id}`}
                            className="flex-1 lg:flex-none bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl shadow-lg font-bold transition-all duration-300 transform hover:scale-105 text-center text-sm sm:text-base"
                          >
                            <span className="mr-2">👀</span>
                            表示
                          </Link>
                          <button
                            onClick={() => handleDelete(countdown.id)}
                            className="flex-1 lg:flex-none bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl shadow-lg font-bold transition-all duration-300 transform hover:scale-105 text-sm sm:text-base"
                          >
                            <span className="mr-2">🗑️</span>
                            削除
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
