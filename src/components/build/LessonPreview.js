'use client';

import { useState, useRef, useEffect } from 'react';
import LessonRenderer from '@/components/lesson/LessonRenderer';
import { useToast } from '@/components/ui/Toast';
import { estimateDuration } from '@/lib/duration';
import { useI18n } from '@/lib/I18nContext';

function ShareModal({ url, onClose }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  const { t } = useI18n();

  function handleCopy() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success(t('learn.shareCopied'));
    setTimeout(() => setCopied(false), 2000);
  }

  // Close on Escape
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Generate a simple QR code URL using a public API
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(url)}&bgcolor=f7f6f1&color=2e2c28&format=svg`;

  return (
    <div className="share-overlay" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="share-modal-header">
          <h3>{t('share.title')}</h3>
          <button className="share-modal-close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <p className="share-modal-desc">{t('share.desc')}</p>
        <div className="share-link-row">
          <input className="share-link-input" value={url} readOnly onClick={(e) => e.target.select()} />
          <button className="share-copy-btn" onClick={handleCopy}>
            {copied ? t('share.copied') : t('share.copy')}
          </button>
        </div>
        <div className="share-qr-wrap">
          <img src={qrUrl} alt="QR code" className="share-qr-img" width="120" height="120" />
          <p className="share-qr-hint">{t('share.qrHint')}</p>
        </div>
      </div>
    </div>
  );
}

export default function LessonPreview({ lesson, started, onTitleUpdate, onSave, onReorder, onImageAction }) {
  const [title, setTitle] = useState(lesson.title || 'Untitled Lesson');
  const [editingTitle, setEditingTitle] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [visibility, setVisibility] = useState('private');
  const contentRef = useRef(null);
  const titleInputRef = useRef(null);
  const prevBlockCount = useRef(lesson.blocks.length);
  const toast = useToast();
  const { t } = useI18n();

  const duration = estimateDuration(lesson.blocks);

  // Sync title from lesson state (e.g. when Claude sets it via tool call)
  useEffect(() => {
    if (lesson.title && lesson.title !== 'Untitled Lesson') {
      setTitle(lesson.title);
    }
  }, [lesson.title]);

  useEffect(() => {
    if (lesson.blocks.length > prevBlockCount.current && contentRef.current) {
      contentRef.current.scrollTo({
        top: contentRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
    prevBlockCount.current = lesson.blocks.length;
  }, [lesson.blocks.length]);

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
          visibility,
        }),
      });
      const data = await res.json();
      setSavedId(data.id);
      toast.success('Lesson saved');
      if (onSave) onSave(data);
    } catch (err) {
      console.error('Save failed:', err);
      toast.error('Failed to save lesson');
    } finally {
      setSaving(false);
    }
  }

  function handleShare() {
    if (!savedId) return;
    setShowShare(true);
  }

  const shareUrl = savedId ? `${typeof window !== 'undefined' ? window.location.origin : ''}/learn/${savedId}` : '';

  return (
    <div className="lesson-preview">
      <div className={`preview-toolbar${started ? ' preview-toolbar-visible' : ''}`}>
        <div className="preview-title-group">
          {editingTitle ? (
            <div className="preview-title-sizer">
              <span aria-hidden="true">{title || ' '}</span>
              <input
                ref={titleInputRef}
                type="text"
                className="preview-title-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => {
                  if (onTitleUpdate && title.trim()) onTitleUpdate(title.trim());
                  setEditingTitle(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (onTitleUpdate && title.trim()) onTitleUpdate(title.trim());
                    setEditingTitle(false);
                  }
                  if (e.key === 'Escape') {
                    setTitle(lesson.title || 'Untitled Lesson');
                    setEditingTitle(false);
                  }
                }}
                autoFocus
              />
            </div>
          ) : (
            <span
              className="preview-title-text"
              onClick={() => setEditingTitle(true)}
            >
              {title || 'Untitled Lesson'}
            </span>
          )}
          {lesson.blocks.length > 0 && (
            <span className="preview-duration">&middot; {duration} min</span>
          )}
        </div>
        <div className="preview-actions">
          {savedId && (
            <select
              className="preview-visibility-select"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
            >
              <option value="private">{t('preview.private')}</option>
              <option value="unlisted">{t('preview.unlisted')}</option>
              <option value="public">{t('preview.public')}</option>
            </select>
          )}
          {savedId ? (
            <>
              <button
                className="preview-action-icon"
                onClick={handleSave}
                disabled={saving}
                title={saving ? t('preview.saving') : t('preview.update')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/>
                  <polyline points="7 3 7 8 15 8"/>
                </svg>
              </button>
              <button
                className="preview-action-icon"
                onClick={handleShare}
                title={t('share.title')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
              </button>
            </>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? t('preview.saving') : t('preview.save')}
            </button>
          )}
        </div>
      </div>
      <div className="preview-content" ref={contentRef}>
        <LessonRenderer
          blocks={lesson.blocks}
          progressiveDisclosure={false}
          onReorder={onReorder}
          onImageAction={onImageAction}
        />
      </div>
      {showShare && (
        <ShareModal url={shareUrl} onClose={() => setShowShare(false)} />
      )}
    </div>
  );
}
