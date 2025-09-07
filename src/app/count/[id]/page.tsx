'use client';

import { useEffect, useState, useCallback, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import celebrationAnimation from '../../../../public/animations/celebration.json';
import Image from 'next/image';

// Lottieを動的インポートでSSRを無効にする
const Lottie = dynamic(() => import('lottie-react'), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center text-4xl">🎉</div>
});

type Countdown = {
  id: number;
  name: string;
  targetValue: number;
  currentValue: number;
  createdAt: string;
  updatedAt: string;
};

type CountPageParams = {
  params: Promise<{
    id: string;
  }>;
};

export default function CountPage({ params }: CountPageParams) {
  const router = useRouter();
  const [countdown, setCountdown] = useState<Countdown | null>(null);
  const [currentValueInput, setCurrentValueInput] = useState('');
  const [targetValueInput, setTargetValueInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const prevCurrentValueRef = useRef<number | null>(null);
  
  // React.use()を使ってparamsから値を取得
  const { id } = use(params);

  // クライアントサイドでのみLottieを表示するためのフラグ
  useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchCountdown = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/count/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/');
          return;
        }
        const error = await response.json();
        throw new Error(error.error || 'カウントアップの取得に失敗しました');
      }
      
      const data = await response.json();
      setCountdown(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'カウントアップの取得に失敗しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  // 目標達成時にお祝いを表示
  useEffect(() => {
    console.log('Countdown state changed:', {
      current: countdown?.currentValue,
      target: countdown?.targetValue,
      previous: prevCurrentValueRef.current
    });
    
    if (countdown) {
      // 目標達成判定を強化
      const reachedTarget = countdown.currentValue === countdown.targetValue;
      const valueChanged = prevCurrentValueRef.current !== countdown.currentValue;
      
      console.log('Target reached check:', {
        reachedTarget,
        valueChanged,
        showCelebration
      });
      
      if (valueChanged && reachedTarget) {
        console.log('🎉 Goal reached! Showing celebration animation');
        setShowCelebration(true);
        
        // 5秒後にお祝いアニメーションを非表示（時間を延長）
        const timer = setTimeout(() => {
          console.log('Hiding celebration animation');
          setShowCelebration(false);
        }, 5000);
        
        return () => clearTimeout(timer);
      }
      
      // 目標値から離れた場合はお祝いアニメーションを非表示
      if (valueChanged && !reachedTarget && showCelebration) {
        console.log('No longer at target value, hiding celebration');
        setShowCelebration(false);
      }
      
      // 現在の値を記録
      prevCurrentValueRef.current = countdown.currentValue;
    }
  }, [countdown, showCelebration]);

  useEffect(() => {
    if (!id) return;
    
    // 初回読み込み
    fetchCountdown();
    
    // SSEの設定
    const eventSource = new EventSource(`/api/count/${id}/events`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.error) {
          setError(data.error);
        } else {
          setCountdown(data);
          setError('');
        }
      } catch (err) {
        console.error('Error parsing SSE data:', err);
      }
    };
    
    eventSource.onerror = () => {
      setError('サーバーとの接続が切断されました');
      eventSource.close();
    };
    
    // クリーンアップ関数
    return () => {
      eventSource.close();
    };
  }, [id, fetchCountdown]);

  const handleIncrement = async () => {
    if (!countdown) return;
    
    try {
      // クライアント側で値の上限を確認
      if (countdown.currentValue >= countdown.targetValue) return;
      
      const response = await fetch(`/api/count/${countdown.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ increment: true }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '更新に失敗しました');
      }
      
      const data = await response.json();
      
      // 目標値に達した場合、お祝いアニメーションを表示
      if (data.currentValue === data.targetValue) {
        console.log('🎉 Goal reached in handleIncrement!');
        setShowCelebration(true);
        // 5秒後に非表示
        setTimeout(() => setShowCelebration(false), 5000);
      }
      
      setCountdown(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新に失敗しました');
      console.error(err);
    }
  };

  const handleReset = async () => {
    if (!countdown) return;
    
    try {
      const response = await fetch(`/api/count/${countdown.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentValue: 0 }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'リセットに失敗しました');
      }
      
      const data = await response.json();
      setCountdown(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'リセットに失敗しました');
      console.error(err);
    }
  };

  const handleSetCurrentValue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!countdown || !currentValueInput) return;
    
    try {
      const newValue = parseInt(currentValueInput);
      if (isNaN(newValue) || newValue < 0 || newValue > countdown.targetValue) return;
      
      const response = await fetch(`/api/count/${countdown.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentValue: newValue }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '更新に失敗しました');
      }
      
      const data = await response.json();
      
      // 目標値に達した場合、お祝いアニメーションを表示
      if (data.currentValue === data.targetValue) {
        console.log('🎉 Goal reached in handleSetCurrentValue!');
        setShowCelebration(true);
        // 5秒後に非表示
        setTimeout(() => setShowCelebration(false), 5000);
      }
      
      setCountdown(data);
      setCurrentValueInput('');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新に失敗しました');
      console.error(err);
    }
  };

  const handleSetTargetValue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!countdown || !targetValueInput) return;
    
    try {
      const newValue = parseInt(targetValueInput);
      if (isNaN(newValue) || newValue < 1) return;
      
      const response = await fetch(`/api/count/${countdown.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetValue: newValue }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '目標値の更新に失敗しました');
      }
      
      const data = await response.json();
      setCountdown(data);
      setTargetValueInput('');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '目標値の更新に失敗しました');
      console.error(err);
    }
  };

  const handleSetName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!countdown || !nameInput.trim()) return;
    
    try {
      const response = await fetch(`/api/count/${countdown.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameInput.trim() }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '名前の更新に失敗しました');
      }
      
      const data = await response.json();
      setCountdown(data);
      setNameInput('');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '名前の更新に失敗しました');
      console.error(err);
    }
  };

  // 数値を桁ごとに分割する関数
  const getDigits = (num: number): number[] => {
    return num.toString().split('').map(Number);
  };

  if (loading && !countdown) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden flex items-center justify-center">
        {/* 背景装飾 */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25px 25px, rgba(156, 146, 172, 0.1) 2px, transparent 2px)`,
            backgroundSize: '50px 50px'
          }}></div>
        </div>
        
        <div className="text-center animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-lg rounded-full mb-6 animate-spin border border-white/30">
            <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          </div>
          <p className="text-3xl text-white font-semibold">読み込み中...</p>
          <p className="text-white/70 mt-2">カウントダウンデータを取得しています</p>
        </div>
      </main>
    );
  }

  if (!countdown) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden flex items-center justify-center">
        {/* 背景装飾 */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25px 25px, rgba(156, 146, 172, 0.1) 2px, transparent 2px)`,
            backgroundSize: '50px 50px'
          }}></div>
        </div>
        
        <div className="text-center animate-fade-in">
          <div className="text-8xl mb-6">😵</div>
          <h1 className="text-4xl font-bold text-white mb-4">カウントアップが見つかりません</h1>
          <p className="text-white/70 text-xl mb-8">指定されたカウントアップは存在しないか、削除された可能性があります</p>
          <Link 
            href="/" 
            className="inline-flex items-center bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-4 rounded-2xl shadow-2xl font-bold text-lg transition-all duration-300 transform hover:scale-105"
          >
            <span className="text-2xl mr-3">🏠</span>
            トップページに戻る
          </Link>
        </div>
      </main>
    );
  }

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
        <div className="w-full max-w-4xl">
          {/* ヘッダー */}
          <div className="text-center mb-8 sm:mb-12 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mb-4 sm:mb-6 shadow-2xl">
              <span className="text-2xl sm:text-3xl">🎯</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent mb-4 drop-shadow-lg">
              {countdown?.name || 'カウントアップ'}
            </h1>
            <Link 
              href="/"
              className="inline-flex items-center bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-2xl shadow-lg font-semibold transition-all duration-300 transform hover:scale-105 text-sm sm:text-base"
            >
              <span className="mr-2">←</span>
              一覧に戻る
            </Link>
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

          {/* キャラクター画像 */}
          <div className="relative w-full mb-6 sm:mb-8">
            <div className="absolute right-2 sm:right-0 bottom-0 transform translate-y-1/4 z-10">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full blur-lg sm:blur-xl opacity-30 animate-pulse"></div>
                <Image 
                  src="/ninty.png" 
                  alt="キャラクター" 
                  width={100} 
                  height={100} 
                  className="relative z-10 animate-float drop-shadow-2xl sm:w-[120px] sm:h-[120px] lg:w-[150px] lg:h-[150px]"
                />
              </div>
            </div>
          </div>

          {/* メインカウンター表示 */}
          <div className="bg-white/10 backdrop-blur-lg p-6 sm:p-8 lg:p-12 rounded-3xl shadow-2xl mb-6 sm:mb-8 text-center relative border border-white/20 hover:bg-white/15 transition-all duration-300">
            {/* 目標値表示 */}
            <div className="mb-6 sm:mb-8">
              <div className="inline-flex items-center bg-white/20 backdrop-blur-sm px-4 sm:px-6 py-2 sm:py-3 rounded-2xl border border-white/30">
                <span className="text-lg sm:text-2xl mr-2 sm:mr-3">🏁</span>
                <span className="text-white/90 font-semibold text-sm sm:text-lg">目標: </span>
                <span className="text-white font-bold text-lg sm:text-2xl ml-2">{countdown.targetValue}</span>
              </div>
            </div>
            
            {/* 数字表示 */}
            <div className="flex justify-center gap-2 sm:gap-4 mb-6 sm:mb-8 overflow-x-auto">
              {getDigits(countdown.currentValue).map((digit, index) => (
                <div 
                  key={index} 
                  className="relative group flex-shrink-0"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-xl sm:rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
                  <div className="relative flex items-center justify-center w-16 h-24 sm:w-20 sm:h-32 lg:w-28 lg:h-40 bg-white/20 backdrop-blur-lg border-2 border-white/30 rounded-xl sm:rounded-2xl shadow-2xl text-4xl sm:text-6xl lg:text-8xl font-bold text-white hover:scale-105 transition-all duration-300 animate-fade-in-up">
                    <span className="drop-shadow-lg">{digit}</span>
                  </div>
                </div>
              ))}
            </div>
            
            {/* プログレスバー */}
            <div className="mb-6 sm:mb-8">
              <div className="flex justify-between text-white/80 text-sm sm:text-lg mb-3 sm:mb-4 font-semibold">
                <span>進捗状況</span>
                <span>{Math.round((countdown.currentValue / countdown.targetValue) * 100)}%</span>
              </div>
              <div className="relative w-full bg-white/20 rounded-full h-4 sm:h-6 overflow-hidden backdrop-blur-sm border border-white/30">
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 h-4 sm:h-6 rounded-full transition-all duration-1000 ease-out shadow-lg"
                  style={{ width: `${Math.min(100, Math.round((countdown.currentValue / countdown.targetValue) * 100))}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse"></div>
                </div>
              </div>
              <div className="mt-3 sm:mt-4 text-center">
                <span className="text-white/90 text-lg sm:text-xl font-semibold">
                  {countdown.currentValue} / {countdown.targetValue}
                </span>
              </div>
            </div>
            
            {/* お祝いアニメーション */}
            {showCelebration && isClient && (
              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none rounded-3xl" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <div className="w-full h-full max-w-sm sm:max-w-lg">
                  <Lottie
                    animationData={celebrationAnimation}
                    loop={true}
                    autoplay={true}
                    rendererSettings={{
                      preserveAspectRatio: 'xMidYMid slice'
                    }}
                    style={{ width: '100%', height: '100%' }}
                  />
                  <div className="absolute bottom-4 sm:bottom-8 left-1/2 transform -translate-x-1/2 text-center px-4">
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black px-4 sm:px-8 py-2 sm:py-4 rounded-2xl shadow-2xl">
                      <h2 className="text-lg sm:text-2xl lg:text-3xl font-bold">🎉 おめでとう！目標達成！ 🎉</h2>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 操作ボタン */}
          <div className="bg-white/10 backdrop-blur-lg p-4 sm:p-6 lg:p-8 rounded-3xl shadow-2xl mb-6 sm:mb-8 border border-white/20">
            <div className="flex items-center mb-4 sm:mb-6">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-green-400 to-blue-400 rounded-full flex items-center justify-center mr-3">
                <span className="text-white text-sm sm:text-lg">⚡</span>
              </div>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">カウントアップ操作</h2>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6 mb-6 sm:mb-8">
              <button 
                onClick={handleIncrement}
                disabled={countdown.currentValue >= countdown.targetValue}
                className="group relative bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-500 disabled:to-gray-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-2xl shadow-2xl font-bold text-sm sm:text-lg transition-all duration-300 transform hover:scale-105 disabled:cursor-not-allowed disabled:transform-none"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 rounded-2xl blur-lg opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
                <div className="relative flex items-center justify-center">
                  <span className="text-xl sm:text-2xl mr-2 sm:mr-3">⬆️</span>
                  カウントアップ
                </div>
              </button>
              
              <button 
                onClick={handleReset}
                className="group relative bg-gradient-to-r from-gray-500 to-slate-500 hover:from-gray-600 hover:to-slate-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-2xl shadow-2xl font-bold text-sm sm:text-lg transition-all duration-300 transform hover:scale-105"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-gray-400 to-slate-400 rounded-2xl blur-lg opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
                <div className="relative flex items-center justify-center">
                  <span className="text-xl sm:text-2xl mr-2 sm:mr-3">🔄</span>
                  リセット
                </div>
              </button>
            </div>
          </div>
          
          {/* 設定・情報パネル */}
          <div className="bg-white/10 backdrop-blur-lg p-4 sm:p-6 lg:p-8 rounded-3xl shadow-2xl border border-white/20">
            <div className="flex items-center mb-4 sm:mb-6">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex items-center justify-center mr-3">
                <span className="text-white text-sm sm:text-lg">⚙️</span>
              </div>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">設定・情報</h2>
            </div>
            
            {/* 値設定フォーム */}
            <div className="space-y-6 mb-6 sm:mb-8">
              <form onSubmit={handleSetName} className="space-y-3 sm:space-y-4">
                <label className="block text-white/90 font-semibold text-sm sm:text-lg">✏️ 名前を変更</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="flex-1 bg-white/20 backdrop-blur-sm border border-white/30 p-3 sm:p-4 rounded-2xl shadow-lg text-white placeholder-white/60 focus:outline-none focus:ring-4 focus:ring-purple-400/50 focus:border-purple-400 transition-all duration-300 text-sm sm:text-base"
                    placeholder="新しい名前を入力"
                  />
                  <button 
                    type="submit" 
                    className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-2xl shadow-lg font-bold transition-all duration-300 transform hover:scale-105 text-sm sm:text-base whitespace-nowrap"
                  >
                    変更
                  </button>
                </div>
              </form>

              <form onSubmit={handleSetCurrentValue} className="space-y-3 sm:space-y-4">
                <label className="block text-white/90 font-semibold text-sm sm:text-lg">📊 現在値を設定</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="number"
                    value={currentValueInput}
                    onChange={(e) => setCurrentValueInput(e.target.value)}
                    className="flex-1 bg-white/20 backdrop-blur-sm border border-white/30 p-3 sm:p-4 rounded-2xl shadow-lg text-white placeholder-white/60 focus:outline-none focus:ring-4 focus:ring-purple-400/50 focus:border-purple-400 transition-all duration-300 text-sm sm:text-base"
                    placeholder="現在値を入力"
                    min="0"
                    max={countdown.targetValue}
                  />
                  <button 
                    type="submit" 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-2xl shadow-lg font-bold transition-all duration-300 transform hover:scale-105 text-sm sm:text-base whitespace-nowrap"
                  >
                    設定
                  </button>
                </div>
              </form>

              <form onSubmit={handleSetTargetValue} className="space-y-3 sm:space-y-4">
                <label className="block text-white/90 font-semibold text-sm sm:text-lg">🎯 目標値を設定</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="number"
                    value={targetValueInput}
                    onChange={(e) => setTargetValueInput(e.target.value)}
                    className="flex-1 bg-white/20 backdrop-blur-sm border border-white/30 p-3 sm:p-4 rounded-2xl shadow-lg text-white placeholder-white/60 focus:outline-none focus:ring-4 focus:ring-purple-400/50 focus:border-purple-400 transition-all duration-300 text-sm sm:text-base"
                    placeholder="目標値を入力"
                    min="1"
                  />
                  <button 
                    type="submit" 
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-2xl shadow-lg font-bold transition-all duration-300 transform hover:scale-105 text-sm sm:text-base whitespace-nowrap"
                  >
                    設定
                  </button>
                </div>
              </form>
            </div>

            {/* 詳細情報 */}
            <div className="bg-white/10 backdrop-blur-sm p-4 sm:p-6 rounded-2xl border border-white/20">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center">
                <span className="text-xl sm:text-2xl mr-2 sm:mr-3">📋</span>
                詳細情報
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-white/80">
                <div className="flex items-center">
                  <span className="text-base sm:text-lg mr-2">🆔</span>
                  <span className="font-semibold mr-2 text-sm sm:text-base">ID:</span>
                  <span className="text-sm sm:text-base">{countdown.id}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-base sm:text-lg mr-2">📅</span>
                  <span className="font-semibold mr-2 text-sm sm:text-base">作成日:</span>
                  <span className="text-sm sm:text-base">{new Date(countdown.createdAt).toLocaleDateString('ja-JP')}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-base sm:text-lg mr-2">🕒</span>
                  <span className="font-semibold mr-2 text-sm sm:text-base">更新日:</span>
                  <span className="text-sm sm:text-base">{new Date(countdown.updatedAt).toLocaleDateString('ja-JP')}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-base sm:text-lg mr-2">📈</span>
                  <span className="font-semibold mr-2 text-sm sm:text-base">達成率:</span>
                  <span className="text-sm sm:text-base">{Math.round((countdown.currentValue / countdown.targetValue) * 100)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 