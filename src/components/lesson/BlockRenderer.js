'use client';

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

export default function BlockRenderer({ block, onContinue, isActive, onEdit }) {
  const Component = BLOCK_COMPONENTS[block.type];

  if (!Component) {
    return (
      <div className="block block-unknown">
        <p>Unknown block type: {block.type}</p>
      </div>
    );
  }

  return (
    <div
      className={`block-wrapper ${isActive ? 'active' : ''} ${!isActive && onContinue ? 'dimmed' : ''}`}
      data-block-id={block.id}
    >
      {onEdit && (
        <button className="block-edit-btn" onClick={() => onEdit(block)}>
          Edit
        </button>
      )}
      <Component data={block.data} onContinue={isActive ? onContinue : undefined} />
    </div>
  );
}
