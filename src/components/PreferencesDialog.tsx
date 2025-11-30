'use client';

import { useEffect, useState } from 'react';

interface Preferences {
  theme: 'light' | 'dark' | 'custom';
  backgroundColor: string;
  textColor: string;
  fontPreset: 'classic' | 'modern' | 'neutral' | 'mono';
  maxLinesPerPage: number;
  editorMode: 'paged' | 'continuous';
  autoSave: boolean;
  revisionIntervalMinutes: number;
  keybindings: Record<string, string>;
}

interface PreferencesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPreferencesChange: (prefs: Preferences) => void;
}

const DEFAULT_KEYBINDINGS: Record<string, { action: string; key: string }> = {
  addPage: { action: 'Add new page', key: 'Ctrl+Enter' },
  aiPrompt: { action: 'Open AI prompt', key: 'Cmd+K' },
  jumpToLine: { action: 'Jump to line', key: 'Ctrl+G' },
  nextPage: { action: 'Go to next page', key: 'Shift+Left' },
  prevPage: { action: 'Go to previous page', key: 'Shift+Right' },
  delete: { action: 'Delete (Del)', key: '' },
  backspace: { action: 'Backspace (BS)', key: '' },
  enter: { action: 'Enter', key: '' },
  moveUp: { action: 'Move up (Up arrow)', key: '' },
  moveDown: { action: 'Move down (Down arrow)', key: '' },
  moveLeft: { action: 'Move left (Left arrow)', key: '' },
  moveRight: { action: 'Move right (Right arrow)', key: '' },
};

export function PreferencesDialog({
  isOpen,
  onClose,
  onPreferencesChange,
}: PreferencesDialogProps) {
  const [preferences, setPreferences] = useState<Preferences>({
    theme: 'light',
    backgroundColor: '#FFFFFF',
    textColor: '#000000',
    fontPreset: 'classic',
    maxLinesPerPage: 40,
    editorMode: 'paged',
    autoSave: true,
    revisionIntervalMinutes: 10,
    keybindings: {},
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'appearance' | 'editor' | 'keybindings'>('appearance');
  const [recordingKey, setRecordingKey] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadPreferences();
    }
  }, [isOpen]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/preferences');
      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      if (response.ok) {
        // Notify parent component BEFORE closing dialog
        onPreferencesChange(preferences);
        // Small delay to ensure state update
        setTimeout(() => {
          onClose();
        }, 100);
      } else {
        alert('Failed to save preferences');
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
      alert('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = <K extends keyof Preferences>(
    key: K,
    value: Preferences[K]
  ) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const handleKeyRecording = (e: React.KeyboardEvent<HTMLInputElement>, bindingKey: string) => {
    if (!recordingKey || recordingKey !== bindingKey) return;

    e.preventDefault();
    e.stopPropagation();

    // Ignore modifier keys alone
    if (['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) {
      return;
    }

    const parts: string[] = [];

    // Add modifiers
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.metaKey) parts.push('Cmd');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');

    // Add the main key
    let mainKey = e.key;
    // Capitalize single letters
    if (mainKey.length === 1) {
      mainKey = mainKey.toUpperCase();
    }
    parts.push(mainKey);

    const keyCombo = parts.join('+');

    // Update keybindings
    const newKeybindings = {
      ...preferences.keybindings,
      [bindingKey]: keyCombo,
    };
    updatePreference('keybindings', newKeybindings);

    // Stop recording
    setRecordingKey(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('appearance')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'appearance'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Appearance
          </button>
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'editor'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Editor
          </button>
          <button
            onClick={() => setActiveTab('keybindings')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'keybindings'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Keybindings
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-180px)]">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : (
            <>
              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Theme
                    </label>
                    <select
                      value={preferences.theme}
                      onChange={(e) =>
                        updatePreference(
                          'theme',
                          e.target.value as 'light' | 'dark' | 'custom'
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  {preferences.theme === 'custom' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Background Color
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={preferences.backgroundColor}
                            onChange={(e) =>
                              updatePreference('backgroundColor', e.target.value)
                            }
                            className="h-10 w-20 border border-gray-300 dark:border-gray-600 rounded"
                          />
                          <input
                            type="text"
                            value={preferences.backgroundColor}
                            onChange={(e) =>
                              updatePreference('backgroundColor', e.target.value)
                            }
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Text Color
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={preferences.textColor}
                            onChange={(e) =>
                              updatePreference('textColor', e.target.value)
                            }
                            className="h-10 w-20 border border-gray-300 dark:border-gray-600 rounded"
                          />
                          <input
                            type="text"
                            value={preferences.textColor}
                            onChange={(e) =>
                              updatePreference('textColor', e.target.value)
                            }
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Font Preset
                    </label>
                    <select
                      value={preferences.fontPreset}
                      onChange={(e) =>
                        updatePreference(
                          'fontPreset',
                          e.target.value as 'classic' | 'modern' | 'neutral' | 'mono'
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="classic">Classic (明朝体)</option>
                      <option value="modern">Modern (ゴシック体)</option>
                      <option value="neutral">Neutral (ヒューマン系)</option>
                      <option value="mono">Mono (等幅)</option>
                    </select>
                  </div>

                  <div
                    className="p-4 rounded-md border-2 border-gray-300 dark:border-gray-600"
                    style={{
                      backgroundColor:
                        preferences.theme === 'custom'
                          ? preferences.backgroundColor
                          : preferences.theme === 'dark'
                            ? '#000000'
                            : '#FFFFFF',
                      color:
                        preferences.theme === 'custom'
                          ? preferences.textColor
                          : preferences.theme === 'dark'
                            ? '#FFFFFF'
                            : '#000000',
                    }}
                  >
                    <p className="text-center">Preview: これはサンプルテキストです</p>
                  </div>
                </div>
              )}

              {activeTab === 'editor' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Editor Mode
                    </label>
                    <select
                      value={preferences.editorMode}
                      onChange={(e) =>
                        updatePreference(
                          'editorMode',
                          e.target.value as 'paged' | 'continuous'
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="paged">Paged</option>
                      <option value="continuous">Continuous</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Max Lines Per Page: {preferences.maxLinesPerPage}
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={preferences.maxLinesPerPage}
                      onChange={(e) =>
                        updatePreference('maxLinesPerPage', Number(e.target.value))
                      }
                      className="w-full"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="autoSave"
                      checked={preferences.autoSave}
                      onChange={(e) =>
                        updatePreference('autoSave', e.target.checked)
                      }
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                    <label
                      htmlFor="autoSave"
                      className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                    >
                      Auto Save
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Revision Interval (minutes): {preferences.revisionIntervalMinutes}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="60"
                      value={preferences.revisionIntervalMinutes}
                      onChange={(e) =>
                        updatePreference(
                          'revisionIntervalMinutes',
                          Number(e.target.value)
                        )
                      }
                      className="w-full"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'keybindings' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Click the button and press the key combination you want to use
                  </p>
                  {Object.entries(DEFAULT_KEYBINDINGS).map(([key, { action }]) => (
                    <div key={key} className="flex items-center gap-4">
                      <label className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                        {action}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={
                            recordingKey === key
                              ? 'Press any key...'
                              : preferences.keybindings[key] || DEFAULT_KEYBINDINGS[key].key
                          }
                          onKeyDown={(e) => handleKeyRecording(e, key)}
                          onFocus={() => setRecordingKey(key)}
                          onBlur={() => setRecordingKey(null)}
                          placeholder={DEFAULT_KEYBINDINGS[key].key}
                          className={`w-40 px-3 py-2 border rounded-md text-sm text-center ${
                            recordingKey === key
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300'
                              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                          }`}
                          readOnly
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newKeybindings = { ...preferences.keybindings };
                            delete newKeybindings[key];
                            updatePreference('keybindings', newKeybindings);
                          }}
                          className="px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md border border-gray-300 dark:border-gray-600"
                          title="Reset to default"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-4">
                    Click on the input field and press your desired key combination
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={savePreferences}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
