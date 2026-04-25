'use client';

const TYPE_ICONS = {
  reading: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  quiz: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  'short-answer': (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  ),
  'fill-blank': (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" />
      <line x1="16" y1="3" x2="14" y2="21" />
    </svg>
  ),
  'drag-order': (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  video: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  sandbox: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
};

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function LessonSidebar({ blocks, activeIndex, onNavigate }) {
  const progressPercent = blocks.length > 1
    ? (activeIndex / (blocks.length - 1)) * 100
    : 0;

  return (
    <aside className="lesson-spine" aria-label="Lesson progress">
      {/* Wrap nodes + track in relative container so track is bounded */}
      <div className="spine-nodes-container">
        <div className="spine-track">
          <div
            className="spine-track-fill"
            style={{ height: `${progressPercent}%` }}
          />
        </div>

        {blocks.map((block, i) => {
          const isCurrent = i === activeIndex;
          const isCompleted = i < activeIndex;
          const icon = TYPE_ICONS[block.type] || TYPE_ICONS.reading;

          return (
            <button
              key={block.id}
              className={`spine-node ${isCurrent ? 'spine-node-current' : ''} ${isCompleted ? 'spine-node-completed' : ''} ${!isCurrent && !isCompleted ? 'spine-node-locked' : ''}`}
              onClick={() => isCompleted && onNavigate(i)}
              disabled={!isCompleted && !isCurrent}
              title={block.data?.title || block.data?.question || block.type}
              aria-label={`${isCompleted ? 'Completed' : isCurrent ? 'Current' : 'Locked'}: ${block.data?.title || block.type}`}
            >
              {isCompleted ? <CheckIcon /> : icon}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
