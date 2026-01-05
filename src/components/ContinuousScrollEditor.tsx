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

export default function ContinuousScrollEditor({
  value,
  isVertical,
  editorFontFamily,
  backgroundColor = '#ffffff',
  textColor = '#000000',
  onChange,
  onKeyDown,
  onPaste,
}: ContinuousScrollEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const isComposing = useRef(false);

  useEffect(() => {
    if (!isComposing.current && editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  // Update editor styles when colors change
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.style.backgroundColor = backgroundColor;
      editorRef.current.style.color = textColor;
      editorRef.current.style.caretColor = textColor;
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
    if (!editorRef.current) return;
    if (isComposing.current || (event.nativeEvent as any).isComposing) return; // Skip updates during composition
    onChange(editorRef.current.innerHTML);
  };

  const handleCompositionStart = () => {
    isComposing.current = true;
  };

  const handleCompositionEnd = () => {
    isComposing.current = false;
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    event.preventDefault();
    const horizontalDelta =
      Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    container.scrollLeft += horizontalDelta;
  };

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 overflow-x-auto overflow-y-hidden"
      style={{ touchAction: 'pan-x', backgroundColor }}
      onWheel={handleWheel}
    >
      <div className="h-full min-h-[60vh]" style={{ width: isVertical ? 'max-content' : '100%' }}>
        <div
          ref={editorRef}
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
