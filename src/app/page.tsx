'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Page = {
  id: string;
  content: string;
};

type SessionUser = {
  id: string;
  email: string;
  displayName: string | null;
};

type CloudDocumentSummary = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};

type AuthMode = 'login' | 'signup';

const PAGE_BREAK_SENTINEL = '\n\n=== tategaki:page-break ===\n\n';
const DEFAULT_DOCUMENT_TITLE = '無題';

const htmlToPlainText = (html: string): string => {
  if (!html) return '';

  let text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(div|p|li|h[1-6]|blockquote|pre)>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

  text = text
    .replace(/\r\n?/g, '\n')
    .replace(/[\t ]+\n/g, '\n');

  return text;
};

const serializePagesToPlainText = (pages: Page[]) => {
  const plainTextPages = pages.map(page => htmlToPlainText(page.content || ''));
  return plainTextPages.join(PAGE_BREAK_SENTINEL);
};

export default function TategakiEditor() {
  const [pages, setPages] = useState<Page[]>([{ id: '1', content: '' }]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isVertical, setIsVertical] = useState(true);
  const [charCount, setCharCount] = useState(0);
  const [lineCount, setLineCount] = useState(1);
  const [maxLinesPerPage, setMaxLinesPerPage] = useState(25); // デフォルト値
  const [showHelp, setShowHelp] = useState(false);
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [showIntroDialog, setShowIntroDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiModel, setAiModel] = useState('gemini-1.5-flash');
  const [promptText, setPromptText] = useState('');
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [revealApiKey, setRevealApiKey] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authPasswordConfirm, setAuthPasswordConfirm] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [cloudDocuments, setCloudDocuments] = useState<CloudDocumentSummary[]>([]);
  const [showCloudDialog, setShowCloudDialog] = useState(false);
  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [isCloudSaving, setIsCloudSaving] = useState(false);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [cloudStatus, setCloudStatus] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);
  const [documentTitle, setDocumentTitle] = useState(DEFAULT_DOCUMENT_TITLE);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeCloudDocument = useMemo(() => {
    if (!activeDocumentId) return null;
    return cloudDocuments.find(doc => doc.id === activeDocumentId) ?? null;
  }, [activeDocumentId, cloudDocuments]);

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

  // エディタのサイズを測定して1ページあたりの最大行数を計算する関数
  const calculateMaxLinesPerPage = () => {
    if (!editorRef.current) return 25; // デフォルト値
    
    const rect = editorRef.current.getBoundingClientRect();
    const style = window.getComputedStyle(editorRef.current);
    
    // パディングを考慮した実際のコンテンツエリアの高さ
    const paddingTop = parseFloat(style.paddingTop) || 0;
    const paddingBottom = parseFloat(style.paddingBottom) || 0;
    const contentHeight = rect.height - paddingTop - paddingBottom;
    
    // 行の高さを計算（line-heightから）
    const lineHeight = parseFloat(style.lineHeight) || 
                      parseFloat(style.fontSize) * 1.5; // fallback
    
    const maxLines = Math.floor(contentHeight / lineHeight);
    
    // 縦書きの場合は列数として計算する必要がある
    if (isVertical) {
      const paddingLeft = parseFloat(style.paddingLeft) || 0;
      const paddingRight = parseFloat(style.paddingRight) || 0;
      const contentWidth = rect.width - paddingLeft - paddingRight;
      
      // 縦書きでは文字の幅が重要
      const fontSize = parseFloat(style.fontSize) || 18;
      const charWidth = fontSize * 1.2; // 文字幅に余裕を持たせる
      const columns = Math.floor(contentWidth / charWidth);
      console.log('Vertical mode - contentWidth:', contentWidth, 'charWidth:', charWidth, 'columns:', columns);
      return Math.max(5, columns - 1); // 最低5列、余裕を持って-1列
    }
    
    const result = Math.max(10, maxLines - 2); // 最低10行、余裕を持って-2行
    console.log('calculateMaxLinesPerPage result:', result, 'contentHeight:', contentHeight, 'lineHeight:', lineHeight);
    return result;
  };

  // 実際のコンテンツ量を計算する関数（縦書き・横書き両対応）
  const calculateActualContentLines = () => {
    if (!editorRef.current) return 1;
    
    const plainText = editorRef.current.innerText || '';
    console.log('Plain text length:', plainText.length);
    
    if (isVertical) {
      // 縦書きの場合：文字数ベースで列数を計算
      // 空行も考慮して改行文字を含めた計算
      const lines = plainText.split('\n');
      const totalChars = lines.reduce((sum, line) => sum + Math.max(1, line.length), 0);
      
      // 1列あたりの最大文字数（画面の高さに基づく）
      const rect = editorRef.current.getBoundingClientRect();
      const style = window.getComputedStyle(editorRef.current);
      const paddingTop = parseFloat(style.paddingTop) || 0;
      const paddingBottom = parseFloat(style.paddingBottom) || 0;
      const contentHeight = rect.height - paddingTop - paddingBottom;
      const fontSize = parseFloat(style.fontSize) || 18;
      const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.5;
      const maxCharsPerColumn = Math.floor(contentHeight / lineHeight);
      
      const columnCount = Math.ceil(totalChars / maxCharsPerColumn);
      console.log('Vertical mode - totalChars:', totalChars, 'maxCharsPerColumn:', maxCharsPerColumn, 'columnCount:', columnCount);
      return columnCount;
    } else {
      // 横書きの場合：行数ベース
      const lines = plainText.split('\n');
      const actualLineCount = lines.length;
      console.log('Horizontal mode - actualLineCount:', actualLineCount);
      return actualLineCount;
    }
  };

  // 自動ページ送り処理（複数ページにまたがる場合も対応）
  const handleAutoPageBreak = () => {
    if (!editorRef.current) return;
    
    const actualLines = calculateActualContentLines();
    console.log('Auto page break check - actualLines:', actualLines, 'maxLinesPerPage:', maxLinesPerPage);
    
    // 最大行数を超えた場合
    if (actualLines > maxLinesPerPage) {
      console.log('Triggering auto page break!');
      
      // テキストベースで分割処理を行う
      const plainText = editorRef.current.innerText || '';
      const lines = plainText.split('\n');
      
      let pageTexts: string[] = [];
      let currentPageText = '';
      let currentContentCount = 0;
      
      if (isVertical) {
        // 縦書きの場合：文字数ベースで分割
        const rect = editorRef.current.getBoundingClientRect();
        const style = window.getComputedStyle(editorRef.current);
        const paddingTop = parseFloat(style.paddingTop) || 0;
        const paddingBottom = parseFloat(style.paddingBottom) || 0;
        const contentHeight = rect.height - paddingTop - paddingBottom;
        const fontSize = parseFloat(style.fontSize) || 18;
        const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.5;
        const maxCharsPerPage = Math.floor(contentHeight / lineHeight) * maxLinesPerPage;
        
        for (const line of lines) {
          const lineChars = Math.max(1, line.length);
          
          if (currentContentCount + lineChars > maxCharsPerPage && currentPageText) {
            pageTexts.push(currentPageText.trim());
            currentPageText = line;
            currentContentCount = lineChars;
          } else {
            currentPageText += (currentPageText ? '\n' : '') + line;
            currentContentCount += lineChars;
          }
        }
      } else {
        // 横書きの場合：行数ベースで分割
        for (const line of lines) {
          if (currentContentCount >= maxLinesPerPage && currentPageText) {
            pageTexts.push(currentPageText.trim());
            currentPageText = line;
            currentContentCount = 1;
          } else {
            currentPageText += (currentPageText ? '\n' : '') + line;
            currentContentCount++;
          }
        }
      }
      
      // 最後のページも追加
      if (currentPageText) {
        pageTexts.push(currentPageText.trim());
      }
      
      console.log('Split into', pageTexts.length, 'pages');
      
      // ページデータを更新
      const newPages = [...pages];
      
      // 現在のページを最初の分割ページで更新
      if (pageTexts.length > 0) {
        newPages[currentPageIndex] = { 
          ...currentPage, 
          content: pageTexts[0].replace(/\n/g, '<br>') 
        };
      }
      
      // 追加のページを作成
      for (let i = 1; i < pageTexts.length; i++) {
        const newPage: Page = {
          id: (newPages.length + i).toString(),
          content: pageTexts[i].replace(/\n/g, '<br>')
        };
        newPages.splice(currentPageIndex + i, 0, newPage);
      }
      
      setPages(newPages);
      
      // 最後のページに移動
      const lastNewPageIndex = currentPageIndex + pageTexts.length - 1;
      setCurrentPageIndex(lastNewPageIndex);
      
      // 最後のページでフォーカスを設定
      setTimeout(() => {
        if (editorRef.current && pageTexts.length > 0) {
          editorRef.current.innerHTML = pageTexts[pageTexts.length - 1].replace(/\n/g, '<br>');
          editorRef.current.focus();
          moveCursorToEnd();
        }
      }, 50);
    }
  };

  // エディタの内容が変更されたときの処理
  const handleEditorChange = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      // 変更がない場合はページ配列を更新しない（無限再レンダを防止）
      if (content !== currentPage.content) {
        setPages(prev => {
          const next = [...prev];
          const idx = Math.min(currentPageIndex, next.length - 1);
          next[idx] = { ...next[idx], content };
          return next;
        });
      }
      
      // 純粋な文字数をカウント（改行文字は除く）
      const plainText = editorRef.current.innerText || '';
      const pureText = plainText.replace(/\n/g, '');
      setCharCount(pureText.length);
      
      // 実際の行数を計算
      const actualLines = calculateActualContentLines();
      setLineCount(actualLines);
      
      // 自動ページ送りチェック
      setTimeout(() => {
        handleAutoPageBreak();
      }, 100); // DOM更新後に実行
    }
  };

  // ペースト時の処理
  const handlePaste = (e: React.ClipboardEvent) => {
    // デフォルトの貼り付け処理の後に改ページチェックを実行
    setTimeout(() => {
      console.log('Paste event - checking for page break');
      console.log('Current maxLinesPerPage:', maxLinesPerPage);
      handleEditorChange();
    }, 150); // 貼り付け処理完了後に実行
  };

  // AI文章生成ダイアログを開く
  const openPromptDialog = () => {
    setPromptText('');
    setShowPromptDialog(true);
  };

  // AI文章生成を実行
  const generateAIText = async () => {
    if (!editorRef.current || isGenerating || !promptText.trim()) return;

    // APIキー未設定なら設定ダイアログを開く
    if (!googleApiKey) {
      setShowPromptDialog(false);
      setShowApiKeyDialog(true);
      return;
    }

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
          model: aiModel,
          apiKey: googleApiKey,
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
    } else if (e.shiftKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      goToPage(currentPageIndex + 1); // 左矢印で次のページへ（縦書きでは左が進む方向）
    } else if (e.shiftKey && e.key === 'ArrowRight') {
      e.preventDefault();
      goToPage(currentPageIndex - 1); // 右矢印で前のページへ（縦書きでは右が戻る方向）
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
    if (!confirm('現在表示中のページを削除します。よろしいですか？')) {
      return;
    }

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
      setActiveDocumentId(null);
      setDocumentTitle(DEFAULT_DOCUMENT_TITLE);
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
        const content = (e.target?.result as string) || '';
        // 事前に改行コードをLFへ正規化
        const normalized = content.replace(/\r\n?/g, '\n');
        
        // ページ区切り検出（明示的なセパレータ優先）
        const SENTINEL_TEXT = '=== tategaki:page-break ===';
        const lines = normalized.split('\n');
        const segments: string[] = [];
        let buffer: string[] = [];
        for (const line of lines) {
          const trimmed = line.trim();
          // 専用セパレータ行を厳密に検出（大小無視）
          if (trimmed.toLowerCase() === SENTINEL_TEXT.toLowerCase()) {
            segments.push(buffer.join('\n'));
            buffer = [];
          } else {
            buffer.push(line);
          }
        }
        segments.push(buffer.join('\n'));

        let pageContents: string[] = segments;

        // セパレータが見つからず1ページしかない場合は、従来区切りにフォールバック
        if (pageContents.length === 1) {
          // 区切り線のみの行（--- または ===）で分割
          const hrLineRe = /\n\s*(?:-{3,}|={3,})\s*\n/;
          if (hrLineRe.test(normalized)) {
            pageContents = normalized.split(hrLineRe);
          } else {
            const tripleNlRe = /\n{3,}/; // 3つ以上の連続改行
            if (tripleNlRe.test(normalized)) {
              pageContents = normalized.split(tripleNlRe);
            } else {
              const doubleNlRe = /\n{2}/; // ダブル改行
              if (doubleNlRe.test(normalized)) {
                const tentative = normalized.split(doubleNlRe);
                if (tentative.length > 1) pageContents = tentative;
              }
            }
          }
        }

        // console.debug('Imported pages:', pageContents.length);
        
        console.log('tategaki import: split into pages =', pageContents.length);
        // 改行をHTMLに変換（先頭末尾の空行も保持）
        const newPages = pageContents.map((pageContent, index) => ({
          id: (index + 1).toString(),
          content: (pageContent || '')
            .replace(/\n/g, '<br>')
        }));
        
        // 最低1ページは必要
        if (newPages.length === 0) {
          newPages.push({ id: '1', content: '' });
        }
        
        setPages(newPages);
        setCurrentPageIndex(0);
        setActiveDocumentId(null);
        if (file.name) {
          const nameWithoutExt = file.name.replace(/\.[^.]+$/, '');
          setDocumentTitle(nameWithoutExt || DEFAULT_DOCUMENT_TITLE);
        }
        
        // インポート後にフォーカスのみ設定（古いクロージャで状態を上書きしないため）
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.focus();
            moveCursorToEnd();
          }
        }, 100);
      };
      reader.readAsText(file);
    }
  };

  // ファイルをエクスポート
  const handleFileExport = () => {
    const fileContent = serializePagesToPlainText(pages);

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tategaki-document.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const openAuthDialog = (mode: AuthMode = 'login') => {
    setAuthMode(mode);
    setAuthError(null);
    setAuthPassword('');
    setAuthPasswordConfirm('');
    setShowAuthDialog(true);
  };

  const closeAuthDialog = () => {
    setShowAuthDialog(false);
    setAuthMode('login');
    setAuthError(null);
    setAuthPassword('');
    setAuthPasswordConfirm('');
  };

  const handleAuthModeSwitch = () => {
    setAuthMode((prev) => (prev === 'login' ? 'signup' : 'login'));
    setAuthPassword('');
    setAuthPasswordConfirm('');
    setAuthError(null);
  };

  const fetchCloudDocuments = useCallback(async () => {
    if (!user) return;
    setIsCloudLoading(true);
    try {
      const response = await fetch('/api/cloud/documents');
      if (!response.ok) {
        console.error('Failed to fetch cloud documents');
        return;
      }
      const data = await response.json();
      setCloudDocuments(Array.isArray(data.documents) ? data.documents : []);
    } catch (error) {
      console.error('Cloud documents fetch error', error);
    } finally {
      setIsCloudLoading(false);
    }
  }, [user]);

  const handleAuthSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(null);
    setIsAuthLoading(true);
    const mode = authMode;

    if (authPassword.length < 8) {
      setAuthError('パスワードは8文字以上で入力してください');
      setIsAuthLoading(false);
      return;
    }

    if (mode === 'signup' && authPassword !== authPasswordConfirm) {
      setAuthError('確認用パスワードが一致しません');
      setIsAuthLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: authEmail.trim(),
          displayName: authDisplayName || undefined,
          password: authPassword,
          mode,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'ログインに失敗しました');
      }

      setUser(data.user);
      closeAuthDialog();
      setAuthEmail('');
      setAuthDisplayName(data.user?.displayName ?? '');
      setAuthPassword('');
      setAuthPasswordConfirm('');
      setCloudStatus({
        message: mode === 'signup' ? 'アカウントを作成しました' : 'ログインしました',
        tone: 'success',
      });
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'ログインに失敗しました');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      setUser(null);
      setCloudDocuments([]);
      setActiveDocumentId(null);
      setCloudStatus({ message: 'ログアウトしました', tone: 'success' });
    }
  };

  const saveDocumentToCloud = async () => {
    if (!user) {
      openAuthDialog('login');
      return;
    }
    if (isCloudSaving) return;

    setIsCloudSaving(true);
    try {
      const plainText = serializePagesToPlainText(pages);
      const normalizedTitle = documentTitle.trim() || DEFAULT_DOCUMENT_TITLE;
      const response = await fetch('/api/cloud/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: activeDocumentId ?? undefined,
          title: normalizedTitle,
          content: plainText,
          pages,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'クラウド保存に失敗しました');
      }

      if (data.document?.title) {
        setDocumentTitle(data.document.title);
      }
      setActiveDocumentId(data.document?.id ?? null);
      setCloudStatus({ message: 'クラウドに保存しました', tone: 'success' });
      fetchCloudDocuments();
    } catch (error) {
      console.error('Cloud save error', error);
      setCloudStatus({
        message: error instanceof Error ? error.message : 'クラウド保存に失敗しました',
        tone: 'error',
      });
    } finally {
      setIsCloudSaving(false);
    }
  };

  const openCloudDialog = () => {
    if (!user) {
      openAuthDialog('login');
      return;
    }
    setShowCloudDialog(true);
    if (!cloudDocuments.length) {
      fetchCloudDocuments();
    }
  };

  const closeCloudDialog = () => setShowCloudDialog(false);

  const loadDocumentFromCloud = async (documentId: string) => {
    if (!user) {
      openAuthDialog('login');
      return;
    }

    setIsCloudLoading(true);
    try {
      const response = await fetch(`/api/cloud/documents/${documentId}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'クラウドデータの取得に失敗しました');
      }

      const remotePages: Page[] = Array.isArray(data.document?.pages)
        ? data.document.pages.map((page: any, index: number) => ({
            id: typeof page.id === 'string' ? page.id : String(index + 1),
            content: typeof page.content === 'string' ? page.content : '',
          }))
        : [
            {
              id: '1',
              content: (data.document?.content || '').replace(/\n/g, '<br>'),
            },
          ];

      setPages(remotePages.length > 0 ? remotePages : [{ id: '1', content: '' }]);
      setCurrentPageIndex(0);
      setActiveDocumentId(documentId);
      setDocumentTitle(data.document?.title || DEFAULT_DOCUMENT_TITLE);
      setShowCloudDialog(false);
      setCloudStatus({ message: 'クラウドから読み込みました', tone: 'success' });

      setTimeout(() => {
        editorRef.current?.focus();
        moveCursorToEnd();
      }, 100);
    } catch (error) {
      console.error('Cloud load error', error);
      alert(error instanceof Error ? error.message : 'クラウドデータの取得に失敗しました');
    } finally {
      setIsCloudLoading(false);
    }
  };

  // 縦書き/横書き切替
  const toggleWritingMode = () => {
    setIsVertical(!isVertical);
    // モード切替時に最大行数を再計算
    setTimeout(() => {
      const newMaxLines = calculateMaxLinesPerPage();
      setMaxLinesPerPage(newMaxLines);
    }, 100);
  };

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch('/api/auth/session');
        if (!response.ok) return;
        const data = await response.json();
        if (data.user) {
          setUser(data.user);
        }
      } catch (error) {
        console.error('Failed to fetch session', error);
      }
    };

    fetchSession();
  }, []);

  useEffect(() => {
    if (!user) {
      setCloudDocuments([]);
      setActiveDocumentId(null);
      return;
    }
    fetchCloudDocuments();
  }, [user, fetchCloudDocuments]);

  useEffect(() => {
    if (!cloudStatus) return;
    const timer = setTimeout(() => setCloudStatus(null), 4000);
    return () => clearTimeout(timer);
  }, [cloudStatus]);

  // エディタの内容を更新（ページ配列やページ移動の変化に追従）
  useEffect(() => {
    if (!editorRef.current) return;
    const page = pages[currentPageIndex];
    if (!page) return;

    // すでにDOMと状態が一致している場合は再描画しない（タイピングの引っかかり防止）
    if (editorRef.current.innerHTML === page.content) return;

    const cursorPosition = saveCursorPosition();
    editorRef.current.innerHTML = page.content;

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
  }, [currentPageIndex, pages]);

  // ウィンドウリサイズ時の最大行数再計算
  useEffect(() => {
    const handleResize = () => {
      const newMaxLines = calculateMaxLinesPerPage();
      setMaxLinesPerPage(newMaxLines);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isVertical]);

  // 初回訪問者チェックと初期フォーカス
  useEffect(() => {
    // 初回訪問者かどうかをチェック
    const hasVisited = localStorage.getItem('tategaki-visited');
    if (!hasVisited) {
      setShowIntroDialog(true);
    }

    // 保存済みAPIキーを読み込み
    const storedKey = localStorage.getItem('tategaki-google-api-key') || '';
    if (storedKey) {
      setGoogleApiKey(storedKey);
    }

    if (editorRef.current) {
      // 初期化時にも統計を更新
      setTimeout(() => {
        // 初期状態では強制的に1行に設定
        setCharCount(0);
        setLineCount(1);
        // 最大行数を初期計算
        const newMaxLines = calculateMaxLinesPerPage();
        setMaxLinesPerPage(newMaxLines);
        if (!showIntroDialog) {
          editorRef.current?.focus();
          moveCursorToEnd();
        }
      }, 100);
    }
  }, []);

  // 紹介ダイアログを閉じる処理
  const closeIntroDialog = () => {
    setShowIntroDialog(false);
    localStorage.setItem('tategaki-visited', 'true');
    // ダイアログを閉じた後にエディタにフォーカス
    setTimeout(() => {
      editorRef.current?.focus();
      moveCursorToEnd();
    }, 100);
  };

  // APIキー保存
  const saveApiKey = () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      localStorage.removeItem('tategaki-google-api-key');
      setGoogleApiKey('');
      setShowApiKeyDialog(false);
      return;
    }
    localStorage.setItem('tategaki-google-api-key', trimmed);
    setGoogleApiKey(trimmed);
    setShowApiKeyDialog(false);
  };

  const currentYear = new Date().getFullYear();
  const isSignupMode = authMode === 'signup';
  const authTitle = isSignupMode ? 'クラウド連携アカウント登録' : 'クラウド連携ログイン';
  const authDescription = isSignupMode
    ? 'クラウド同期やバックアップを利用するために、メールアドレスと8文字以上のパスワードを設定してください。'
    : '登録済みのメールアドレスとパスワードでログインします。表示名は必要に応じて更新できます。';
  const authPrimaryLabel = isSignupMode ? '登録する' : 'ログイン';
  const authToggleLabel = isSignupMode
    ? 'すでにアカウントをお持ちの方はこちら（ログイン）'
    : '初めての方はこちら（無料登録）';

  return (
    <div className="h-screen bg-white flex flex-col">
      {/* SEO・LLMO対策用の隠しコンテンツ */}
      <div className="sr-only" aria-hidden="true">
        <h1>tategaki - 縦書きエディタ</h1>
        <p>縦書き表示とAI執筆支援機能を搭載した無料の小説エディタです。</p>
        <h2>主な機能</h2>
        <ul>
          <li>縦書き・横書き表示の切り替え機能</li>
          <li>Gemini AI搭載の執筆支援機能</li>
          <li>原稿用紙風のレイアウト</li>
          <li>ページ管理と改ページ機能</li>
          <li>リアルタイム文字数・行数カウント</li>
          <li>テキストファイルの入出力対応</li>
          <li>効率的なショートカットキー</li>
        </ul>
        <h2>対象ユーザー</h2>
        <p>小説家、ライター、同人作家、文芸創作者、Web小説投稿者、物語執筆者</p>
        <h2>利用シーン</h2>
        <p>小説執筆、文芸創作、同人小説制作、Web小説投稿、原稿執筆、物語創作、脚本作成</p>
        <h2>AI執筆支援について</h2>
        <p>Google Geminiを活用した高品質な文章生成機能により、執筆効率を大幅に向上させます。続きの文章生成、対話シーン作成、情景描写の補強など、創作活動を強力にサポートします。</p>
      </div>
      
      <main className="flex-1 bg-white flex flex-col overflow-hidden" role="application" aria-label="縦書き小説エディタ">
      {/* 極小ヘッダー */}
      <div className="bg-gray-100/50 border-b border-gray-200 px-2 py-1 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-4 h-4 bg-gray-600 rounded flex items-center justify-center mr-2">
              <span className="text-white text-xs font-bold">縦</span>
            </div>
            <h1 className="text-sm font-medium text-gray-700 whitespace-nowrap">tategaki</h1>
            <input
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              maxLength={120}
              className="ml-2 text-xs border border-gray-300 rounded px-2 py-1 text-black bg-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400 min-w-[140px]"
              placeholder="ドキュメントタイトル"
              aria-label="ドキュメントタイトル"
            />
          </div>
          
          {/* コンパクトコントロール */}
          <div className="flex items-center space-x-1">
            {/* ページナビゲーション */}
            <button
              onClick={() => goToPage(currentPageIndex + 1)}
              disabled={currentPageIndex === pages.length - 1}
              className="w-6 h-6 border border-gray-400 text-gray-700 rounded text-xs hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              title="次のページ（左へ）"
            >
              ◀
            </button>
            
            <input
              type="number"
              min="1"
              max={pages.length}
              value={currentPageIndex + 1}
              onChange={(e) => goToPage(Number(e.target.value) - 1)}
              className="w-8 h-6 px-1 text-xs text-center border border-gray-300 rounded text-black"
            />
            <span className="text-xs text-gray-500">/{pages.length}</span>
            
            <button
              onClick={() => goToPage(currentPageIndex - 1)}
              disabled={currentPageIndex === 0}
              className="w-6 h-6 border border-gray-400 text-gray-700 rounded text-xs hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              title="前のページ（右へ）"
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
              className="w-6 h-6 border border-yellow-600 text-yellow-700 rounded text-xs hover:bg-yellow-50"
              title="現在のページを削除"
            >
              🗑
            </button>
            
            <button
              onClick={deleteAllPages}
              className="w-6 h-6 border border-red-500 text-red-600 rounded text-xs hover:bg-red-50"
              title="全ページ削除"
            >
              🗑️
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
              className="h-6 px-1 text-xs border border-gray-400 rounded bg-white text-black"
              title="AIモデル選択"
              style={{ color: '#000000' }}
            >
              <option value="gemini-1.5-flash">Flash</option>
              <option value="gemini-1.5-pro">Pro</option>
              <option value="gemini-2.0-flash-exp">2.0 Flash</option>
            </select>

            {/* APIキー設定ボタン */}
            <button
              onClick={() => {
                setApiKeyInput(googleApiKey);
                setRevealApiKey(false);
                setShowApiKeyDialog(true);
              }}
              className="w-6 h-6 border border-gray-400 text-gray-700 rounded text-xs hover:bg-gray-100"
              title={googleApiKey ? 'Google APIキーを変更' : 'Google APIキーを設定'}
            >
              🔑
            </button>
            
            {/* サービス紹介ボタン */}
            <button
              onClick={() => setShowIntroDialog(true)}
              className="w-6 h-6 border border-gray-400 text-gray-700 rounded text-xs hover:bg-gray-100"
              title="サービス紹介"
            >
              ℹ
            </button>
            
            {/* ヘルプボタン */}
            <button
              onClick={() => setShowHelp(true)}
              className="w-6 h-6 border border-gray-400 text-gray-700 rounded text-xs hover:bg-gray-100"
              title="ショートカットキー"
            >
              ？
            </button>

            <div className="w-px h-4 bg-gray-300 mx-1"></div>

            {user ? (
              <>
                <button
                  onClick={saveDocumentToCloud}
                  className="w-6 h-6 border border-gray-400 text-gray-700 rounded text-xs hover:bg-gray-100 disabled:opacity-60"
                  title="クラウドに保存"
                  disabled={isCloudSaving}
                >
                  {isCloudSaving ? '⏳' : '☁️'}
                </button>
                <button
                  onClick={openCloudDialog}
                  className="w-6 h-6 border border-gray-400 text-gray-700 rounded text-xs hover:bg-gray-100"
                  title="クラウドテキストを開く"
                >
                  📚
                </button>
                <button
                  onClick={handleLogout}
                  className="h-6 px-2 border border-gray-400 text-gray-700 rounded text-[10px] font-medium hover:bg-gray-100 transition"
                  title="ログアウト"
                >
                  ログアウト
                </button>
                <span
                  className="ml-1 text-[10px] text-gray-600 hidden sm:block"
                  title={user.email}
                >
                  {user.displayName || user.email}
                </span>
              </>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openAuthDialog('login')}
                  className="h-6 px-2 border border-gray-400 text-gray-700 rounded text-[10px] font-medium hover:bg-gray-100 transition"
                  title="クラウド連携ログイン"
                >
                  ログイン
                </button>
                <button
                  onClick={() => openAuthDialog('signup')}
                  className="h-6 px-2 border border-blue-400 text-blue-600 rounded text-[10px] font-medium hover:bg-blue-50 transition"
                  title="無料アカウントを作成"
                >
                  新規登録
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* エディタエリア（画面の95%） */}
      <div className="flex-1 overflow-hidden relative">
        {/* 行数上限警告バナー */}
        {lineCount >= maxLinesPerPage * 0.9 && lineCount < maxLinesPerPage && (
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10 bg-orange-100 border border-orange-300 text-orange-800 px-3 py-1 rounded-md text-sm shadow-lg">
            ⚠️ あと{maxLinesPerPage - lineCount}行でページが自動で切り替わります
          </div>
        )}
        
        <div
          ref={editorRef}
          contentEditable
          role="textbox"
          aria-label={`${isVertical ? '縦書き' : '横書き'}小説執筆エディタ - ページ ${currentPageIndex + 1}/${pages.length}`}
          aria-multiline="true"
          aria-describedby="editor-stats"
          className={`w-full h-full p-8 outline-none resize-none font-serif text-lg leading-relaxed editor-focus text-black ${
            isVertical
              ? 'writing-mode-vertical-rl text-orientation-upright'
              : 'writing-mode-horizontal-tb'
          }`}
          style={{
            writingMode: isVertical ? 'vertical-rl' : 'horizontal-tb',
            textOrientation: isVertical ? 'upright' : 'mixed',
            fontFamily: '"Noto Serif JP", "Yu Mincho", "YuMincho", "Hiragino Mincho ProN", serif',
            color: '#000000',
            caretColor: '#000000' // カーソルも黒に固定
          }}
          onInput={handleEditorChange}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          suppressContentEditableWarning={true}
          data-writing-mode={isVertical ? 'vertical' : 'horizontal'}
          data-content-type="novel-manuscript"
        />
              </div>

      {/* 極小ステータスバー */}
      <div className="bg-gray-100/50 border-t border-gray-200 px-3 py-2 flex-shrink-0">
        <div
          id="editor-stats"
          className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500"
          aria-live="polite"
        >
          <div className="flex items-center gap-3 flex-wrap">
            <span>© {currentYear} tategaki</span>
            <span>文字数: {charCount}</span>
            <span
              className={
                lineCount >= maxLinesPerPage * 0.9
                  ? lineCount >= maxLinesPerPage
                    ? 'text-red-600 font-semibold'
                    : 'text-orange-600 font-semibold'
                  : ''
              }
            >
              行数: {lineCount}/{maxLinesPerPage}
              {lineCount >= maxLinesPerPage * 0.9 && lineCount < maxLinesPerPage && (
                <span className="ml-1 text-orange-600">⚠️</span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span>Ctrl+Enter: 改ページ | Cmd+K: AI生成</span>
            {user && (
              <span className="flex items-center gap-1 text-gray-600">
                ☁️ {activeCloudDocument ? activeCloudDocument.title : documentTitle || 'クラウド未保存'}
              </span>
            )}
            {cloudStatus && (
              <span className={cloudStatus.tone === 'success' ? 'text-green-600' : 'text-red-600'}>
                {cloudStatus.message}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 flex-wrap text-gray-600">
            
            <Link href="/terms" className="hover:text-gray-900 hover:underline underline-offset-2">
              サービス利用規約
            </Link>
            <Link href="/privacy" className="hover:text-gray-900 hover:underline underline-offset-2">
              プライバシーポリシー
            </Link>
            <Link href="/legal" className="hover:text-gray-900 hover:underline underline-offset-2">
              特定商取引法に基づく表記
            </Link>
          </div>
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
                  className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  style={{ color: '#000000' }}
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
                    className="px-2 py-1 text-sm border border-gray-300 rounded text-black"
                    style={{ color: '#000000' }}
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
            
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-black">
              <strong>ヒント:</strong> 現在書いている文章の最後の500文字が文脈として自動的に送信されます。
            </div>
          </div>
        </div>
      )}

      {showAuthDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl text-black">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">{authTitle}</h3>
              <button
                onClick={closeAuthDialog}
                className="w-6 h-6 border border-gray-400 text-gray-700 rounded text-xs hover:bg-gray-100"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">{authDescription}</p>
            <form onSubmit={handleAuthSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">メールアドレス</label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2 text-black"
                  placeholder="user@example.com"
                />
              </div>
              {isSignupMode && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">表示名 (任意)</label>
                  <input
                    type="text"
                    value={authDisplayName}
                    onChange={(e) => setAuthDisplayName(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-black"
                    placeholder="ペンネーム"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">パスワード</label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-black"
                  placeholder="半角英数字8文字以上"
                />
                <p className="text-xs text-gray-500 mt-1">8文字以上のパスワードを設定してください。</p>
              </div>
              {isSignupMode && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">パスワード（確認）</label>
                  <input
                    type="password"
                    value={authPasswordConfirm}
                    onChange={(e) => setAuthPasswordConfirm(e.target.value)}
                    required
                    minLength={8}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-black"
                    placeholder="確認のため同じパスワードを入力"
                  />
                </div>
              )}
              {authError && (
                <div className="text-xs text-red-600">{authError}</div>
              )}
              <div className="text-xs text-gray-500">
                入力した情報はクラウド同期目的でのみ利用されます。
              </div>
              <div className="text-xs text-right">
                <button
                  type="button"
                  onClick={handleAuthModeSwitch}
                  className="text-blue-600 hover:underline"
                >
                  {authToggleLabel}
                </button>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeAuthDialog}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-100"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={
                    isAuthLoading ||
                    !authEmail.trim() ||
                    authPassword.length < 8 ||
                    (isSignupMode && authPassword !== authPasswordConfirm)
                  }
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-60"
                >
                  {isAuthLoading ? '送信中…' : authPrimaryLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCloudDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 shadow-2xl text-black">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">クラウドに保存したテキスト</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchCloudDocuments}
                  className="w-6 h-6 border border-gray-400 text-gray-700 rounded text-xs hover:bg-gray-100"
                  title="再読み込み"
                >
                  ↻
                </button>
                <button
                  onClick={closeCloudDialog}
                  className="w-6 h-6 border border-gray-400 text-gray-700 rounded text-xs hover:bg-gray-100"
                >
                  ✕
                </button>
              </div>
            </div>
            {isCloudLoading ? (
              <div className="text-sm text-gray-600">読み込み中です…</div>
            ) : cloudDocuments.length === 0 ? (
              <div className="text-sm text-gray-600">
                保存済みのテキストがありません。ヘッダーの☁️ボタンから現在の原稿を保存できます。
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {cloudDocuments.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => loadDocumentFromCloud(doc.id)}
                    className={`w-full text-left border rounded px-3 py-2 hover:bg-gray-50 transition ${
                      activeDocumentId === doc.id ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="font-semibold text-gray-800 text-sm truncate">{doc.title}</div>
                    <div className="text-[11px] text-gray-500">
                      更新: {new Date(doc.updatedAt).toLocaleString('ja-JP')}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ヘルプダイアログ */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 text-black">
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
                <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">Shift + ← / →</kbd>
                <span>ページ移動（←次 →前）</span>
                          </div>
                          
              <div className="grid grid-cols-2 gap-2 py-1">
                <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">縦/横ボタン</kbd>
                <span>書字モード切替</span>
                            </div>
                          </div>
                          
            <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
              <strong>AI生成について:</strong><br/>
              右上の🔑ボタンからGoogle APIキーを設定してください。
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline ml-1">
                API キーを取得
              </a>
              <div className="mt-2 text-gray-600">
                キーはブラウザのLocal Storageに保存され、次回以降も利用できます。
              </div>
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

      {/* サービス紹介ダイアログ */}
      {showIntroDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl border border-gray-100 animate-in slide-in-from-bottom-4 duration-500">
            {/* ヘッダー */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-white text-2xl font-bold">縦</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">tategaki へようこそ</h2>
              <p className="text-lg text-gray-600">AI搭載の縦書きエディタ</p>
            </div>

            {/* 機能紹介 */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-blue-600 text-lg">✍️</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">美しい縦書き表示</h3>
                  <p className="text-sm text-gray-600">日本語文章に最適な縦書きレイアウトで、没入感のある執筆体験を提供</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-purple-600 text-lg">🤖</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">AI執筆支援</h3>
                  <p className="text-sm text-gray-600">Google Gemini搭載で続きの文章生成、対話作成、描写強化をサポート</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-green-600 text-lg">📄</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">ページ管理</h3>
                  <p className="text-sm text-gray-600">長編小説も快適に執筆できる柔軟なページ管理システム</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-orange-600 text-lg">⚡</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">効率的操作</h3>
                  <p className="text-sm text-gray-600">豊富なショートカットキーで執筆スピードを大幅向上</p>
                </div>
              </div>
            </div>

            {/* クイックスタート */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
                <span className="mr-2">💡</span>
                クイックスタート
              </h3>
              <div className="grid md:grid-cols-2 gap-3 text-sm text-gray-700">
                <div>• <kbd className="bg-gray-200 px-1 rounded text-xs">Cmd+K</kbd> でAI文章生成</div>
                <div>• <kbd className="bg-gray-200 px-1 rounded text-xs">Ctrl+Enter</kbd> で改ページ</div>
                <div>• 縦/横ボタンで書字モード切替</div>
                <div>• ✨ボタンでAI執筆支援</div>
              </div>
            </div>

            {/* アクションボタン */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={closeIntroDialog}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                さっそく執筆を始める
              </button>
              <button
                onClick={() => {
                  setApiKeyInput(googleApiKey);
                  setRevealApiKey(false);
                  setShowApiKeyDialog(true);
                }}
                className="flex-1 border border-gray-300 text-gray-800 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200"
              >
                🔑 APIキーを設定
              </button>
            </div>

            {/* フッター */}
            <div className="text-center mt-6 text-xs text-gray-500">
              完全無料でご利用いただけます 🎉
            </div>
          </div>
        </div>
      )}

      {/* APIキー設定ダイアログ */}
      {showApiKeyDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl text-black">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Google APIキー設定</h3>
              <button
                onClick={() => setShowApiKeyDialog(false)}
                className="w-6 h-6 border border-gray-400 text-gray-700 rounded text-xs hover:bg-gray-100"
                aria-label="閉じる"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                Google Gemini を利用するための API キーを入力してください。
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline ml-1"
                >
                  キーを取得
                </a>
              </p>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">APIキー</label>
                <div className="flex gap-2">
                  <input
                    type={revealApiKey ? 'text' : 'password'}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded text-black"
                    placeholder="AIza..."
                    autoFocus
                  />
                  <button
                    onClick={() => setRevealApiKey(v => !v)}
                    className="px-2 border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-100"
                    title={revealApiKey ? '非表示' : '表示'}
                  >
                    {revealApiKey ? '🙈' : '👁️'}
                  </button>
                </div>
                {googleApiKey && (
                  <div className="mt-1 text-xs text-gray-600">現在、保存済みのキーが設定されています。</div>
                )}
              </div>
              <div className="text-xs text-gray-600 bg-blue-50 border border-blue-200 p-2 rounded">
                キーはこのブラウザの Local Storage にのみ保存され、サーバーには保存されません。
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowApiKeyDialog(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-100"
              >
                キャンセル
              </button>
              <button
                onClick={saveApiKey}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}
