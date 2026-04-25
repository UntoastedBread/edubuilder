'use client';

import { useState, useEffect } from 'react';

const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.userAgent);
const MOD = isMac ? '⌘' : 'Ctrl';

const SHORTCUTS = [
  { label: 'Send message', keys: ['Enter'], context: 'build' },
  { label: 'New line', keys: ['Shift', 'Enter'], context: 'build' },
  { label: 'Next block', keys: ['Enter'], context: 'learn' },
  { label: 'Show shortcuts', keys: ['?'], context: 'global' },
  { label: 'Close dialog', keys: ['Esc'], context: 'global' },
];

export default function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKey(e) {
      // Don't trigger if user is typing in an input/textarea
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  if (!open) return null;

  return (
    <div className="shortcuts-overlay" onClick={() => setOpen(false)}>
      <div className="shortcuts-modal" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-modal-header">
          <h3>Keyboard Shortcuts</h3>
          <button className="shortcuts-close" onClick={() => setOpen(false)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="shortcuts-grid">
          {SHORTCUTS.map((s, i) => (
            <div key={i} className="shortcut-row">
              <span className="shortcut-label">{s.label}</span>
              <div className="shortcut-keys">
                {s.keys.map((k, j) => (
                  <span key={j} className="key-cap">{k === 'Ctrl' ? MOD : k}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="shortcuts-hint">Press <span className="key-cap">?</span> to toggle</p>
      </div>
    </div>
  );
}
