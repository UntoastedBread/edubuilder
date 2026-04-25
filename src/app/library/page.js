'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppRail from '@/components/AppRail';
import { useMode } from '@/lib/ModeContext';
import { useI18n } from '@/lib/I18nContext';

const BLOCK_TYPE_COLORS = {
  reading: 'var(--block-reading)',
  quiz: 'var(--block-quiz)',
  'fill-blank': 'var(--block-fill-blank)',
  'drag-order': 'var(--block-drag-order)',
  'short-answer': 'var(--block-short-answer)',
  video: 'var(--block-video)',
  sandbox: 'var(--block-sandbox)',
};

function timeAgo(dateStr, locale) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const localeTag = locale === 'en' ? 'en-US' : locale;
  return new Date(dateStr).toLocaleDateString(localeTag, { day: 'numeric', month: 'short' });
}

export default function LibraryPage() {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { mode } = useMode();
  const { t, locale } = useI18n();
  const modeKey = mode === 'teacher' ? 'teacher' : 'learner';

  useEffect(() => {
    fetch('/api/lessons')
      .then((r) => r.json())
      .then((data) => {
        setLessons(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="library-page">
      <AppRail />
      <main className="library-main">
        <header className="library-header">
          <div>
            <h1 className="library-title">{t(`library.title.${modeKey}`)}</h1>
            <p className="library-subtitle">
              {t('library.subtitle', { count: lessons.length, plural: lessons.length !== 1 ? 's' : '' })}
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => router.push('/build')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {t('library.new')}
          </button>
        </header>

        {loading ? (
          <div className="library-loading">
            <span className="dot-pulse" />
            <span>{t('library.loading')}</span>
          </div>
        ) : lessons.length === 0 ? (
          <div className="library-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            <p>{t('library.empty')}</p>
            <p className="text-muted">{t(`library.empty.sub.${modeKey}`)}</p>
          </div>
        ) : (
          <div className="library-grid">
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
                  <span className="library-card-time">{timeAgo(lesson.updatedAt, locale)}</span>
                </div>
                {lesson.blockCount > 0 && (
                  <div className="library-card-blocks">
                    {lesson.blockTypes?.map((type, j) => (
                      <span
                        key={j}
                        className="library-card-block-bar"
                        style={{ background: BLOCK_TYPE_COLORS[type] || 'var(--muted)' }}
                      />
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
