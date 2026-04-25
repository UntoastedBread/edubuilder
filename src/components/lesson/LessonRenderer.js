'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import BlockRenderer from './BlockRenderer';
import LessonSidebar from './LessonSidebar';
import { useI18n } from '@/lib/I18nContext';

const SCORED_TYPES = new Set(['quiz', 'fill-blank', 'drag-order']);
const SCORE_RING_CIRCUMFERENCE = 283; // 2 * pi * 45

// ===== Drag grip icon =====
function GripIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" opacity="0.4">
      <circle cx="8" cy="4" r="2" />
      <circle cx="16" cy="4" r="2" />
      <circle cx="8" cy="12" r="2" />
      <circle cx="16" cy="12" r="2" />
      <circle cx="8" cy="20" r="2" />
      <circle cx="16" cy="20" r="2" />
    </svg>
  );
}


// ===== Streaming code view (sandbox blocks) =====
function StreamingCodeView({ code, title, index }) {
  const preRef = useRef(null);

  useEffect(() => {
    if (preRef.current) {
      preRef.current.scrollTop = preRef.current.scrollHeight;
    }
  }, [code]);

  return (
    <div className="streaming-code-view">
      <div className="streaming-code-header">
        <span className="preview-block-badge">{index + 1}</span>
        <span className="streaming-code-title">{title || 'sandbox'}</span>
        <span className="streaming-code-lang">HTML</span>
      </div>
      <pre className="streaming-code-pre" ref={preRef}>
        <code>{code}</code>
        <span className="streaming-code-cursor" />
      </pre>
    </div>
  );
}

// ===== Streaming placeholder =====
function StreamingPlaceholder({ index, type }) {
  return (
    <div className="streaming-placeholder">
      <div className="streaming-placeholder-header">
        <span className="preview-block-badge">{index + 1}</span>
        <span className="streaming-placeholder-type">{type} <span className="streaming-placeholder-dot">streaming...</span></span>
      </div>
      <div className="streaming-placeholder-body">
        <div className="skeleton-bar" style={{ width: '70%' }} />
        <div className="skeleton-bar" style={{ width: '90%' }} />
        <div className="skeleton-bar" style={{ width: '50%' }} />
      </div>
    </div>
  );
}

export default function LessonRenderer({ blocks, progressiveDisclosure = false, onReorder, onProgressChange, onBlockChange, onImageAction }) {
  const { t } = useI18n();
  const [activeIndex, setActiveIndex] = useState(0);
  const [slideDir, setSlideDir] = useState('forward');
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const dragItemRef = useRef(null);
  const gripActiveRef = useRef(false);
  const startTimeRef = useRef(Date.now());

  // Report progress changes via effect — cap at blocks.length to avoid > 100%
  useEffect(() => {
    if (onProgressChange) {
      const current = Math.min(activeIndex + 1, blocks.length);
      onProgressChange(current, blocks.length);
    }
  }, [activeIndex, blocks.length]);

  // Report block type changes for contextual header
  useEffect(() => {
    if (onBlockChange && progressiveDisclosure) {
      const isComplete = activeIndex >= blocks.length;
      onBlockChange({
        type: isComplete ? null : blocks[activeIndex]?.type,
        index: activeIndex,
        total: blocks.length,
      });
    }
  }, [activeIndex, blocks.length]);

  // Keyboard: Enter triggers Continue button
  useEffect(() => {
    if (!progressiveDisclosure) return;
    function handleKeyDown(e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const btn = document.querySelector('.lesson-renderer-learn .block-continue');
        if (btn) {
          e.preventDefault();
          btn.click();
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [progressiveDisclosure]);

  // Confetti burst on lesson completion
  useEffect(() => {
    if (progressiveDisclosure && activeIndex >= blocks.length && blocks.length > 0) {
      confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
    }
  }, [activeIndex, blocks.length, progressiveDisclosure]);

  function handleContinue() {
    setSlideDir('forward');
    setActiveIndex((prev) => Math.min(prev + 1, blocks.length));
  }

  function handlePrev() {
    setSlideDir('backward');
    setActiveIndex((prev) => Math.max(prev - 1, 0));
  }

  function handleNavigate(index) {
    if (index < activeIndex) {
      setSlideDir(index < activeIndex ? 'backward' : 'forward');
      setActiveIndex(index);
    }
  }

  const handleScore = useCallback((isCorrect) => {
    setScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));
    if (isCorrect) {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
    }
  }, []);

  // ===== Drag handlers (preview mode) =====
  function handleGripMouseDown() {
    gripActiveRef.current = true;
  }

  function handleDragStart(e, index) {
    if (!gripActiveRef.current) {
      e.preventDefault();
      return;
    }
    gripActiveRef.current = false;
    dragItemRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      const el = e.target.closest('.preview-block-wrapper');
      if (el) el.classList.add('dragging');
    }, 0);
  }

  function handleDragEnd(e) {
    const el = e.target.closest('.preview-block-wrapper');
    if (el) el.classList.remove('dragging');
    dragItemRef.current = null;
    gripActiveRef.current = false;
    setDragOverIndex(null);
  }

  function handleDragOver(e, index) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) setDragOverIndex(index);
  }

  function handleDrop(e, dropIndex) {
    e.preventDefault();
    const dragIndex = dragItemRef.current;
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragOverIndex(null);
      return;
    }

    const newBlocks = [...blocks];
    const [moved] = newBlocks.splice(dragIndex, 1);
    newBlocks.splice(dropIndex, 0, moved);
    onReorder?.(newBlocks);
    setDragOverIndex(null);
    dragItemRef.current = null;
  }

  if (!blocks || blocks.length === 0) {
    return (
      <div className="lesson-empty">
        <p>No lesson content yet. Start chatting to build your lesson!</p>
      </div>
    );
  }

  // Build preview (non-progressive): show all blocks stacked with slide numbers
  if (!progressiveDisclosure) {
    return (
      <div className="lesson-renderer">
        {blocks.map((block, index) => (
          <div
            key={block.id}
            className={`preview-block-wrapper ${dragOverIndex === index ? 'drag-over' : ''} ${block._streaming ? 'streaming' : ''}`}
            draggable={!block._streaming}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
          >
            <div className="preview-block-number">
              <span className="preview-block-badge">{index + 1}</span>
              <span className="preview-block-type">{block.type}</span>
              {!block._streaming && (
                <span className="preview-block-grip" onMouseDown={handleGripMouseDown}>
                  <GripIcon />
                </span>
              )}
            </div>
            {block._streaming && block.type === 'sandbox' && block.data?.html ? (
              <StreamingCodeView code={block.data.html} title={block.data?.title} index={index} />
            ) : block._streaming && (!block.data || Object.keys(block.data).length === 0) ? (
              <StreamingPlaceholder index={index} type={block.type} />
            ) : (
              <BlockRenderer
                key={block._streaming ? `${block.id}-streaming` : block.id}
                block={block}
                isActive={true}
                onImageAction={block._streaming ? undefined : onImageAction}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  // Learn page (progressive): slide-based, one block at a time
  const isComplete = activeIndex >= blocks.length;
  const currentBlock = isComplete ? null : blocks[activeIndex];
  const nextBlock = !isComplete && activeIndex + 1 < blocks.length ? blocks[activeIndex + 1] : null;
  const needsContinue = activeIndex < blocks.length;

  // Build eyebrow text: "04 / 07 · Reading"
  const BLOCK_TYPE_LABELS = {
    reading: 'Reading', quiz: 'Quiz', 'fill-blank': 'Fill in the Blank',
    'drag-order': 'Drag to Order', 'short-answer': 'Short Answer',
    video: 'Video', sandbox: 'Sandbox',
  };

  return (
    <div className="lesson-layout">
      <LessonSidebar
        blocks={blocks}
        activeIndex={activeIndex}
        onNavigate={handleNavigate}
      />
      <div className="lesson-main">
        <div className="lesson-renderer lesson-renderer-learn">
          {!isComplete && (
            <>
              <div className="block-eyebrow">
                {String(activeIndex + 1).padStart(2, '0')} / {String(blocks.length).padStart(2, '0')} &middot; {BLOCK_TYPE_LABELS[currentBlock.type] || currentBlock.type}
              </div>
              <div
                key={currentBlock.id}
                className={slideDir === 'backward' ? 'slide-backward' : 'block-entrance'}
                data-block-type={currentBlock.type}
              >
                <BlockRenderer
                  block={currentBlock}
                  isActive={true}
                  onContinue={needsContinue ? handleContinue : undefined}
                  onScore={SCORED_TYPES.has(currentBlock.type) ? handleScore : undefined}
                />
              </div>

              {/* Next block peek — blurred preview */}
              {nextBlock && (
                <div className="next-block-peek" aria-hidden="true">
                  <BlockRenderer
                    block={nextBlock}
                    isActive={false}
                  />
                </div>
              )}

              {activeIndex > 0 && (
                <button className="btn btn-secondary slide-prev-btn" onClick={handlePrev}>
                  {t('learn.previous')}
                </button>
              )}
            </>
          )}

          {isComplete && (() => {
            const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
            const elapsedMin = Math.max(1, Math.floor(elapsed / 60));

            return (
              <div className="lesson-complete">
                {score.total > 0 && (
                  <div className="complete-ring-container">
                    <svg className="complete-ring" viewBox="0 0 100 100">
                      <circle className="complete-ring-bg" cx="50" cy="50" r="45" />
                      <circle
                        className="complete-ring-fill"
                        cx="50" cy="50" r="45"
                        strokeDasharray={SCORE_RING_CIRCUMFERENCE}
                        strokeDashoffset={SCORE_RING_CIRCUMFERENCE * (1 - score.correct / score.total)}
                      />
                    </svg>
                    <div className="complete-percent">
                      {Math.round((score.correct / score.total) * 100)}%
                    </div>
                  </div>
                )}
                <h2>Lesson <em>complete.</em></h2>
                <p className="complete-sub">{score.total > 0 ? t('learn.complete.scored') : t('learn.complete.unscored')}</p>
                <div className="complete-stats">
                  <div className="complete-stat">
                    <span className="complete-stat-value">{blocks.length}</span>
                    <span className="complete-stat-label">{t('learn.blocks')}</span>
                  </div>
                  {score.total > 0 && (
                    <div className="complete-stat">
                      <span className="complete-stat-value">{score.correct}/{score.total}</span>
                      <span className="complete-stat-label">{t('learn.correct')}</span>
                    </div>
                  )}
                  <div className="complete-stat">
                    <span className="complete-stat-value">{elapsedMin}</span>
                    <span className="complete-stat-label">Minutes</span>
                  </div>
                </div>

                <div className="complete-actions">
                  <button className="btn btn-secondary" onClick={() => { setSlideDir('backward'); setActiveIndex(0); }}>
                    {t('learn.review')}
                  </button>
                  <button className="btn btn-primary" onClick={() => window.location.href = '/build'}>
                    {t('learn.buildOwn')}
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
