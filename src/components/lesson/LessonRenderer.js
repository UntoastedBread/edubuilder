'use client';

import { useState } from 'react';
import BlockRenderer from './BlockRenderer';

export default function LessonRenderer({ blocks, progressiveDisclosure = false, onEditBlock, onProgressChange }) {
  const [activeIndex, setActiveIndex] = useState(0);

  function handleContinue() {
    setActiveIndex((prev) => {
      const next = Math.min(prev + 1, blocks.length - 1);
      if (onProgressChange) onProgressChange(next + 1, blocks.length);
      return next;
    });
  }

  if (!blocks || blocks.length === 0) {
    return (
      <div className="lesson-empty">
        <p>No lesson content yet. Start chatting to build your lesson!</p>
      </div>
    );
  }

  return (
    <div className="lesson-renderer">
      {blocks.map((block, i) => {
        const isActive = !progressiveDisclosure || i <= activeIndex;
        const isCurrent = progressiveDisclosure && i === activeIndex;
        const needsContinue = progressiveDisclosure && isCurrent && i < blocks.length - 1;

        return (
          <BlockRenderer
            key={block.id}
            block={block}
            isActive={isActive}
            onContinue={needsContinue ? handleContinue : undefined}
            onEdit={onEditBlock}
          />
        );
      })}
      {progressiveDisclosure && activeIndex >= blocks.length - 1 && blocks.length > 0 && (
        <div className="lesson-complete">
          <h2>Lesson Complete!</h2>
          <p>Great work finishing this lesson.</p>
        </div>
      )}
    </div>
  );
}
