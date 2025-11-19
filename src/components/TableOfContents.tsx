import React from 'react';

export type Heading = {
    id: string;
    text: string;
    pageIndex?: number; // For paged mode
    elementId?: string; // For continuous mode (if we attach IDs to headings)
};

interface TableOfContentsProps {
    headings: Heading[];
    onSelect: (heading: Heading) => void;
    onClose: () => void;
}

export function TableOfContents({ headings, onSelect, onClose }: TableOfContentsProps) {
    return (
        <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 shadow-lg z-50 transform transition-transform duration-300 ease-in-out flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">目次</h2>
                <button
                    onClick={onClose}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                    ✕
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
                {headings.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                        見出しがありません
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {headings.map((heading) => (
                            <li key={heading.id}>
                                <button
                                    onClick={() => onSelect(heading)}
                                    className="w-full text-left text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 px-2 py-1.5 rounded transition-colors truncate"
                                    title={heading.text}
                                >
                                    {heading.text}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
