'use client';

import { useEffect, useState, useRef } from 'react';

type Page = {
  id: string;
  content: string;
};

export default function TategakiEditor() {
  const [pages, setPages] = useState<Page[]>([{ id: '1', content: '' }]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isVertical, setIsVertical] = useState(true);
  const [charCount, setCharCount] = useState(0);
  const [lineCount, setLineCount] = useState(1);
  const [showHelp, setShowHelp] = useState(false);
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiModel, setAiModel] = useState('gemini-1.5-flash');
  const [promptText, setPromptText] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 現在のページを取得
  const currentPage = pages[currentPageIndex];


  // カーソル位置を保存・復元する関数
  const saveCursorPosition = () => {
    if (!editorRef.current) return null;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    
    const range = selection.getRangeAt(0);
    return {
      startOffset: range.startOffset,
      endOffset: range.endOffset,
      startContainer: range.startContainer,
      endContainer: range.endContainer
    };
  };

  const restoreCursorPosition = (position: any) => {
    if (!position || !editorRef.current) return;
    
    try {
      const selection = window.getSelection();
      if (!selection) return;
      
      const range = document.createRange();
      range.setStart(position.startContainer, position.startOffset);
      range.setEnd(position.endContainer, position.endOffset);
      
      selection.removeAllRanges();
      selection.addRange(range);
    } catch (error) {
      // カーソル位置復元に失敗した場合は末尾に移動
      moveCursorToEnd();
    }
  };

  const moveCursorToEnd = () => {
    if (!editorRef.current) return;
    
    const selection = window.getSelection();
    if (!selection) return;
    
    const range = document.createRange();
    range.selectNodeContents(editorRef.current);
    range.collapse(false); // 末尾に移動
    
    selection.removeAllRanges();
    selection.addRange(range);
  };

  // HTMLの構造から実際の行数を計算する関数
  const calculateActualLineCount = () => {
    if (!editorRef.current) return 1;
    
    const htmlContent = editorRef.current.innerHTML;
    console.log('HTML content:', htmlContent);
    
    // 完全に空の場合は1行
    if (!htmlContent || htmlContent === '' || htmlContent === '<br>') {
      return 1;
    }
    
    // <div>要素の数を数える（contentEditableでは各行が<div>になる）
    const divMatches = htmlContent.match(/<div[^>]*>/g);
    const divCount = divMatches ? divMatches.length : 0;
    
    // <br>タグの数を数える
    const brMatches = htmlContent.match(/<br[^>]*>/g);
    const brCount = brMatches ? brMatches.length : 0;
    
    console.log('Div count:', divCount, 'BR count:', brCount);
    
    // 行数の計算ロジック
    if (divCount > 0) {
      // <div>がある場合は、div数が行数（各divが1行を表す）
      return divCount;
    } else if (brCount > 0) {
      // <br>のみの場合は、br数 + 1が行数
      return brCount + 1;
    } else {
      // テキストがある場合は1行
      return 1;
    }
  };

  // エディタの内容が変更されたときの処理
  const handleEditorChange = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      const newPages = [...pages];
      newPages[currentPageIndex] = { ...currentPage, content };
      setPages(newPages);
      
      // 純粋な文字数をカウント（改行文字は除く）
      const plainText = editorRef.current.innerText || '';
      const pureText = plainText.replace(/\n/g, '');
      setCharCount(pureText.length);
      
      // 実際の行数を計算
      const actualLines = calculateActualLineCount();
      setLineCount(actualLines);
    }
  };

  // AI文章生成ダイアログを開く
  const openPromptDialog = () => {
    setPromptText('');
    setShowPromptDialog(true);
  };

  // AI文章生成を実行
  const generateAIText = async () => {
    if (!editorRef.current || isGenerating || !promptText.trim()) return;

    setIsGenerating(true);
    setShowPromptDialog(false);
    
    try {
      // 現在のテキストを取得して文脈として使用
      const currentText = editorRef.current.innerText || '';
      const context = currentText.slice(-500); // 最後の500文字を文脈として使用

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userPrompt: promptText,
          context: context,
          model: aiModel 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'AI生成に失敗しました');
      }
      
      // カーソル位置に生成されたテキストを挿入
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const textNode = document.createTextNode(data.text);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
      }

      // ページデータを更新
      handleEditorChange();
    } catch (error) {
      console.error('AI生成エラー:', error);
      alert(`AI文章生成に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // キーボードショートカット
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      addNewPage();
    } else if (e.metaKey && e.key === 'k') {
      e.preventDefault();
      openPromptDialog();
    } else if (e.ctrlKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      goToPage(currentPageIndex + 1);
    } else if (e.ctrlKey && e.key === 'ArrowRight') {
      e.preventDefault();
      goToPage(currentPageIndex - 1);
    }
  };

  // 新しいページを追加
  const addNewPage = () => {
    const newPage: Page = {
      id: (pages.length + 1).toString(),
      content: ''
    };
    setPages([...pages, newPage]);
    setCurrentPageIndex(pages.length);
    // 新しいページでフォーカスを設定
    setTimeout(() => {
      editorRef.current?.focus();
      moveCursorToEnd();
    }, 50);
  };

  // ページ移動
  const goToPage = (index: number) => {
    if (index >= 0 && index < pages.length) {
      setCurrentPageIndex(index);
      // ページ移動後にフォーカスを戻す
      setTimeout(() => {
        editorRef.current?.focus();
        moveCursorToEnd();
      }, 50);
    }
  };

  // 現在のページを削除
  const deleteCurrentPage = () => {
    if (pages.length === 1) {
      // 最後の1ページの場合は内容をクリア
      const newPages = [{ id: '1', content: '' }];
      setPages(newPages);
      setCurrentPageIndex(0);
    } else {
      const newPages = pages.filter((_, index) => index !== currentPageIndex);
      setPages(newPages);
      const newIndex = Math.min(currentPageIndex, newPages.length - 1);
      setCurrentPageIndex(newIndex);
    }
    // 削除後にフォーカスを戻す
    setTimeout(() => {
      editorRef.current?.focus();
      moveCursorToEnd();
    }, 50);
  };

  // 全ページを削除
  const deleteAllPages = () => {
    if (confirm('すべてのページを削除してもよろしいですか？')) {
      setPages([{ id: '1', content: '' }]);
      setCurrentPageIndex(0);
      // 削除後にフォーカスを戻す
      setTimeout(() => {
        editorRef.current?.focus();
        moveCursorToEnd();
      }, 50);
    }
  };

  // ファイルをインポート
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const pageContents = content.split('\n\n'); // ダブル改行でページ分割
        const newPages = pageContents.map((content, index) => ({
          id: (index + 1).toString(),
          content: content.replace(/\n/g, '<br>')
        }));
        setPages(newPages);
        setCurrentPageIndex(0);
        // インポート後にフォーカスを設定
        setTimeout(() => {
          editorRef.current?.focus();
          moveCursorToEnd();
        }, 50);
      };
      reader.readAsText(file);
    }
  };

  // ファイルをエクスポート
  const handleFileExport = () => {
    const plainTextPages = pages.map(page => {
      const tempElement = document.createElement('div');
      tempElement.innerHTML = page.content;
      return tempElement.innerText;
    });
    
    const blob = new Blob([plainTextPages.join('\n\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tategaki-document.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // 縦書き/横書き切替
  const toggleWritingMode = () => {
    setIsVertical(!isVertical);
  };

  // エディタの内容を更新
  useEffect(() => {
    if (editorRef.current) {
      const cursorPosition = saveCursorPosition();
      editorRef.current.innerHTML = currentPage.content;
      
      // DOMが更新された後に統計を更新
      setTimeout(() => {
        handleEditorChange();
        
        // カーソル位置を復元、失敗したら末尾に移動
        if (cursorPosition) {
          restoreCursorPosition(cursorPosition);
        } else {
          moveCursorToEnd();
        }
        editorRef.current?.focus();
      }, 0);
    }
  }, [currentPageIndex]);

  // 初期フォーカス
  useEffect(() => {
    if (editorRef.current) {
      // 初期化時にも統計を更新
      setTimeout(() => {
        // 初期状態では強制的に1行に設定
        setCharCount(0);
        setLineCount(1);
        editorRef.current?.focus();
        moveCursorToEnd();
      }, 100);
    }
  }, []);

  return (
    <main className="h-screen bg-white flex flex-col overflow-hidden">
      {/* 極小ヘッダー */}
      <div className="bg-gray-100/50 border-b border-gray-200 px-2 py-1 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-600 rounded flex items-center justify-center mr-2">
              <span className="text-white text-xs font-bold">縦</span>
            </div>
            <h1 className="text-sm font-medium text-gray-700">tategaki</h1>
          </div>
          
          {/* コンパクトコントロール */}
          <div className="flex items-center space-x-1">
            {/* ページナビゲーション */}
            <button
              onClick={() => goToPage(currentPageIndex - 1)}
              disabled={currentPageIndex === 0}
              className="w-6 h-6 border border-gray-400 text-gray-700 rounded text-xs hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              title="前のページ"
            >
              ◀
            </button>
            
            <input
              type="number"
              min="1"
              max={pages.length}
              value={currentPageIndex + 1}
              onChange={(e) => goToPage(Number(e.target.value) - 1)}
              className="w-8 h-6 px-1 text-xs text-center border border-gray-300 rounded"
            />
            <span className="text-xs text-gray-500">/{pages.length}</span>
            
            <button
              onClick={() => goToPage(currentPageIndex + 1)}
              disabled={currentPageIndex === pages.length - 1}
              className="w-6 h-6 border border-gray-400 text-gray-700 rounded text-xs hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              title="次のページ"
            >
              ▶
            </button>
            
            {/* 機能ボタン */}
            <div className="w-px h-4 bg-gray-300 mx-1"></div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt"
              onChange={handleFileImport}
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-6 h-6 border border-gray-400 text-gray-700 rounded text-xs hover:bg-gray-100"
              title="ファイルを開く"
            >
              📂
            </button>
            
            <button
              onClick={handleFileExport}
              className="w-6 h-6 border border-gray-400 text-gray-700 rounded text-xs hover:bg-gray-100"
              title="ファイルを保存"
            >
              💾
            </button>
            
            <button
              onClick={toggleWritingMode}
              className="w-6 h-6 border border-gray-400 text-gray-700 rounded text-xs hover:bg-gray-100"
              title={isVertical ? '横書きに切替' : '縦書きに切替'}
            >
              {isVertical ? '≡' : '∥'}
            </button>
            
            <button
              onClick={addNewPage}
              className="w-6 h-6 border border-gray-400 text-gray-700 rounded text-xs hover:bg-gray-100"
              title="新規ページ"
            >
              ＋
            </button>
            
            <button
              onClick={deleteCurrentPage}
              className="w-6 h-6 border border-gray-400 text-gray-700 rounded text-xs hover:bg-gray-100"
              title="ページ削除"
            >
              ■
            </button>
            
            <button
              onClick={deleteAllPages}
              className="w-6 h-6 border border-gray-400 text-gray-700 rounded text-xs hover:bg-gray-100"
              title="全削除"
            >
              ✕
            </button>
            
            {/* AI生成ボタン */}
            <div className="w-px h-4 bg-gray-300 mx-1"></div>
            
            <button
              onClick={openPromptDialog}
              disabled={isGenerating}
              className="w-6 h-6 border border-gray-400 text-gray-700 rounded text-xs hover:bg-gray-100 disabled:opacity-50"
              title="AI文章生成 (Cmd+K)"
            >
              {isGenerating ? '⏳' : '✨'}
            </button>
            
            {/* AIモデル選択 */}
            <select
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              className="h-6 px-1 text-xs border border-gray-400 rounded bg-white"
              title="AIモデル選択"
            >
              <option value="gemini-1.5-flash">Flash</option>
              <option value="gemini-1.5-pro">Pro</option>
              <option value="gemini-2.0-flash-exp">2.0 Flash</option>
            </select>
            
            {/* ヘルプボタン */}
            <button
              onClick={() => setShowHelp(true)}
              className="w-6 h-6 border border-gray-400 text-gray-700 rounded text-xs hover:bg-gray-100"
              title="ショートカットキー"
            >
              ？
            </button>
                        </div>
                      </div>
                    </div>

      {/* エディタエリア（画面の95%） */}
      <div className="flex-1 overflow-hidden">
        <div
          ref={editorRef}
          contentEditable
          className={`w-full h-full p-8 outline-none resize-none font-serif text-lg leading-relaxed editor-focus ${
            isVertical
              ? 'writing-mode-vertical-rl text-orientation-upright'
              : 'writing-mode-horizontal-tb'
          }`}
          style={{
            writingMode: isVertical ? 'vertical-rl' : 'horizontal-tb',
            textOrientation: isVertical ? 'upright' : 'mixed',
            fontFamily: '"Noto Serif JP", "Yu Mincho", "YuMincho", "Hiragino Mincho ProN", serif'
          }}
          onInput={handleEditorChange}
          onKeyDown={handleKeyDown}
          suppressContentEditableWarning={true}
        />
              </div>

      {/* 極小ステータスバー */}
      <div className="bg-gray-100/50 border-t border-gray-200 px-2 py-1 flex-shrink-0">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>文字数: {charCount}</span>
          <span>行数: {lineCount}</span>
          <span>Ctrl+Enter: 改ページ | Cmd+K: AI生成</span>
        </div>
      </div>

      {/* AI生成プロンプトダイアログ */}
      {showPromptDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">AI文章生成</h3>
              <button
                onClick={() => setShowPromptDialog(false)}
                className="w-6 h-6 border border-gray-400 text-gray-700 rounded text-xs hover:bg-gray-100"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  AIへの指示を入力してください
                </label>
                <textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: 続きを書いて、この場面をより詳しく描写して、対話を追加して、など"
                  autoFocus
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600">モデル:</label>
                  <select
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    className="px-2 py-1 text-sm border border-gray-300 rounded"
                  >
                    <option value="gemini-1.5-flash">Flash (高速)</option>
                    <option value="gemini-1.5-pro">Pro (高性能)</option>
                    <option value="gemini-2.0-flash-exp">2.0 Flash (実験版)</option>
                  </select>
              </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowPromptDialog(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-100"
                  >
                    キャンセル
                  </button>
              <button 
                    onClick={generateAIText}
                    disabled={!promptText.trim() || isGenerating}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? '生成中...' : '生成'}
              </button>
          </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
              <strong>ヒント:</strong> 現在書いている文章の最後の500文字が文脈として自動的に送信されます。
            </div>
              </div>
            </div>
          )}
          
      {/* ヘルプダイアログ */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">ショートカットキー</h3>
              <button
                onClick={() => setShowHelp(false)}
                className="w-6 h-6 border border-gray-400 text-gray-700 rounded text-xs hover:bg-gray-100"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="font-semibold text-gray-700">キー</div>
                <div className="font-semibold text-gray-700">機能</div>
                </div>
              
              <div className="grid grid-cols-2 gap-2 py-1 border-t border-gray-200">
                <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">Ctrl + Enter</kbd>
                <span>新しいページを作成</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 py-1">
                <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">Cmd + K</kbd>
                <span>AI文章生成</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 py-1">
                <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">Ctrl + ← / →</kbd>
                <span>ページ移動</span>
                          </div>
                          
              <div className="grid grid-cols-2 gap-2 py-1">
                <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">縦/横ボタン</kbd>
                <span>書字モード切替</span>
                            </div>
                          </div>
                          
            <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
              <strong>AI生成について:</strong><br/>
              AIを使用するには、環境変数にGOOGLE_GENERATIVE_AI_API_KEYを設定してください。
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline ml-1">
                API キーを取得
              </a>
                        </div>
                        
            <div className="mt-4 flex justify-end">
                          <button
                onClick={() => setShowHelp(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                          >
                閉じる
                          </button>
                        </div>
          </div>
        </div>
      )}
    </main>
  );
}