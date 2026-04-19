'use client';

import { useState } from 'react';
import LessonRenderer from '@/components/lesson/LessonRenderer';

export default function LessonPreview({ lesson, onSave, onEditBlock }) {
  const [title, setTitle] = useState(lesson.title || 'Untitled Lesson');
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const [copied, setCopied] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const method = savedId ? 'PUT' : 'POST';
      const url = savedId ? `/api/lessons/${savedId}` : '/api/lessons';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...lesson,
          title,
        }),
      });
      const data = await res.json();
      setSavedId(data.id);
      if (onSave) onSave(data);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  }

  function handleShare() {
    if (!savedId) return;
    const url = `${window.location.origin}/learn/${savedId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="lesson-preview">
      <div className="preview-toolbar">
        <input
          type="text"
          className="preview-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Lesson title..."
        />
        <div className="preview-actions">
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : savedId ? 'Update' : 'Save'}
          </button>
          {savedId && (
            <button
              className="btn btn-secondary"
              onClick={handleShare}
            >
              {copied ? 'Copied!' : 'Share Link'}
            </button>
          )}
        </div>
      </div>
      <div className="preview-content">
        <LessonRenderer
          blocks={lesson.blocks}
          progressiveDisclosure={false}
          onEditBlock={onEditBlock}
        />
      </div>
    </div>
  );
}
