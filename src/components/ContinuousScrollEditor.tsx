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
  (
    {
      value,
      isVertical,
      editorFontFamily,
      backgroundColor = '#ffffff',
      textColor = '#000000',
      onChange,
      onKeyDown,
      onPaste,
    },
    ref
  ) => {
    const internalEditorRef = useRef<HTMLDivElement | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);

    // Expose the internal editor ref to the parent via the forwarded ref
    React.useImperativeHandle(ref, () => internalEditorRef.current as HTMLDivElement);

    useEffect(() => {
      if (internalEditorRef.current && internalEditorRef.current.innerHTML !== value) {
        internalEditorRef.current.innerHTML = value || '';
      }
    }, [value]);

    // Update editor styles when colors change
    useEffect(() => {
      if (internalEditorRef.current) {
        internalEditorRef.current.style.backgroundColor = backgroundColor;
        internalEditorRef.current.style.color = textColor;
        internalEditorRef.current.style.caretColor = textColor;
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

    const handleInput = () => {
      if (!internalEditorRef.current) return;
      onChange(internalEditorRef.current.innerHTML);
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
        <div className="min-h-[60vh]" style={{ width: isVertical ? 'max-content' : '100%' }}>
          <div
            ref={internalEditorRef}
            contentEditable
            suppressContentEditableWarning
            className={`min-h-[70vh] outline-none text-lg leading-relaxed ${isVertical ? 'vertical-text' : ''}`}
            style={{
              writingMode: isVertical ? 'vertical-rl' : 'horizontal-tb',
              textOrientation: isVertical ? 'upright' : 'mixed',
              fontFamily: editorFontFamily,
              color: textColor,
              caretColor: textColor,
              minWidth: isVertical ? '200vw' : '100vw',
              // Fix wrapping: Constrain height to viewport height minus header/margin
              height: isVertical ? 'calc(100vh - 140px)' : 'auto',
              backgroundColor: backgroundColor,
              // 縦書き: 右側に余裕を持たせる / 横書き: 左側に余裕を持たせる
              padding: isVertical ? '32px 32px 32px 32px' : '32px 32px 32px 80px',
            }}
            onInput={handleInput}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
          />
        </div>
      </div>
    );
  }
);

ContinuousScrollEditor.displayName = 'ContinuousScrollEditor';

export default ContinuousScrollEditor;
