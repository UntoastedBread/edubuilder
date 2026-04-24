'use client';

import { useState, useCallback } from 'react';
import ReadingBlock from './ReadingBlock';
import QuizBlock from './QuizBlock';
import ShortAnswerBlock from './ShortAnswerBlock';
import FillBlankBlock from './FillBlankBlock';
import DragOrderBlock from './DragOrderBlock';
import VideoBlock from './VideoBlock';
import SandboxBlock from './SandboxBlock';

const BLOCK_COMPONENTS = {
  reading: ReadingBlock,
  quiz: QuizBlock,
  'short-answer': ShortAnswerBlock,
  'fill-blank': FillBlankBlock,
  'drag-order': DragOrderBlock,
  video: VideoBlock,
  sandbox: SandboxBlock,
};

export default function BlockRenderer({ block, onContinue, isActive, onScore, onImageAction }) {
  const [shaking, setShaking] = useState(false);
  const Component = BLOCK_COMPONENTS[block.type];

  const wrappedOnScore = useCallback((isCorrect) => {
    if (!isCorrect) {
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    }
    if (onScore) onScore(isCorrect);
  }, [onScore]);

  if (!Component) {
    return (
      <div className="block block-unknown">
        <p>Unknown block type: {block.type}</p>
      </div>
    );
  }

  return (
    <div
      className={`block-wrapper ${isActive ? 'active' : ''} ${!isActive && onContinue ? 'dimmed' : ''} ${shaking ? 'block-shake' : ''}`}
      data-block-id={block.id}
    >
      <Component
        data={block.data}
        onContinue={isActive ? onContinue : undefined}
        onScore={onScore ? wrappedOnScore : undefined}
        {...(block.type === 'reading' && onImageAction ? { onImageAction, blockId: block.id } : {})}
      />
    </div>
  );
}
