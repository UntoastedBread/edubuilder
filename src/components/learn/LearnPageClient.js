'use client';

import { useState, useEffect } from 'react';
import LessonRenderer from '@/components/lesson/LessonRenderer';

const BLOCK_TYPE_LABELS = {
  reading: 'Reading',
  quiz: 'Quiz',
  'fill-blank': 'Fill in the Blank',
  'drag-order': 'Drag to Order',
  'short-answer': 'Short Answer',
  video: 'Video',
  sandbox: 'Sandbox',
};

export default function LearnPageClient({ id }) {
  const [lesson, setLesson] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({ current: 1, total: 1 });
  const [blockInfo, setBlockInfo] = useState({ type: null, index: 0, total: 0 });

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/lessons/${id}`);
      if (!res.ok) {
        setError('Lesson not found');
        setLoading(false);
        return;
      }
      const data = await res.json();
      setLesson(data);
      setProgress({ current: 1, total: data.blocks.length });
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="learn-page">
        <div className="learn-loading">Loading lesson...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="learn-page">
        <div className="learn-error">{error}</div>
      </div>
    );
  }

  const percent = progress.total > 0
    ? Math.min(Math.round((progress.current / progress.total) * 100), 100)
    : 0;

  const isComplete = blockInfo.type === null && blockInfo.index > 0;

  return (
    <div className="learn-page">
      <header className="learn-header">
        <div className="learn-header-top">
          <button
            className="learn-back-btn"
            onClick={() => window.history.back()}
            aria-label="Go back"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="learn-title">{lesson.title}</h1>
          {(lesson.curriculumRef || lesson.standard) && (
            <span className="learn-standard">{lesson.curriculumRef || lesson.standard}</span>
          )}
          {blockInfo.type && (
            <span className="learn-block-badge" data-block-type={blockInfo.type}>
              {BLOCK_TYPE_LABELS[blockInfo.type] || blockInfo.type}
            </span>
          )}
          {isComplete && (
            <span className="learn-block-badge" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
              Complete
            </span>
          )}
          <span className="learn-step-counter">
            {Math.min(blockInfo.index + 1, progress.total)} / {progress.total}
          </span>
          <span className="learn-branding">
            <span className="learn-branding-glyph">E</span>
            <span className="learn-branding-text">EduBuilder</span>
          </span>
        </div>
        <div className="learn-progress-strip">
          <div className="learn-progress-fill" style={{ width: `${percent}%` }} />
        </div>
      </header>
      <main className="learn-content">
        <LessonRenderer
          blocks={lesson.blocks}
          progressiveDisclosure={true}
          onProgressChange={(current, total) => setProgress({ current, total })}
          onBlockChange={(info) => setBlockInfo(info)}
        />
      </main>
    </div>
  );
}
