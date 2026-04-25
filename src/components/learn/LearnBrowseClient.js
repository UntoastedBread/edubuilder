'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const BLOCK_TYPE_COLORS = {
  reading: 'var(--block-reading)',
  quiz: 'var(--block-quiz)',
  'fill-blank': 'var(--block-fill-blank)',
  'drag-order': 'var(--block-drag-order)',
  'short-answer': 'var(--block-short-answer)',
  video: 'var(--block-video)',
  sandbox: 'var(--block-sandbox)',
};

export default function LearnBrowseClient({ lessons }) {
  const router = useRouter();

  if (lessons.length === 0) {
    return (
      <div className="learn-browse-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
        <p>No public lessons available yet</p>
        <p className="text-muted">Check back later or create your own!</p>
        <button className="btn btn-primary" onClick={() => router.push('/build')}>
          Build a Lesson
        </button>
      </div>
    );
  }

  return (
    <div className="learn-browse-grid">
      {lessons.map((lesson, i) => (
        <button
          key={lesson.id}
          className="library-card"
          onClick={() => router.push(`/learn/${lesson.id}`)}
          style={{ animationDelay: `${i * 0.04}s` }}
        >
          <div className="library-card-top">
            <h3 className="library-card-title">{lesson.title}</h3>
            {lesson.subject && (
              <span className="library-card-subject">{lesson.subject}</span>
            )}
          </div>
          <div className="library-card-meta">
            {lesson.level && <span className="library-card-level">{lesson.level}</span>}
            {lesson.duration > 0 && <span>{lesson.duration} min</span>}
            <span>{lesson.blockCount} blocks</span>
          </div>
          {lesson.blockCount > 0 && (
            <div className="library-card-blocks">
              {lesson.blockTypes?.map((type, j) => (
                <span
                  key={j}
                  className="library-card-block-dot"
                  style={{ background: BLOCK_TYPE_COLORS[type] || 'var(--text-muted)' }}
                />
              ))}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
