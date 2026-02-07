import React, { useState, useEffect, useRef } from 'react';

type JumpToLineDialogProps = {
    isOpen: boolean;
    onClose: () => void;
    onJump: (lineNumber: number) => void;
    maxLines?: number;
};

export const JumpToLineDialog: React.FC<JumpToLineDialogProps> = ({
    isOpen,
    onClose,
    onJump,
    maxLines,
}) => {
    const [lineNumber, setLineNumber] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setLineNumber('');
            setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
        }
    }, [isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const num = parseInt(lineNumber, 10);
        if (!isNaN(num) && num > 0) {
            onJump(num);
            onClose();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-800">行へ移動</h3>
                    <button
                        onClick={onClose}
                        className="w-6 h-6 border border-gray-400 text-gray-700 rounded text-xs hover:bg-gray-100"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            移動先の行番号を入力
                        </label>
                        <input
                            ref={inputRef}
                            type="number"
                            min="1"
                            max={maxLines}
                            value={lineNumber}
                            onChange={(e) => setLineNumber(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                            placeholder="行番号"
                            autoFocus
                        />
                        {maxLines && (
                            <p className="text-xs text-gray-500 mt-1 text-right">
                                最大行数: {maxLines}
                            </p>
                        )}
                    </div>

                    <div className="flex justify-end space-x-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-100"
                        >
                            キャンセル
                        </button>
                        <button
                            type="submit"
                            disabled={!lineNumber}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            移動
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
