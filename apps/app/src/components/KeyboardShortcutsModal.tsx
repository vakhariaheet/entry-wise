import { Command, X } from 'lucide-react';
import type React from 'react';
import { useEffect } from 'react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutSection {
  title: string;
  items: ShortcutItem[];
}

const SHORTCUT_SECTIONS: ShortcutSection[] = [
  {
    title: 'Table Navigation',
    items: [
      { keys: ['J', '↓'], description: 'Navigate to next submission' },
      { keys: ['K', '↑'], description: 'Navigate to previous submission' },
      { keys: ['Enter', 'O'], description: 'Open submission detail drawer' },
      { keys: ['X'], description: 'Toggle row selection checkbox' },
      { keys: ['Shift', 'X'], description: 'Select or deselect all visible rows' },
      { keys: ['/'], description: 'Focus search bar' },
      { keys: ['Esc'], description: 'Clear selection or blur search' },
    ],
  },
  {
    title: 'Submission Actions',
    items: [
      { keys: ['R'], description: 'Mark submission(s) as Read' },
      { keys: ['N'], description: 'Mark submission(s) as New' },
      { keys: ['E'], description: 'Archive submission(s)' },
      { keys: ['S'], description: 'Toggle Spam status' },
      { keys: ['Delete'], description: 'Permanently delete submission(s)' },
    ],
  },
  {
    title: 'Detail Drawer View',
    items: [
      { keys: ['J', 'K'], description: 'Cycle through submissions in drawer' },
      { keys: ['1', '2', '3'], description: 'Switch tabs: Form Data, JSON, Security' },
      { keys: ['C'], description: 'Copy raw JSON payload to clipboard' },
      { keys: ['I'], description: 'Copy submission ID to clipboard' },
      { keys: ['Esc'], description: 'Close detail drawer' },
    ],
  },
  {
    title: 'General',
    items: [{ keys: ['?'], description: 'Toggle this keyboard shortcut guide' }],
  },
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/[0.1] bg-[#0c0e14] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] bg-[#090a0f] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Command className="w-4 h-4" />
            </span>
            <div>
              <h2 id="shortcuts-title" className="text-sm font-semibold text-white tracking-tight">
                Keyboard Shortcuts
              </h2>
              <p className="text-[11px] text-zinc-400">
                Pro-level navigation shortcuts inspired by Linear and Superhuman
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SHORTCUT_SECTIONS.map((section) => (
              <div key={section.title} className="space-y-2.5">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-emerald-400/90 font-mono">
                  {section.title}
                </h3>
                <div className="rounded-xl border border-white/[0.06] bg-[#12141c] divide-y divide-white/[0.04]">
                  {section.items.map((item) => (
                    <div
                      key={item.description}
                      className="px-3.5 py-2.5 flex items-center justify-between text-xs hover:bg-white/[0.02] transition"
                    >
                      <span className="text-zinc-300 font-normal pr-3">{item.description}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {item.keys.map((k) => (
                          <kbd
                            key={k}
                            className="min-w-[20px] px-1.5 py-0.5 rounded border border-white/[0.12] bg-white/[0.05] text-[10px] font-mono text-zinc-200 text-center font-semibold shadow-sm"
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/[0.08] bg-[#090a0f] flex items-center justify-between text-xs text-zinc-500 font-mono shrink-0">
          <span>
            Tip: Press{' '}
            <kbd className="px-1 py-0.5 rounded border border-white/[0.08] bg-white/[0.04] text-zinc-300 text-[10px]">
              ?
            </kbd>{' '}
            anywhere to open this sheet
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg text-xs font-medium bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
