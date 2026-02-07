'use client';

import React, { useEffect, useRef } from 'react';

type ContinuousScrollEditorProps = {
  value: string;
  isVertical: boolean;
  editorFontFamily: string;
  backgroundColor?: string;
  textColor?: string;
  onChange: (html: string) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onPaste: (event: React.ClipboardEvent<HTMLDivElement>) => void;
};

const ContinuousScrollEditor = React.forwardRef<HTMLDivElement, ContinuousScrollEditorProps>(
  ({
    value,
    isVertical,
    editorFontFamily,
    backgroundColor = '#ffffff',
    textColor = '#000000',
    onChange,
    onKeyDown,
    onPaste,
  }, ref) => {
    // Internal ref fallback if external ref is not provided (though in this app it will be)
    // We use a local ref to handle internal logic if needed, but here we can attach the forwarded ref directly.
    // However, we also use editorRef internally in useEffects. We need to merge them or just use the forwarded ref.
    // Since ref can be a function or object, handling it robustly is good, but for simplicity in this codebase we'll assume object ref or use a callback.
    // Actually, let's just use useImperativeHandle or simply expect a RefObject.
    // Given the consumer uses `useRef`, we can cast.

    // Better approach: Use an internal ref and sync it to the forwarded ref, or use a library like react-merge-refs.
    // Or simpler: Require ref to be passed.

    // Let's rely on the fact that we will pass a ref from useRef.
    const internalRef = useRef<HTMLDivElement>(null);

    // Sync forwarded ref
    useEffect(() => {
      if (!ref) return;
      if (typeof ref === 'function') {
        ref(internalRef.current);
      } else {
        // @ts-ignore
        ref.current = internalRef.current;
      }
    });

    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const isComposing = useRef(false);

    useEffect(() => {
      if (!isComposing.current && internalRef.current && internalRef.current.innerHTML !== value) {
        internalRef.current.innerHTML = value || '';
      }
    }, [value]);

    // Update editor styles when colors change
    useEffect(() => {
      if (internalRef.current) {
        internalRef.current.style.backgroundColor = backgroundColor;
        internalRef.current.style.color = textColor;
        internalRef.current.style.caretColor = textColor;
      }
      if (scrollContainerRef.current) {
        scrollContainerRef.current.style.backgroundColor = backgroundColor;
      }
    }, [backgroundColor, textColor]);

    // Set initial scroll position
    useEffect(() => {
      if (!scrollContainerRef.current) return;

      if (isVertical) {
        // For vertical mode, scroll to the rightmost position (start of content)
        // Use setTimeout to ensure content is rendered first
        setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
          }
        }, 0);
      } else {
        // For horizontal mode, scroll right by 80px to show the left padding
        scrollContainerRef.current.scrollLeft = 80;
      }
    }, [isVertical]);

    const handleInput = (event: React.FormEvent<HTMLDivElement>) => {
      if (!internalRef.current) return;
      if (isComposing.current || (event.nativeEvent as any).isComposing) return; // Skip updates during composition
      onChange(internalRef.current.innerHTML);
    };

    const handleCompositionStart = () => {
      isComposing.current = true;
    };

    const handleCompositionEnd = () => {
      isComposing.current = false;
      if (internalRef.current) {
        onChange(internalRef.current.innerHTML);
      }
    };

    useEffect(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        const horizontalDelta =
          Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
        container.scrollLeft += horizontalDelta;
      };

      container.addEventListener('wheel', onWheel, { passive: false });
      return () => {
        container.removeEventListener('wheel', onWheel);
      };
    }, []);

    return (
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-x-auto overflow-y-hidden"
        style={{ touchAction: 'pan-x', backgroundColor }}
      >
        <div className="h-full min-h-[60vh]" style={{ width: isVertical ? 'max-content' : '100%' }}>
          <div
            ref={internalRef}
            contentEditable
            suppressContentEditableWarning
            className="min-h-[70vh] outline-none text-lg leading-relaxed"
            style={{
              writingMode: isVertical ? 'vertical-rl' : 'horizontal-tb',
              textOrientation: isVertical ? 'upright' : 'mixed',
              fontFamily: editorFontFamily,
              color: textColor,
              caretColor: textColor,
              minWidth: isVertical ? '200vw' : '100vw',
              height: '100%',
              backgroundColor: backgroundColor,
              // 縦書き: 右側に余裕を持たせる / 横書き: 左側に余裕を持たせる
              padding: isVertical ? '32px 80px 32px 32px' : '32px 32px 32px 80px',
            }}
            onInput={handleInput}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            data-editor-surface="continuous"
          />
        </div>
      </div>
    );
  }
);

ContinuousScrollEditor.displayName = 'ContinuousScrollEditor';

export default ContinuousScrollEditor;
