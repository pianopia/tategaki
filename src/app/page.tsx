'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiEye, FiSettings, FiTrash, FiTrash2 } from 'react-icons/fi';

import ContinuousScrollEditor from '@/components/ContinuousScrollEditor';
import { JumpToLineDialog } from '@/components/JumpToLineDialog';
import { PreferencesDialog } from '@/components/PreferencesDialog';

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
const DEFAULT_MAX_LINES_PER_PAGE = 40;
const DEFAULT_REVISION_INTERVAL_MINUTES = 10;
const DEFAULT_EDITOR_MODE: 'paged' | 'continuous' = 'paged';
const CONTINUOUS_BREAK_MARK = '<div data-tategaki-break="true"></div>';
const FONT_PRESETS = {
  classic: {
    label: '明朝体',
    stack: '"Noto Serif JP", "Yu Mincho", "YuMincho", "Hiragino Mincho ProN", "MS Mincho", serif',
  },
  modern: {
    label: 'ゴシック体',
    stack: '"Hiragino Sans", "Yu Gothic", "YuGothic", "Noto Sans JP", "Meiryo", sans-serif',
  },
  neutral: {
    label: 'ヒューマン系',
    stack: '"Noto Sans", "Source Han Sans", "Segoe UI", "Helvetica Neue", sans-serif',
  },
  mono: {
    label: '等幅',
    stack: '"IBM Plex Mono", "Source Code Pro", "Consolas", "SFMono-Regular", monospace',
  },
} as const;
type FontPresetKey = keyof typeof FONT_PRESETS;

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

const htmlContentToPlainText = (html: string) => {
  if (typeof document === 'undefined') return html.replace(/\n/g, '');
  const container = document.createElement('div');
  container.innerHTML = html || '';
  const text = container.textContent || container.innerText || '';
  return text.replace(/\n/g, '');
};

const computeTotalChars = (pagesData: Page[]) =>
  pagesData.reduce((sum, page) => sum + htmlContentToPlainText(page.content || '').length, 0);

const joinPagesForContinuous = (pagesData: Page[]) =>
  pagesData
    .map((page) => page.content || '')
    .filter((content, index, array) => !(index === array.length - 1 && !content))
    .join(CONTINUOUS_BREAK_MARK);

const splitContinuousHtml = (html: string) => {
  if (!html) return [''];
  return html.split(CONTINUOUS_BREAK_MARK);
};

type RevisionEntry = {
  id: string;
  title: string;
  createdAt: number;
  content: string;
  pages: Page[];
};

const normalizePagesPayload = (pagesPayload: unknown, fallbackContent?: string): Page[] => {
  if (Array.isArray(pagesPayload) && pagesPayload.length > 0) {
    return pagesPayload.map((page: any, index: number) => ({
      id: typeof page?.id === 'string' ? page.id : String(index + 1),
      content: typeof page?.content === 'string' ? page.content : '',
    }));
  }

  const safeContent = typeof fallbackContent === 'string' ? fallbackContent : '';
  return [
    {
      id: '1',
      content: safeContent ? safeContent.replace(/\n/g, '<br>') : '',
    },
  ];
};

const formatRevisionTimestamp = (timestamp: number) => {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
};

export default function TategakiEditor() {
  const [pages, setPages] = useState<Page[]>([{ id: '1', content: '' }]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isVertical, setIsVertical] = useState(true);
  const [charCount, setCharCount] = useState(0);
  const [lineCount, setLineCount] = useState(1);
  const [maxLinesPerPage, setMaxLinesPerPage] = useState(DEFAULT_MAX_LINES_PER_PAGE); // 原稿用紙の基本行数
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
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(false);
  const [autoSaveSignal, setAutoSaveSignal] = useState(0);
  const [editorFontKey, setEditorFontKey] = useState<FontPresetKey>('classic');
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [settingsFontDraft, setSettingsFontDraft] = useState<FontPresetKey>('classic');
  const [settingsMaxLinesDraft, setSettingsMaxLinesDraft] = useState(DEFAULT_MAX_LINES_PER_PAGE);
  const [revisionIntervalMinutes, setRevisionIntervalMinutes] = useState(DEFAULT_REVISION_INTERVAL_MINUTES);
  const [settingsRevisionIntervalDraft, setSettingsRevisionIntervalDraft] = useState(
    DEFAULT_REVISION_INTERVAL_MINUTES
  );
  const [isComposingTitle, setIsComposingTitle] = useState(false);
  const [editorMode, setEditorMode] = useState<'paged' | 'continuous'>(DEFAULT_EDITOR_MODE);
  const [continuousHtml, setContinuousHtml] = useState('');
  const [revisionTimeline, setRevisionTimeline] = useState<RevisionEntry[]>([]);
  const [revisionSliderIndex, setRevisionSliderIndex] = useState(0);
  const [isRevisionTimelineLoading, setIsRevisionTimelineLoading] = useState(false);
  const [documentTitle, setDocumentTitle] = useState(DEFAULT_DOCUMENT_TITLE);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  const [previewDocument, setPreviewDocument] = useState<{
    title: string;
    content: string;
    updatedAt: number;
  } | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewingDocumentId, setPreviewingDocumentId] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveDocumentToCloudRef = useRef<(() => Promise<void>) | null>(null);
  const lastRevisionSavedAtRef = useRef<number | null>(null);
  const suppressAutoSaveRef = useRef(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showPreferencesDialog, setShowPreferencesDialog] = useState(false);
  const [editorTheme, setEditorTheme] = useState<'light' | 'dark' | 'custom'>('light');
  const [editorBackgroundColor, setEditorBackgroundColor] = useState('#FFFFFF');
  const [editorTextColor, setEditorTextColor] = useState('#000000');
  const [editorKeybindings, setEditorKeybindings] = useState<Record<string, string>>({});
  const [showJumpDialog, setShowJumpDialog] = useState(false);
  const activeCloudDocument = useMemo(() => {
    if (!activeDocumentId) return null;
    return cloudDocuments.find(doc => doc.id === activeDocumentId) ?? null;
  }, [activeDocumentId, cloudDocuments]);

  // 現在のページを取得
  const currentPage = pages[currentPageIndex];
  const editorFontFamily = FONT_PRESETS[editorFontKey]?.stack ?? FONT_PRESETS.classic.stack;
  const clampMaxLines = (value: number) => {
    if (Number.isNaN(value)) return DEFAULT_MAX_LINES_PER_PAGE;
    return Math.min(200, Math.max(10, Math.round(value)));
  };
  const clampRevisionInterval = (value: number) => {
    if (Number.isNaN(value)) return DEFAULT_REVISION_INTERVAL_MINUTES;
    return Math.min(120, Math.max(1, Math.round(value)));
  };


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

  // 実際のコンテンツ量を計算する関数（縦書き・横書き両対応）
  const calculateActualContentLines = () => {
    if (!editorRef.current) return 1;

    const element = editorRef.current;
    const positions: number[] = [];
    const tolerance = 1.5;

    const addPosition = (value: number) => {
      const rounded = Math.round(value * 10) / 10;
      const exists = positions.some((pos) => Math.abs(pos - rounded) < tolerance);
      if (!exists) {
        positions.push(rounded);
      }
    };

    const collectRectsFromRange = (range: Range) => {
      const rectList = range.getClientRects();
      for (let i = 0; i < rectList.length; i++) {
        const rect = rectList.item(i);
        if (!rect) continue;
        if (rect.width <= 0.2 || rect.height <= 0.2) continue;
        const position = isVertical ? rect.left : rect.top;
        addPosition(position);
      }
    };

    const textRange = document.createRange();
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let currentNode: Node | null;

    while ((currentNode = walker.nextNode())) {
      const content = currentNode.textContent;
      if (!content || !content.trim()) continue;
      try {
        textRange.selectNodeContents(currentNode);
        collectRectsFromRange(textRange);
      } catch (error) {
        console.warn('Range selection failed for node', error);
      }
    }

    element.querySelectorAll('br').forEach((br) => {
      const brRange = document.createRange();
      brRange.setStartBefore(br);
      brRange.setEndAfter(br);
      collectRectsFromRange(brRange);
    });

    if (positions.length > 0) {
      positions.sort((a, b) => (isVertical ? b - a : a - b));
      return positions.length;
    }

    // fallback: use previous estimation based on text metrics
    const plainText = element.innerText || '';
    if (isVertical) {
      const lines = plainText.split('\n');
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      const paddingTop = parseFloat(style.paddingTop) || 0;
      const paddingBottom = parseFloat(style.paddingBottom) || 0;
      const contentHeight = rect.height - paddingTop - paddingBottom;
      const fontSize = parseFloat(style.fontSize) || 18;
      const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.5;
      const maxCharsPerColumn = Math.max(1, Math.floor(contentHeight / lineHeight));

      const columnCount = lines.reduce((sum, line) => {
        const charCount = line.length;
        if (charCount === 0) {
          return sum + 1;
        }
        const requiredColumns = Math.ceil(charCount / maxCharsPerColumn);
        return sum + Math.max(1, requiredColumns);
      }, 0);

      return Math.max(1, columnCount);
    } else {
      const lines = plainText.split('\n');
      return Math.max(1, lines.length);
    }
  };

  // 指定行へジャンプする関数
  const handleJumpToLine = (targetLine: number) => {
    // 1-based index to 0-based calculation
    if (targetLine < 1) targetLine = 1;

    // ページモードの場合
    if (editorMode === 'paged') {
      if (!editorRef.current) return;
      const element = editorRef.current;

      // 現在のページ内での行位置を特定してカーソル移動
      // 簡易実装: 行数推定ロジックを再利用して、該当行の先頭ノードを探す

      // まずは単純に、行数オーバーしていたらページ送り...はせず、
      // 現在のページ内で完結する範囲で移動を試みる

      const positions: { pos: number; node: Node; offset: number }[] = [];
      const tolerance = 1.5;

      const addPosition = (value: number, node: Node, offset: number) => {
        const rounded = Math.round(value * 10) / 10;
        // 同じ行（位置）なら追加しない（最初の要素を優先）
        const exists = positions.some((p) => Math.abs(p.pos - rounded) < tolerance);
        if (!exists) {
          positions.push({ pos: rounded, node, offset });
        }
      };

      const collectRectsFromRange = (range: Range, node: Node, offset: number) => {
        const rectList = range.getClientRects();
        for (let i = 0; i < rectList.length; i++) {
          const rect = rectList.item(i);
          if (!rect) continue;
          if (rect.width <= 0.2 || rect.height <= 0.2) continue;
          const position = isVertical ? rect.left : rect.top;
          addPosition(position, node, offset);
        }
      };

      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      let currentNode: Node | null;

      while ((currentNode = walker.nextNode())) {
        const content = currentNode.textContent;
        if (!content || !content.trim()) continue;

        // 文字ごとに位置を確認するのは重いので、ある程度まとめて...
        // 正確性を期すなら1文字ずつだが、ここではノード単位で簡易チェック
        // 行ジャンプの精度を上げるため、テキストノード内の改行も考慮

        const textRange = document.createRange();
        textRange.selectNodeContents(currentNode);
        collectRectsFromRange(textRange, currentNode, 0);
      }

      // 位置でソート
      positions.sort((a, b) => (isVertical ? b.pos - a.pos : a.pos - b.pos));

      const targetIndex = Math.min(targetLine - 1, positions.length - 1);
      const target = positions[targetIndex];

      if (target) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.setStart(target.node, target.offset);
        range.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(range);

        // 該当要素が見えるようにスクロール（ページモードなら通常不要だが念のため）
        if (target.node.parentElement) {
          target.node.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }

    } else {
      // 連続スクロールモードの場合
      // ContinuousScrollEditor側で制御するのが理想だが、
      // ここでは簡易的に、行の高さ/幅を推定してスクロール位置を決定する

      // Note: ContinuousScrollEditorはiframeではなくdivで実装されているため、
      // DOMに直接アクセス可能であればそこから計算できる。
      // ただし、ContinuousScrollEditorコンポーネント内のDOM構造に依存する。

      // ContinuousScrollEditorの実装を見ると、editorRefは内部にあるため、
      // 親から直接アクセスするのは難しい。
      // したがって、ContinuousScrollEditorにrefを渡すか、
      // DOMクエリで要素を探す必要がある。

      const scrollEditor = document.querySelector('.overflow-x-auto .min-h-\\[70vh\\]');
      if (!scrollEditor) return;

      // 行位置を特定するためのロジック（Pageモードと同様）
      const positions: number[] = [];
      const tolerance = 5; // 許容誤差を少し広めに

      // テキストノードを走査して行位置を収集
      const walker = document.createTreeWalker(scrollEditor, NodeFilter.SHOW_TEXT);
      let currentNode: Node | null;
      const nodeMap = new Map<number, { node: Node; offset: number }>();

      while ((currentNode = walker.nextNode())) {
        const range = document.createRange();
        range.selectNodeContents(currentNode);
        const rects = range.getClientRects();

        for (let i = 0; i < rects.length; i++) {
          const rect = rects[i];
          const pos = isVertical ? rect.left : rect.top;
          const rounded = Math.round(pos);

          // 既存の行位置に近いかチェック
          const existingPos = positions.find(p => Math.abs(p - rounded) < tolerance);

          if (existingPos === undefined) {
            positions.push(rounded);
            nodeMap.set(rounded, { node: currentNode, offset: 0 });
          }
        }
      }

      // ソート
      positions.sort((a, b) => (isVertical ? b - a : a - b));

      // ターゲット行の座標を取得
      const targetPos = positions[Math.min(targetLine - 1, positions.length - 1)];

      if (targetPos !== undefined) {
        const targetNodeInfo = nodeMap.get(targetPos);

        // スクロールコンテナを取得
        const container = scrollEditor.parentElement?.parentElement;
        if (container) {
          if (isVertical) {
            // 縦書きの場合、右から左へスクロール。
            // scrollLeftは通常左端が0。
            // コンテナの幅 - ターゲット位置 + パディング調整
            // ただし、RTL的な挙動を考慮する必要がある。

            // scrollIntoViewを使うのが一番確実
            if (targetNodeInfo?.node.parentElement) {
              // テキストノード自体はElementではないのでparentElementを使うか、Rangeを使う
              const range = document.createRange();
              range.setStart(targetNodeInfo.node, targetNodeInfo.offset);
              const rect = range.getBoundingClientRect();

              // コンテナの相対位置を計算してスクロール
              // 簡易的にscrollIntoViewを使用
              const span = document.createElement('span');
              range.insertNode(span);
              span.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
              span.parentNode?.removeChild(span);
            }
          } else {
            // 横書き
            if (targetNodeInfo?.node.parentElement) {
              const range = document.createRange();
              range.setStart(targetNodeInfo.node, targetNodeInfo.offset);
              const span = document.createElement('span');
              range.insertNode(span);
              span.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
              span.parentNode?.removeChild(span);
            }
          }
        }

        // カーソル移動
        if (targetNodeInfo) {
          const selection = window.getSelection();
          const range = document.createRange();
          range.setStart(targetNodeInfo.node, targetNodeInfo.offset);
          range.collapse(true);
          selection?.removeAllRanges();
          selection?.addRange(range);
          // フォーカスを戻す
          (scrollEditor as HTMLElement).focus();
        }
      }
    }
  };


  // 自動ページ送り処理（画面上の実際の行数に合わせて動作）
  const handleAutoPageBreak = () => {
    if (editorMode !== 'paged') return;
    if (!editorRef.current || !currentPage) return;

    let actualLines = calculateActualContentLines();
    if (actualLines <= maxLinesPerPage) return;

    const editor = editorRef.current;
    const overflowContainer = document.createElement('div');

    const prependNode = (node: Node) => {
      overflowContainer.insertBefore(node, overflowContainer.firstChild);
    };

    const refreshLineCount = () => {
      actualLines = calculateActualContentLines();
    };

    const peelLastNode = () => {
      const target = editor.lastChild;
      if (!target) return false;

      if (target.nodeType === Node.TEXT_NODE) {
        const textNode = target as Text;
        let text = textNode.textContent || '';
        let removed = '';

        while (text.length > 0 && actualLines > maxLinesPerPage) {
          const char = text.slice(-1);
          text = text.slice(0, -1);
          textNode.textContent = text;
          removed = char + removed;
          refreshLineCount();
        }

        if (!text.length) {
          editor.removeChild(textNode);
        }

        if (removed) {
          prependNode(document.createTextNode(removed));
        }
        return true;
      }

      editor.removeChild(target);
      prependNode(target);
      refreshLineCount();
      return true;
    };

    let iterations = 0;
    const MAX_ITERATIONS = 10000;
    while (actualLines > maxLinesPerPage && iterations < MAX_ITERATIONS) {
      if (!peelLastNode()) break;
      iterations++;
    }

    const overflowHTML = overflowContainer.innerHTML;
    if (!overflowHTML) {
      return;
    }

    const updatedCurrentContent = editor.innerHTML;
    const newPages = [...pages];
    newPages[currentPageIndex] = {
      ...currentPage,
      content: updatedCurrentContent,
    };

    const newPage: Page = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      content: overflowHTML,
    };

    newPages.splice(currentPageIndex + 1, 0, newPage);
    setPages(newPages);
    setLineCount(actualLines);
  };

  const handlePageUnderflow = () => {
    if (editorMode !== 'paged') return;
    if (!editorRef.current) return;
    const nextPage = pages[currentPageIndex + 1];
    if (!nextPage) return;

    let actualLines = calculateActualContentLines();
    if (actualLines >= maxLinesPerPage) return;

    const editor = editorRef.current;
    const nextContainer = document.createElement('div');
    nextContainer.innerHTML = nextPage.content;
    const cursorPosition = saveCursorPosition();

    let moved = false;
    let iterations = 0;
    const MAX_PULL_ITERATIONS = 10000;

    while (actualLines < maxLinesPerPage && nextContainer.firstChild && iterations < MAX_PULL_ITERATIONS) {
      const node = nextContainer.firstChild as Node;
      nextContainer.removeChild(node);
      editor.appendChild(node);
      moved = true;
      actualLines = calculateActualContentLines();
      iterations++;
    }

    if (!moved) {
      if (cursorPosition) {
        restoreCursorPosition(cursorPosition);
      }
      return;
    }

    const updatedCurrentContent = editor.innerHTML;
    const updatedNextContent = nextContainer.innerHTML;

    setPages(prev => {
      const next = [...prev];
      next[currentPageIndex] = { ...next[currentPageIndex], content: updatedCurrentContent };
      if (updatedNextContent.trim()) {
        next[currentPageIndex + 1] = { ...next[currentPageIndex + 1], content: updatedNextContent };
      } else {
        next.splice(currentPageIndex + 1, 1);
      }
      return next;
    });

    setLineCount(actualLines);
    if (cursorPosition) {
      restoreCursorPosition(cursorPosition);
    }
  };

  // エディタの内容が変更されたときの処理
  const handleEditorChange = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      // 変更がない場合はページ配列を更新しない（無限再レンダを防止）
      let updatedPages = pages;
      if (content !== currentPage.content) {
        updatedPages = pages.map((page, index) =>
          index === currentPageIndex ? { ...page, content } : page
        );
        setPages(updatedPages);
      }

      // 純粋な文字数をカウント（改行文字は除く）
      const totalChars = (updatedPages || []).reduce(
        (sum, page) => sum + htmlContentToPlainText(page.content || '').length,
        0
      );
      setCharCount(totalChars);

      if (editorMode === 'paged') {
        // 実際の行数を計算
        const actualLines = calculateActualContentLines();
        setLineCount(actualLines);

        if (suppressAutoSaveRef.current) {
          suppressAutoSaveRef.current = false;
        } else if (isAutoSaveEnabled && user) {
          setAutoSaveSignal((signal) => signal + 1);
        }

        const shouldPullFromNext =
          actualLines < maxLinesPerPage && Boolean(pages[currentPageIndex + 1]?.content?.trim());

        // 自動ページ送りチェック
        setTimeout(() => {
          handleAutoPageBreak();
          if (shouldPullFromNext) {
            handlePageUnderflow();
          }
        }, 100); // DOM更新後に実行
      } else {
        suppressAutoSaveRef.current = false;
      }
    }
  };

  // ペースト時の処理
  const handlePaste = (e: React.ClipboardEvent) => {
    // デフォルトのペースト処理（スタイル付き）をキャンセル
    e.preventDefault();

    // プレーンテキストのみを取得
    const text = e.clipboardData.getData('text/plain');

    // カーソル位置にプレーンテキストを挿入
    // execCommand('insertText') はUndo履歴も保持されるため推奨される方法
    document.execCommand('insertText', false, text);

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

  // Default keybindings
  const DEFAULT_KEYBINDINGS: Record<string, string> = {
    addPage: 'Ctrl+Enter',
    aiPrompt: 'Cmd+K',
    jumpToLine: 'Ctrl+G',
    nextPage: 'Shift+ArrowLeft',
    prevPage: 'Shift+ArrowRight',
    delete: '',
    backspace: '',
    enter: '',
    moveUp: '',
    moveDown: '',
    moveLeft: '',
    moveRight: '',
  };

  // Helper function to check if pressed key matches a keybinding
  const matchesKeybinding = (e: React.KeyboardEvent, keybinding: string): boolean => {
    const parts = keybinding.split('+');
    const mainKey = parts[parts.length - 1];

    // Normalize the key for comparison
    let eventKey = e.key;
    if (eventKey.length === 1) {
      eventKey = eventKey.toUpperCase();
    }

    // Check main key
    const mainKeyMatches = eventKey === mainKey ||
      (mainKey === 'ArrowLeft' && eventKey === 'ArrowLeft') ||
      (mainKey === 'ArrowRight' && eventKey === 'ArrowRight');

    if (!mainKeyMatches) return false;

    // Check modifiers
    const hasCtrl = parts.includes('Ctrl');
    const hasCmd = parts.includes('Cmd');
    const hasAlt = parts.includes('Alt');
    const hasShift = parts.includes('Shift');

    return e.ctrlKey === hasCtrl &&
      e.metaKey === hasCmd &&
      e.altKey === hasAlt &&
      e.shiftKey === hasShift;
  };

  // キーボードショートカット
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Get active keybindings (user configured or defaults)
    const activeKeybindings = {
      addPage: editorKeybindings.addPage || DEFAULT_KEYBINDINGS.addPage,
      aiPrompt: editorKeybindings.aiPrompt || DEFAULT_KEYBINDINGS.aiPrompt,
      jumpToLine: editorKeybindings.jumpToLine || DEFAULT_KEYBINDINGS.jumpToLine,
      nextPage: editorKeybindings.nextPage || DEFAULT_KEYBINDINGS.nextPage,
      prevPage: editorKeybindings.prevPage || DEFAULT_KEYBINDINGS.prevPage,
      delete: editorKeybindings.delete || DEFAULT_KEYBINDINGS.delete,
      backspace: editorKeybindings.backspace || DEFAULT_KEYBINDINGS.backspace,
      enter: editorKeybindings.enter || DEFAULT_KEYBINDINGS.enter,
      moveUp: editorKeybindings.moveUp || DEFAULT_KEYBINDINGS.moveUp,
      moveDown: editorKeybindings.moveDown || DEFAULT_KEYBINDINGS.moveDown,
      moveLeft: editorKeybindings.moveLeft || DEFAULT_KEYBINDINGS.moveLeft,
      moveRight: editorKeybindings.moveRight || DEFAULT_KEYBINDINGS.moveRight,
    };

    if (editorMode === 'paged' && matchesKeybinding(e, activeKeybindings.addPage)) {
      e.preventDefault();
      addNewPage();
    } else if (matchesKeybinding(e, activeKeybindings.aiPrompt)) {
      e.preventDefault();
      openPromptDialog();
    } else if (matchesKeybinding(e, activeKeybindings.jumpToLine)) {
      e.preventDefault();
      setShowJumpDialog(true);
    } else if (editorMode === 'paged' && matchesKeybinding(e, activeKeybindings.nextPage)) {
      e.preventDefault();
      goToPage(currentPageIndex + 1); // 左矢印で次のページへ（縦書きでは左が進む方向）
    } else if (editorMode === 'paged' && matchesKeybinding(e, activeKeybindings.prevPage)) {
      e.preventDefault();
      goToPage(currentPageIndex - 1); // 右矢印で前のページへ（縦書きでは右が戻る方向）
    } else if (matchesKeybinding(e, activeKeybindings.delete)) {
      e.preventDefault();
      document.execCommand('forwardDelete');
    } else if (matchesKeybinding(e, activeKeybindings.backspace)) {
      e.preventDefault();
      document.execCommand('delete');
    } else if (matchesKeybinding(e, activeKeybindings.enter)) {
      e.preventDefault();
      document.execCommand('insertParagraph');
    } else if (matchesKeybinding(e, activeKeybindings.moveUp)) {
      e.preventDefault();
      const selection = window.getSelection();
      if (selection) selection.modify('move', 'backward', 'line');
    } else if (matchesKeybinding(e, activeKeybindings.moveDown)) {
      e.preventDefault();
      const selection = window.getSelection();
      if (selection) selection.modify('move', 'forward', 'line');
    } else if (matchesKeybinding(e, activeKeybindings.moveLeft)) {
      e.preventDefault();
      const selection = window.getSelection();
      if (selection) selection.modify('move', 'backward', 'character');
    } else if (matchesKeybinding(e, activeKeybindings.moveRight)) {
      e.preventDefault();
      const selection = window.getSelection();
      if (selection) selection.modify('move', 'forward', 'character');
    }
  };

  // 新しいページを追加
  const generatePageId = () =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const addNewPage = () => {
    const newPage: Page = {
      id: generatePageId(),
      content: ''
    };
    setPages(prev => {
      const next = [...prev];
      next.splice(currentPageIndex + 1, 0, newPage);
      return next;
    });
    setCurrentPageIndex(currentPageIndex + 1);
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
      suppressAutoSaveRef.current = true;
      setPages([{ id: '1', content: '' }]);
      setCurrentPageIndex(0);
      setActiveDocumentId(null);
      setDocumentTitle(DEFAULT_DOCUMENT_TITLE);
      setRevisionTimeline([]);
      setRevisionSliderIndex(0);
      lastRevisionSavedAtRef.current = null;
      // 削除後にフォーカスを戻す
      setTimeout(() => {
        editorRef.current?.focus();
        moveCursorToEnd();
      }, 50);
    }
  };

  // ファイルをインポート
  const finishTitleEditing = () => {
    const normalizedTitle = documentTitle.trim();
    setDocumentTitle(normalizedTitle || DEFAULT_DOCUMENT_TITLE);
    setIsEditingTitle(false);
  };

  const closePreviewDialog = () => {
    setPreviewDocument(null);
  };

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

        suppressAutoSaveRef.current = true;
        setPages(newPages);
        setCurrentPageIndex(0);
        setActiveDocumentId(null);
        setRevisionTimeline([]);
        setRevisionSliderIndex(0);
        lastRevisionSavedAtRef.current = null;
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

  const handleCreateNewDocument = () => {
    if (!confirm('編集中の内容をクリアして新規ドキュメントを開始しますか？')) {
      return;
    }
    suppressAutoSaveRef.current = true;
    setPages([{ id: '1', content: '' }]);
    setCurrentPageIndex(0);
    setActiveDocumentId(null);
    setDocumentTitle(DEFAULT_DOCUMENT_TITLE);
    setRevisionTimeline([]);
    setRevisionSliderIndex(0);
    lastRevisionSavedAtRef.current = null;
    setTimeout(() => {
      editorRef.current?.focus();
      moveCursorToEnd();
    }, 100);
  };

  const handleEditorModeChange = (mode: 'paged' | 'continuous') => {
    if (mode === editorMode) return;
    if (mode === 'continuous') {
      const combined = joinPagesForContinuous(pages);
      setContinuousHtml(combined);
      setLineCount(0);
    } else {
      const sourceHtml = continuousHtml || joinPagesForContinuous(pages);
      const segments = splitContinuousHtml(sourceHtml);
      const nextPages =
        segments.length > 0
          ? segments.map((content, index) => ({
            id: pages[index]?.id ?? generatePageId(),
            content,
          }))
          : [{ id: generatePageId(), content: '' }];
      setPages(nextPages);
      setCurrentPageIndex(0);
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.innerHTML = nextPages[0]?.content || '';
          handleEditorChange();
        }
      }, 50);
    }
    setEditorMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tategaki-editor-mode', mode);
    }
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

  const fetchDocumentRevisions = useCallback(
    async (documentId: string) => {
      if (!user || !documentId) return;
      setIsRevisionTimelineLoading(true);
      try {
        const response = await fetch(`/api/cloud/documents/${documentId}/revisions`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || 'リビジョンの取得に失敗しました');
        }

        const timeline: RevisionEntry[] = Array.isArray(data.revisions)
          ? data.revisions.map((rev: any) => ({
            id:
              typeof rev.id === 'string' && rev.id.length > 0
                ? rev.id
                : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            title: typeof rev.title === 'string' && rev.title.length > 0 ? rev.title : DEFAULT_DOCUMENT_TITLE,
            createdAt: typeof rev.createdAt === 'number' ? rev.createdAt : Date.now(),
            content: typeof rev.content === 'string' ? rev.content : '',
            pages: normalizePagesPayload(rev.pages, typeof rev.content === 'string' ? rev.content : ''),
          }))
          : [];

        timeline.sort((a, b) => a.createdAt - b.createdAt);
        setRevisionTimeline(timeline);
        setRevisionSliderIndex(timeline.length > 0 ? timeline.length - 1 : 0);
        lastRevisionSavedAtRef.current = timeline.length > 0 ? timeline[timeline.length - 1].createdAt : null;
      } catch (error) {
        console.error('Revisions fetch error', error);
      } finally {
        setIsRevisionTimelineLoading(false);
      }
    },
    [user]
  );

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
      setRevisionTimeline([]);
      setRevisionSliderIndex(0);
      lastRevisionSavedAtRef.current = null;
      setCloudStatus({ message: 'ログアウトしました', tone: 'success' });
    }
  };

  const persistAutoSavePreference = (enabled: boolean) => {
    if (typeof window === 'undefined') return;
    if (enabled) {
      localStorage.setItem('tategaki-auto-save', 'true');
    } else {
      localStorage.removeItem('tategaki-auto-save');
    }
  };

  const handleAutoSaveToggle = () => {
    if (!user) {
      openAuthDialog('login');
      return;
    }
    setIsAutoSaveEnabled((prev) => {
      const next = !prev;
      persistAutoSavePreference(next);
      return next;
    });
  };

  const openSettingsDialog = () => {
    setShowPreferencesDialog(true);
  };

  const closeSettingsDialog = () => {
    setShowPreferencesDialog(false);
  };

  const handlePreferencesChange = (prefs: {
    theme: 'light' | 'dark' | 'custom';
    backgroundColor: string;
    textColor: string;
    fontPreset: 'classic' | 'modern' | 'neutral' | 'mono';
    maxLinesPerPage: number;
    editorMode: 'paged' | 'continuous';
    autoSave: boolean;
    revisionIntervalMinutes: number;
    keybindings: Record<string, string>;
  }) => {
    console.log('Applying preferences:', prefs);
    setEditorTheme(prefs.theme);
    setEditorBackgroundColor(prefs.backgroundColor);
    setEditorTextColor(prefs.textColor);
    setEditorFontKey(prefs.fontPreset);
    setSettingsFontDraft(prefs.fontPreset);
    setMaxLinesPerPage(prefs.maxLinesPerPage);
    setSettingsMaxLinesDraft(prefs.maxLinesPerPage);
    setEditorMode(prefs.editorMode);
    setIsAutoSaveEnabled(prefs.autoSave);
    setRevisionIntervalMinutes(prefs.revisionIntervalMinutes);
    setSettingsRevisionIntervalDraft(prefs.revisionIntervalMinutes);
    setEditorKeybindings(prefs.keybindings);

    // Also update localStorage for non-logged-in users
    if (typeof window !== 'undefined' && !user) {
      localStorage.setItem('tategaki-font', prefs.fontPreset);
      localStorage.setItem('tategaki-max-lines', String(prefs.maxLinesPerPage));
      localStorage.setItem('tategaki-revision-interval', String(prefs.revisionIntervalMinutes));
      localStorage.setItem('tategaki-auto-save', String(prefs.autoSave));
      localStorage.setItem('tategaki-editor-mode', prefs.editorMode);
    }
  };

  const applyRevisionToEditor = (revision: RevisionEntry, options?: { silent?: boolean }) => {
    if (!revision) return;
    suppressAutoSaveRef.current = true;
    const nextPages =
      revision.pages.length > 0
        ? revision.pages.map((page) => ({ ...page }))
        : normalizePagesPayload(undefined, revision.content);
    setPages(nextPages.length > 0 ? nextPages : [{ id: '1', content: '' }]);
    setCurrentPageIndex(0);
    setDocumentTitle(revision.title || DEFAULT_DOCUMENT_TITLE);
    if (!options?.silent) {
      setCloudStatus({
        message: `${formatRevisionTimestamp(revision.createdAt)} のリビジョンを読み込みました`,
        tone: 'success',
      });
    }
    setTimeout(() => {
      editorRef.current?.focus();
      moveCursorToEnd();
    }, 50);
  };

  const handleRevisionSliderChange = (index: number) => {
    if (!revisionTimeline.length) return;
    const clamped = Math.min(Math.max(Number(index), 0), revisionTimeline.length - 1);
    setRevisionSliderIndex(clamped);
    const revision = revisionTimeline[clamped];
    if (revision) {
      applyRevisionToEditor(revision);
    }
  };

  const handleContinuousContentChange = (html: string) => {
    setContinuousHtml(html);
    const segments = splitContinuousHtml(html);
    if (segments.length === 0) {
      setPages([{ id: generatePageId(), content: '' }]);
      return;
    }
    setPages((prev) =>
      segments.map((content, index) => ({
        id: prev[index]?.id ?? generatePageId(),
        content,
      }))
    );
  };

  const saveDocumentToCloud = async () => {
    if (!user) {
      openAuthDialog('login');
      return;
    }
    if (isCloudSaving) return;

    setIsCloudSaving(true);
    try {
      const now = Date.now();
      const revisionIntervalMs = revisionIntervalMinutes * 60 * 1000;
      const shouldCreateRevision =
        !lastRevisionSavedAtRef.current ||
        now - lastRevisionSavedAtRef.current >= revisionIntervalMs;

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
          createRevision: shouldCreateRevision,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'クラウド保存に失敗しました');
      }

      if (data.document?.title) {
        setDocumentTitle(data.document.title);
      }
      const savedDocumentId = data.document?.id ?? activeDocumentId;
      setActiveDocumentId(savedDocumentId ?? null);
      if (shouldCreateRevision) {
        lastRevisionSavedAtRef.current = now;
      }
      if (savedDocumentId && shouldCreateRevision) {
        fetchDocumentRevisions(savedDocumentId);
      }
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
  saveDocumentToCloudRef.current = saveDocumentToCloud;

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

      const remotePages = normalizePagesPayload(
        data.document?.pages,
        typeof data.document?.content === 'string' ? data.document.content : ''
      );

      suppressAutoSaveRef.current = true;
      setPages(remotePages.length > 0 ? remotePages : [{ id: '1', content: '' }]);
      setCurrentPageIndex(0);
      setActiveDocumentId(documentId);
      lastRevisionSavedAtRef.current = null;
      setDocumentTitle(data.document?.title || DEFAULT_DOCUMENT_TITLE);
      setShowCloudDialog(false);
      setCloudStatus({ message: 'クラウドから読み込みました', tone: 'success' });
      setIsEditingTitle(false);
      fetchDocumentRevisions(documentId);

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

  const deleteDocumentFromCloud = async (documentId: string) => {
    if (!user) {
      openAuthDialog('login');
      return;
    }
    if (!confirm('このクラウドドキュメントを削除します。よろしいですか？')) {
      return;
    }

    setDeletingDocumentId(documentId);
    try {
      const response = await fetch(`/api/cloud/documents/${documentId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || '削除に失敗しました');
      }

      if (activeDocumentId === documentId) {
        setActiveDocumentId(null);
        setRevisionTimeline([]);
        setRevisionSliderIndex(0);
        lastRevisionSavedAtRef.current = null;
        setCloudStatus({
          message: 'クラウド保存されたデータを削除しました',
          tone: 'success',
        });
      } else {
        setCloudStatus({
          message: 'クラウドデータを削除しました',
          tone: 'success',
        });
      }

      fetchCloudDocuments();
    } catch (error) {
      console.error('Cloud delete error', error);
      setCloudStatus({
        message: error instanceof Error ? error.message : '削除に失敗しました',
        tone: 'error',
      });
    } finally {
      setDeletingDocumentId(null);
    }
  };

  const openDocumentPreview = async (documentId: string) => {
    if (!user) {
      openAuthDialog('login');
      return;
    }

    setPreviewingDocumentId(documentId);
    setIsPreviewLoading(true);
    try {
      const response = await fetch(`/api/cloud/documents/${documentId}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'プレビューの取得に失敗しました');
      }

      setPreviewDocument({
        title: data.document?.title || DEFAULT_DOCUMENT_TITLE,
        content: data.document?.content || '',
        updatedAt: data.document?.updatedAt ?? Date.now(),
      });
    } catch (error) {
      console.error('Preview load error', error);
      setCloudStatus({
        message: error instanceof Error ? error.message : 'プレビューの取得に失敗しました',
        tone: 'error',
      });
    } finally {
      setIsPreviewLoading(false);
      setPreviewingDocumentId(null);
    }
  };

  // 縦書き/横書き切替
  const toggleWritingMode = () => {
    setIsVertical(!isVertical);
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
      setRevisionTimeline([]);
      setRevisionSliderIndex(0);
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
        if (!showIntroDialog) {
          editorRef.current?.focus();
          moveCursorToEnd();
        }
      }, 100);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadPreferences = async () => {
      if (user) {
        // Load from API if user is logged in
        try {
          const response = await fetch('/api/preferences');
          if (response.ok) {
            const prefs = await response.json();
            setEditorTheme(prefs.theme);
            setEditorBackgroundColor(prefs.backgroundColor);
            setEditorTextColor(prefs.textColor);
            setEditorFontKey(prefs.fontPreset);
            setSettingsFontDraft(prefs.fontPreset);
            setMaxLinesPerPage(prefs.maxLinesPerPage);
            setSettingsMaxLinesDraft(prefs.maxLinesPerPage);
            setEditorMode(prefs.editorMode);
            setIsAutoSaveEnabled(prefs.autoSave);
            setRevisionIntervalMinutes(prefs.revisionIntervalMinutes);
            setSettingsRevisionIntervalDraft(prefs.revisionIntervalMinutes);
            setEditorKeybindings(prefs.keybindings);
          }
        } catch (error) {
          console.error('Failed to load preferences from API:', error);
        }
      } else {
        // Fallback to localStorage if not logged in
        const storedAutoSave = localStorage.getItem('tategaki-auto-save');
        if (storedAutoSave === 'true') {
          setIsAutoSaveEnabled(true);
        }
        const storedFont = localStorage.getItem('tategaki-font');
        if (storedFont && storedFont in FONT_PRESETS) {
          setEditorFontKey(storedFont as FontPresetKey);
          setSettingsFontDraft(storedFont as FontPresetKey);
        }
        const storedMaxLines = Number(localStorage.getItem('tategaki-max-lines'));
        if (!Number.isNaN(storedMaxLines) && storedMaxLines >= 10 && storedMaxLines <= 200) {
          setMaxLinesPerPage(storedMaxLines);
          setSettingsMaxLinesDraft(storedMaxLines);
        }
        const storedRevisionInterval = Number(localStorage.getItem('tategaki-revision-interval'));
        if (!Number.isNaN(storedRevisionInterval) && storedRevisionInterval >= 1 && storedRevisionInterval <= 120) {
          setRevisionIntervalMinutes(storedRevisionInterval);
          setSettingsRevisionIntervalDraft(storedRevisionInterval);
        }

        const storedMode =
          (typeof window !== 'undefined' && (localStorage.getItem('tategaki-editor-mode') as 'paged' | 'continuous')) ||
          DEFAULT_EDITOR_MODE;
        if (storedMode === 'continuous' || storedMode === 'paged') {
          setEditorMode(storedMode);
        }
      }
    };

    loadPreferences();
  }, [user]);

  useEffect(() => {
    setCharCount(computeTotalChars(pages));
  }, [pages]);

  // Update editor styles when theme changes
  useEffect(() => {
    if (editorRef.current) {
      const bgColor = editorTheme === 'custom' ? editorBackgroundColor : editorTheme === 'dark' ? '#000000' : '#FFFFFF';
      const txtColor = editorTheme === 'custom' ? editorTextColor : editorTheme === 'dark' ? '#FFFFFF' : '#000000';

      editorRef.current.style.backgroundColor = bgColor;
      editorRef.current.style.color = txtColor;
      editorRef.current.style.caretColor = txtColor;

      console.log('Editor style updated:', { bgColor, txtColor, theme: editorTheme });
    }
  }, [editorTheme, editorBackgroundColor, editorTextColor]);

  useEffect(() => {
    if (editorMode === 'continuous') {
      setContinuousHtml(joinPagesForContinuous(pages));
    }
  }, [pages, editorMode]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const originalOverflow = document.body.style.overflow;
    if (editorMode === 'continuous') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = originalOverflow;
    }
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [editorMode]);

  useEffect(() => {
    if (!isAutoSaveEnabled || !user) return;
    if (autoSaveSignal === 0) return;
    const timer = window.setTimeout(() => {
      saveDocumentToCloudRef.current?.();
    }, 1500);
    return () => clearTimeout(timer);
  }, [autoSaveSignal, isAutoSaveEnabled, user]);

  useEffect(() => {
    if (!editorRef.current) return;
    setTimeout(() => {
      const updatedLines = calculateActualContentLines();
      setLineCount(updatedLines);
      handleAutoPageBreak();
    }, 0);
  }, [maxLinesPerPage, editorFontKey]);

  useEffect(() => {
    const checkMobileView = () => {
      if (typeof window === 'undefined') return;
      setIsMobileView(window.innerWidth < 640);
    };

    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    return () => window.removeEventListener('resize', checkMobileView);
  }, []);

  useEffect(() => {
    if (!isMobileView) {
      setIsMobileSidebarOpen(false);
    }
  }, [isMobileView]);

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

  const renderHeaderContent = (variant: 'desktop' | 'mobile') => {
    const containerClass =
      variant === 'desktop'
        ? 'flex items-center justify-between'
        : 'flex flex-col gap-4';
    const brandWrapperClass =
      variant === 'desktop'
        ? 'flex items-center gap-2 min-w-0'
        : 'flex items-center gap-2 min-w-0 flex-wrap w-full';
    const titleColor = editorTheme === 'dark' ? '#e5e7eb' : '#374151';
    const titleClass =
      variant === 'desktop'
        ? 'text-sm font-medium whitespace-nowrap mr-4'
        : 'text-sm font-medium whitespace-nowrap';
    const actionWrapperClass =
      variant === 'desktop'
        ? 'flex items-center gap-1 flex-wrap justify-end'
        : 'flex flex-wrap gap-2 items-center w-full';
    return (
      <div className={containerClass} style={{ color: titleColor }}>
        <div className={brandWrapperClass}>
          <div className="w-4 h-4 bg-gray-600 rounded flex items-center justify-center mr-2">
            <span className="text-white text-xs font-bold">縦</span>
          </div>
          <h1 className={titleClass}>tategaki</h1>
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              onBlur={finishTitleEditing}
              onCompositionStart={() => setIsComposingTitle(true)}
              onCompositionEnd={() => setIsComposingTitle(false)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !isComposingTitle) {
                  event.preventDefault();
                  finishTitleEditing();
                }
              }}
              maxLength={120}
              className="ml-2 text-xs border border-blue-400 rounded px-2 py-1 text-black bg-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400 min-w-[240px]"
              placeholder="ドキュメントタイトル"
              aria-label="ドキュメントタイトル編集"
              autoFocus
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingTitle(true)}
              className="ml-2 text-sm font-semibold text-gray-800 truncate max-w-[200px] text-left hover:text-blue-600"
              title="タイトルを編集"
            >
              {documentTitle || DEFAULT_DOCUMENT_TITLE}
            </button>
          )}
        </div>

        <div className={actionWrapperClass}>
          {/* ページナビゲーション (paged mode only) */}
          {editorMode === 'paged' && (
            <>
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
            </>
          )}

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
            className="w-6 h-6 border border-gray-400 text-yellow-500 rounded text-xs hover:bg-yellow-50 flex items-center justify-center"
            title="現在のページを削除"
          >
            <FiTrash2 aria-hidden className="text-sm" />
          </button>

          <button
            onClick={deleteAllPages}
            className="w-6 h-6 border border-gray-400 text-red-600 rounded text-xs hover:bg-red-50 flex items-center justify-center"
            title="全ページ削除"
          >
            <FiTrash aria-hidden className="text-sm" />
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

          {user && (
            <button
              onClick={openSettingsDialog}
              className="w-6 h-6 border border-gray-400 text-gray-700 rounded text-xs hover:bg-gray-100 flex items-center justify-center"
              title="エディタ設定"
              aria-label="設定"
            >
              <FiSettings aria-hidden />
            </button>
          )}

          <div className="flex border border-gray-300 rounded overflow-hidden text-[10px]">
            <button
              type="button"
              onClick={() => handleEditorModeChange('paged')}
              className={`px-2 py-1 ${editorMode === 'paged' ? 'bg-gray-800 text-white' : 'text-gray-600 bg-white'
                }`}
            >
              ページ
            </button>
            <button
              type="button"
              onClick={() => handleEditorModeChange('continuous')}
              className={`px-2 py-1 ${editorMode === 'continuous' ? 'bg-gray-800 text-white' : 'text-gray-600 bg-white'
                }`}
            >
              横スクロール
            </button>
          </div>

          <div className="w-px h-4 bg-gray-300 mx-1"></div>
          <label
            className={`flex items-center gap-1 border rounded px-2 py-1 text-[10px] ${isAutoSaveEnabled ? 'border-blue-400 text-blue-700' : 'border-gray-300 text-gray-600'
              }`}
            title={user ? '一定時間入力が止まると自動保存します' : 'ログインすると自動保存を利用できます'}
          >
            <input
              type="checkbox"
              checked={isAutoSaveEnabled}
              onChange={handleAutoSaveToggle}
              className="h-3 w-3 accent-blue-500"
            />
            <span>自動保存</span>
          </label>

          {user ? (
            <>
              <button
                onClick={handleFileExport}
                className="h-6 px-2 border border-gray-400 text-gray-700 rounded text-[10px] font-medium hover:bg-gray-100 transition"
                title="ローカルにエクスポート"
              >
                エクスポート
              </button>
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
                onClick={handleCreateNewDocument}
                className="h-6 px-2 border border-green-400 text-green-600 rounded text-[10px] font-medium hover:bg-green-50 transition"
                title="新しいドキュメントを作成"
              >
                新規
              </button>
              <button
                onClick={handleLogout}
                className="h-6 px-2 border border-gray-400 text-gray-700 rounded text-[10px] font-medium hover:bg-gray-100 transition"
                title="ログアウト"
              >
                ログアウト
              </button>
              <span
                className={`ml-1 text-[10px] text-gray-600 ${variant === 'desktop' ? 'hidden sm:block' : ''
                  }`}
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
    );
  };

  const renderFooterContent = (variant: 'desktop' | 'mobile') => {
    const footerColor = editorTheme === 'dark' ? '#9ca3af' : '#6b7280';
    const containerClass =
      variant === 'desktop'
        ? 'flex flex-wrap items-center justify-between gap-3 text-xs'
        : 'flex flex-col gap-4 text-sm';
    const rowClass =
      variant === 'desktop'
        ? 'flex items-center gap-3 flex-wrap'
        : 'flex flex-col gap-2';
    const hasRevisions = Boolean(activeDocumentId && revisionTimeline.length > 0);
    const revisionSliderMax = Math.max(revisionTimeline.length - 1, 0);
    const safeRevisionIndex = Math.min(revisionSliderIndex, revisionSliderMax);
    const sliderDenominator = Math.max(revisionTimeline.length - 1, 1);
    const revisionSliderPercent =
      revisionTimeline.length <= 1
        ? 100
        : (safeRevisionIndex / sliderDenominator) * 100;
    const currentRevision = revisionTimeline[safeRevisionIndex];

    const linkRowClass =
      variant === 'desktop'
        ? 'flex items-center gap-4 flex-wrap'
        : 'flex flex-col gap-2';

    return (
      <div
        id={variant === 'desktop' ? 'editor-stats' : undefined}
        className={containerClass}
        style={{ color: footerColor }}
        aria-live="polite"
      >
        <div className={rowClass}>
          <span>© {currentYear} tategaki</span>
          <span>文字数: {charCount}</span>
          {editorMode === 'paged' ? (
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
          ) : (
            <span>行数: ―</span>
          )}
        </div>

        <div className={rowClass}>
          <span>Ctrl+Enter: 改ページ | Cmd+K: AI生成 | Ctrl+G: 行移動</span>
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

        {hasRevisions && (
          <div className="flex items-center gap-3">
            <div className="flex flex-col text-[10px] text-gray-500 leading-tight">
              <span>リビジョン</span>
              {isRevisionTimelineLoading ? (
                <span className="text-gray-400">更新中...</span>
              ) : (
                <span className="text-gray-400">
                  {safeRevisionIndex + 1}/{revisionTimeline.length}
                </span>
              )}
            </div>
            <div className="relative h-4 w-48">
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-gray-200"></div>
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
                style={{ width: `${revisionSliderPercent}%` }}
              ></div>
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 pointer-events-none">
                {revisionTimeline.map((revision, index) => {
                  const percent =
                    revisionTimeline.length <= 1
                      ? 100
                      : (index / sliderDenominator) * 100;
                  return (
                    <span
                      key={revision.id}
                      className={`absolute w-1.5 h-1.5 rounded-full ${index <= safeRevisionIndex ? 'bg-blue-500' : 'bg-gray-300'
                        }`}
                      style={{ left: `calc(${percent}% - 3px)` }}
                    ></span>
                  );
                })}
              </div>
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow bg-blue-500 pointer-events-none"
                style={{ left: `calc(${revisionSliderPercent}% - 8px)` }}
              ></div>
              <input
                type="range"
                min={0}
                max={revisionSliderMax}
                value={safeRevisionIndex}
                disabled={revisionTimeline.length <= 1 || isRevisionTimelineLoading}
                onChange={(event) => handleRevisionSliderChange(Number(event.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                aria-label="リビジョンタイムライン"
              />
            </div>
            <div className="text-[10px] text-gray-500 w-20 text-right leading-tight">
              {currentRevision ? formatRevisionTimestamp(currentRevision.createdAt) : '---'}
            </div>
          </div>
        )}

        <div className={linkRowClass}>
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
    );
  };

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

      <main
        className="flex-1 flex flex-col overflow-hidden"
        role="application"
        aria-label="縦書き小説エディタ"
        style={{
          backgroundColor: editorTheme === 'custom' ? editorBackgroundColor : editorTheme === 'dark' ? '#000000' : '#FFFFFF'
        }}
      >
        {/* 極小ヘッダー */}
        {isMobileView ? (
          <>
            <div className="bg-gray-100/70 border-b border-gray-200 px-3 py-2 flex-shrink-0 flex items-center justify-between sm:hidden">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-600 rounded flex items-center justify-center text-white text-sm font-bold">
                  縦
                </div>
                <span className="text-sm font-semibold text-gray-800">tategaki</span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-700 shadow-sm"
              >
                メニュー
              </button>
            </div>
            {isMobileSidebarOpen && (
              <div className="fixed inset-0 z-40 sm:hidden">
                <div
                  className="absolute inset-0 bg-black/40"
                  onClick={() => setIsMobileSidebarOpen(false)}
                  aria-hidden="true"
                ></div>
                <div className="absolute inset-y-0 right-0 w-full max-w-xs bg-white shadow-2xl p-4 overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-gray-800">tategaki メニュー</h3>
                    <button
                      type="button"
                      onClick={() => setIsMobileSidebarOpen(false)}
                      className="w-8 h-8 border border-gray-300 rounded-full text-gray-600"
                      aria-label="メニューを閉じる"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="space-y-6">
                    {renderHeaderContent('mobile')}
                    <div className="border-t border-gray-200 pt-4">
                      {renderFooterContent('mobile')}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div
            className="border-b px-2 py-1 flex-shrink-0"
            style={{
              backgroundColor: editorTheme === 'dark' ? '#1a1a1a' : '#f9fafb',
              borderColor: editorTheme === 'dark' ? '#333' : '#e5e7eb'
            }}
          >
            {renderHeaderContent('desktop')}
          </div>
        )}

        {/* エディタエリア（画面の95%） */}
        <div
          className="flex-1 overflow-hidden relative"
          style={{
            backgroundColor: editorTheme === 'custom' ? editorBackgroundColor : editorTheme === 'dark' ? '#000000' : '#FFFFFF'
          }}
        >
          {editorMode === 'paged' ? (
            <>
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
                aria-describedby={isMobileView ? undefined : 'editor-stats'}
                className={`w-full h-full p-8 outline-none resize-none text-lg leading-relaxed editor-focus ${isVertical
                  ? 'writing-mode-vertical-rl text-orientation-upright'
                  : 'writing-mode-horizontal-tb'
                  }`}
                style={{
                  writingMode: isVertical ? 'vertical-rl' : 'horizontal-tb',
                  textOrientation: isVertical ? 'upright' : 'mixed',
                  fontFamily: editorFontFamily,
                  backgroundColor: editorTheme === 'custom' ? editorBackgroundColor : editorTheme === 'dark' ? '#000000' : '#FFFFFF',
                  color: editorTheme === 'custom' ? editorTextColor : editorTheme === 'dark' ? '#FFFFFF' : '#000000',
                  caretColor: editorTheme === 'custom' ? editorTextColor : editorTheme === 'dark' ? '#FFFFFF' : '#000000'
                }}
                onInput={handleEditorChange}
                onPaste={handlePaste}
                onKeyDown={handleKeyDown}
                suppressContentEditableWarning={true}
                data-writing-mode={isVertical ? 'vertical' : 'horizontal'}
                data-content-type="novel-manuscript"
              />
            </>
          ) : (
            <ContinuousScrollEditor
              value={continuousHtml || joinPagesForContinuous(pages)}
              isVertical={isVertical}
              editorFontFamily={editorFontFamily}
              backgroundColor={editorTheme === 'custom' ? editorBackgroundColor : editorTheme === 'dark' ? '#000000' : '#FFFFFF'}
              textColor={editorTheme === 'custom' ? editorTextColor : editorTheme === 'dark' ? '#FFFFFF' : '#000000'}
              onChange={handleContinuousContentChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
            />
          )}
        </div>

        {/* 極小ステータスバー */}
        {!isMobileView && (
          <div
            className="border-t px-3 py-2 flex-shrink-0"
            style={{
              backgroundColor: editorTheme === 'dark' ? '#1a1a1a' : '#f9fafb',
              borderColor: editorTheme === 'dark' ? '#333' : '#e5e7eb',
              color: editorTheme === 'dark' ? '#e5e7eb' : '#374151'
            }}
          >
            {renderFooterContent('desktop')}
          </div>
        )}

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

        <JumpToLineDialog
          isOpen={showJumpDialog}
          onClose={() => setShowJumpDialog(false)}
          onJump={handleJumpToLine}
          maxLines={editorMode === 'paged' ? maxLinesPerPage : undefined}
        />

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
              <div className="mb-3">
                <button
                  onClick={handleCreateNewDocument}
                  className="w-full border border-green-400 text-green-700 rounded-md px-3 py-2 text-sm font-semibold hover:bg-green-50 transition"
                >
                  ＋ 新しいドキュメントを作成
                </button>
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
                    <div
                      key={doc.id}
                      onClick={() => loadDocumentFromCloud(doc.id)}
                      className={`w-full border rounded px-3 py-2 hover:bg-gray-50 transition cursor-pointer ${activeDocumentId === doc.id ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
                        }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-800 text-sm truncate">
                            {doc.title || DEFAULT_DOCUMENT_TITLE}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            更新: {new Date(doc.updatedAt).toLocaleString('ja-JP')}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openDocumentPreview(doc.id);
                            }}
                            disabled={isPreviewLoading && previewingDocumentId === doc.id}
                            className="w-7 h-7 flex items-center justify-center border border-blue-300 text-blue-500 rounded text-xs hover:bg-blue-50 disabled:opacity-60"
                            aria-label="クラウドドキュメントをプレビュー"
                          >
                            {isPreviewLoading && previewingDocumentId === doc.id ? (
                              <span className="text-[11px]">…</span>
                            ) : (
                              <FiEye aria-hidden />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              deleteDocumentFromCloud(doc.id);
                            }}
                            disabled={deletingDocumentId === doc.id}
                            className="w-7 h-7 flex items-center justify-center border border-red-400 text-red-500 rounded text-xs hover:bg-red-50 disabled:opacity-60"
                            aria-label="クラウドドキュメントを削除"
                          >
                            {deletingDocumentId === doc.id ? (
                              <span className="text-[11px]">…</span>
                            ) : (
                              <FiTrash aria-hidden />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {previewDocument && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 shadow-2xl text-black">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">プレビュー</h3>
                  <p className="text-xs text-gray-500">
                    更新: {new Date(previewDocument.updatedAt).toLocaleString('ja-JP')}
                  </p>
                </div>
                <button
                  onClick={closePreviewDialog}
                  className="w-6 h-6 border border-gray-400 text-gray-700 rounded text-xs hover:bg-gray-100"
                  aria-label="プレビューを閉じる"
                >
                  ✕
                </button>
              </div>
              <div className="mb-4">
                <h4 className="text-xl font-semibold text-gray-900 break-words">
                  {previewDocument.title || DEFAULT_DOCUMENT_TITLE}
                </h4>
              </div>
              <div className="border border-gray-200 rounded-lg p-4 max-h-80 overflow-y-auto bg-gray-50 text-sm leading-relaxed whitespace-pre-wrap">
                {previewDocument.content || '内容が空です。'}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={closePreviewDialog}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  閉じる
                </button>
              </div>
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

                {editorMode === 'paged' && (
                  <div className="grid grid-cols-2 gap-2 py-1 border-t border-gray-200">
                    <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">Ctrl + Enter</kbd>
                    <span>新しいページを作成</span>
                  </div>
                )}

                <div className={`grid grid-cols-2 gap-2 py-1${editorMode !== 'paged' ? ' border-t border-gray-200' : ''}`}>
                  <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">Cmd + K</kbd>
                  <span>AI文章生成</span>
                </div>

                {editorMode === 'paged' && (
                  <div className="grid grid-cols-2 gap-2 py-1">
                    <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">Shift + ← / →</kbd>
                    <span>ページ移動（←次 →前）</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 py-1">
                  <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">縦/横ボタン</kbd>
                  <span>書字モード切替</span>
                </div>
              </div>

              <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
                <strong>AI生成について:</strong><br />
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
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm px-4 py-6 sm:p-8">
            <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-gray-100 animate-in slide-in-from-bottom-4 duration-500 max-h-[90vh] overflow-y-auto">
              {/* ヘッダー */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-white text-2xl font-bold">縦</span>
                </div>
                <h2 className="text-3xl font-bold text-gray-800 mb-2">tategaki へようこそ</h2>
                <p className="text-lg text-gray-600">AI搭載の縦書きエディタ</p>
              </div>

              {/* 機能紹介 */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
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
              </div>

              {/* アクションボタン */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
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
              <div className="text-center space-y-1">
                <p className="text-sm text-gray-600 flex flex-col sm:flex-row items-center justify-center gap-2">
                  <span>ログインするとクラウド保存が可能です。</span>
                  <button
                    type="button"
                    onClick={() => openAuthDialog('login')}
                    className="text-blue-600 underline underline-offset-2 hover:text-blue-700"
                  >
                    ログイン・アカウント作成はこちら
                  </button>
                </p>
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

        {/* 設定ダイアログ */}
        <PreferencesDialog
          isOpen={showPreferencesDialog}
          onClose={closeSettingsDialog}
          onPreferencesChange={handlePreferencesChange}
        />

        {cloudStatus && (
          <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
            <div
              className={`min-w-[220px] max-w-sm rounded-lg px-4 py-3 text-sm shadow-xl border ${cloudStatus.tone === 'success'
                ? 'bg-green-50 text-green-800 border-green-200'
                : 'bg-red-50 text-red-800 border-red-200'
                }`}
            >
              <div className="font-semibold text-xs mb-1">
                {cloudStatus.tone === 'success' ? 'クラウド保存' : 'エラー'}
              </div>
              <div>{cloudStatus.message}</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
