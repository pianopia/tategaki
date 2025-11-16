'use client';

import React, { useEffect, useRef } from 'react';

type ContinuousScrollEditorProps = {
  value: string;
  isVertical: boolean;
  editorFontFamily: string;
  onChange: (html: string) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onPaste: (event: React.ClipboardEvent<HTMLDivElement>) => void;
};

export default function ContinuousScrollEditor({
  value,
  isVertical,
  editorFontFamily,
  onChange,
  onKeyDown,
  onPaste,
}: ContinuousScrollEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (!editorRef.current) return;
    onChange(editorRef.current.innerHTML);
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      event.preventDefault();
      container.scrollLeft += event.deltaY;
    }
  };

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 overflow-x-auto overflow-y-hidden bg-gray-50"
      onWheel={handleWheel}
    >
      <div className="min-h-[60vh] w-full">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className="min-h-[70vh] outline-none text-lg leading-relaxed w-max"
          style={{
            writingMode: isVertical ? 'vertical-rl' : 'horizontal-tb',
            textOrientation: isVertical ? 'upright' : 'mixed',
            fontFamily: editorFontFamily,
            color: '#000000',
            caretColor: '#000000',
            width: 'max-content',
            backgroundColor: '#ffffff',
            padding: '32px',
          }}
          onInput={handleInput}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
        />
      </div>
    </div>
  );
}
