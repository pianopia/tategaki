import React, { useState, useEffect, useRef } from 'react';

interface GoToLineDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onGoToLine: (lineNumber: number) => void;
    currentLine: number;
    maxLines: number;
}

export function GoToLineDialog({
    isOpen,
    onClose,
    onGoToLine,
    currentLine,
    maxLines,
}: GoToLineDialogProps) {
    const [lineNumber, setLineNumber] = useState(currentLine.toString());
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setLineNumber(currentLine.toString());
            setTimeout(() => {
                inputRef.current?.focus();
                inputRef.current?.select();
            }, 50);
        }
    }, [isOpen, currentLine]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const line = parseInt(lineNumber, 10);
        if (!isNaN(line)) {
            onGoToLine(line);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-80 max-w-full">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                    行へ移動
                </h3>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label
                            htmlFor="lineNumber"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                        >
                            行番号 (1 - {maxLines})
                        </label>
                        <input
                            ref={inputRef}
                            type="number"
                            id="lineNumber"
                            min="1"
                            max={maxLines}
                            value={lineNumber}
                            onChange={(e) => setLineNumber(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                    </div>
                    <div className="flex justify-end space-x-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                        >
                            キャンセル
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            移動
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
