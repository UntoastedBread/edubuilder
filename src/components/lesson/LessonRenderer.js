'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import BlockRenderer from './BlockRenderer';
import LessonSidebar from './LessonSidebar';

const SCORED_TYPES = new Set(['quiz', 'fill-blank', 'drag-order']);

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
    // Auto-scroll to bottom as code streams in
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
        <svg className="streaming-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
        <span>Building this block...</span>
      </div>
    </div>
  );
}

export default function LessonRenderer({ blocks, progressiveDisclosure = false, onReorder, onProgressChange, onImageAction }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [slideDir, setSlideDir] = useState('forward');
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [scoreChanged, setScoreChanged] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const dragItemRef = useRef(null);
  const gripActiveRef = useRef(false);

  // Report progress changes via effect — cap at blocks.length to avoid > 100%
  useEffect(() => {
    if (onProgressChange) {
      const current = Math.min(activeIndex + 1, blocks.length);
      onProgressChange(current, blocks.length);
    }
  }, [activeIndex, blocks.length]);

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
    setScoreChanged(true);
    setTimeout(() => setScoreChanged(false), 400);
    if (isCorrect) {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
    }
  }, []);

  // ===== Drag handlers (preview mode) =====
  function handleGripMouseDown() {
    gripActiveRef.current = true;
  }

  function handleDragStart(e, index) {
    // Only allow drag if it started from the grip icon
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
  const needsContinue = activeIndex < blocks.length;

  return (
    <div className="lesson-layout">
      <LessonSidebar
        blocks={blocks}
        activeIndex={activeIndex}
        onNavigate={handleNavigate}
      />
      <div className="lesson-main">
        <div className="lesson-renderer lesson-renderer-learn">
          {/* Score ticker */}
          {score.total > 0 && (
            <div className={`score-ticker ${scoreChanged ? 'score-bounce' : ''}`}>
              <span className="score-star">&#11088;</span> {score.correct}/{score.total}
            </div>
          )}

          {!isComplete && (
            <>
              <div className="slide-nav">
                <span className="slide-counter">
                  {activeIndex + 1} / {blocks.length}
                </span>
              </div>

              <div key={currentBlock.id} className={`slide-${slideDir}`}>
                <BlockRenderer
                  block={currentBlock}
                  isActive={true}
                  onContinue={needsContinue ? handleContinue : undefined}
                  onScore={SCORED_TYPES.has(currentBlock.type) ? handleScore : undefined}
                />
              </div>

              {activeIndex > 0 && (
                <button className="btn btn-secondary slide-prev-btn" onClick={handlePrev}>
                  Previous
                </button>
              )}
            </>
          )}

          {isComplete && (
            <div className="lesson-complete">
              <h2>Lesson Complete!</h2>
              {score.total > 0 ? (
                <p className="lesson-score">You scored {score.correct}/{score.total}</p>
              ) : (
                <p>Great work finishing this lesson.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
