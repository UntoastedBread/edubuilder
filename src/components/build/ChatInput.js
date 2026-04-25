'use client';

import { useState, useRef } from 'react';
import { useMode } from '@/lib/ModeContext';
import { useI18n } from '@/lib/I18nContext';

const BLOCK_TYPES = [
  { type: 'reading', label: 'Reading', color: 'var(--block-reading)' },
  { type: 'quiz', label: 'Quiz', color: 'var(--block-quiz)' },
  { type: 'fill-blank', label: 'Fill the Blank', color: 'var(--block-fill-blank)' },
  { type: 'drag-order', label: 'Drag & Order', color: 'var(--block-drag-order)' },
  { type: 'short-answer', label: 'Short Answer', color: 'var(--block-short-answer)' },
  { type: 'video', label: 'Video', color: 'var(--block-video)' },
  { type: 'sandbox', label: 'Code Sandbox', color: 'var(--block-sandbox)' },
];

export default function ChatInput({ onSend, onStop, disabled, streaming, showPalette }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);
  const { mode } = useMode();
  const { t } = useI18n();
  const modeKey = mode === 'teacher' ? 'teacher' : 'learner';

  function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function handleInput(e) {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
  }

  return (
    <form className="chat-input-form" onSubmit={handleSubmit}>
      {showPalette && (
        <div className="block-palette">
          <div className="block-palette-track">
            {BLOCK_TYPES.map((bt) => (
              <span
                key={bt.type}
                className="block-palette-pill"
                style={{ '--pill-color': bt.color }}
              >
                <span className="block-palette-dot" />
                {bt.label}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="chat-input-wrapper">
        <textarea
          ref={textareaRef}
          className="chat-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={t(`chat.placeholder.${modeKey}`)}
          disabled={disabled}
          rows={1}
        />
        {streaming ? (
          <button
            type="button"
            className="chat-action-btn chat-stop-btn"
            onClick={onStop}
            aria-label="Stop generating"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect x="1" y="1" width="12" height="12" rx="2" />
            </svg>
          </button>
        ) : (
          <button
            type="submit"
            className="chat-action-btn chat-send-btn"
            disabled={!text.trim()}
            aria-label="Send message"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </button>
        )}
      </div>
    </form>
  );
}
