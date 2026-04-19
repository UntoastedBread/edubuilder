'use client';

import { useState, useEffect } from 'react';
import LessonRenderer from '@/components/lesson/LessonRenderer';
import ProgressBar from '@/components/ui/ProgressBar';

export default function LearnPage({ params }) {
  const [lesson, setLesson] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({ current: 1, total: 1 });

  useEffect(() => {
    async function load() {
      const { id } = await params;
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
  }, [params]);

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

  return (
    <div className="learn-page">
      <header className="learn-header">
        <h1 className="learn-title">{lesson.title}</h1>
        {lesson.standard && (
          <span className="learn-standard">{lesson.standard}</span>
        )}
        <ProgressBar current={progress.current} total={progress.total} />
      </header>
      <main className="learn-content">
        <LessonRenderer
          blocks={lesson.blocks}
          progressiveDisclosure={true}
          onProgressChange={(current, total) => setProgress({ current, total })}
        />
      </main>
    </div>
  );
}
