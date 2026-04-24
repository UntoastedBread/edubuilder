'use client';

import { useState } from 'react';

const TYPE_LABELS = {
  reading: 'Reading',
  quiz: 'Quiz',
  'short-answer': 'Short Answer',
  'fill-blank': 'Fill in the Blank',
  'drag-order': 'Drag to Order',
  video: 'Video',
  sandbox: 'Interactive',
};

function getBlockLabel(block) {
  const prefix = TYPE_LABELS[block.type] || block.type;
  let detail = '';
  if (block.data?.title) {
    detail = block.data.title;
  } else if (block.data?.question) {
    detail = block.data.question;
  } else if (block.data?.instruction) {
    detail = block.data.instruction;
  } else if (block.data?.content) {
    detail = block.data.content.slice(0, 40).replace(/[#*_\n]/g, '');
  }
  if (detail.length > 30) detail = detail.slice(0, 30) + '...';
  return { prefix, detail };
}

export default function LessonSidebar({ blocks, activeIndex, onNavigate }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`lesson-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <button
        className="sidebar-toggle"
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? '\u25B6' : '\u25C0'}
      </button>
      {!collapsed && (
        <nav className="sidebar-nav">
          <h3 className="sidebar-heading">Lesson Outline</h3>
          <ol className="sidebar-list">
            {blocks.map((block, i) => {
              const { prefix, detail } = getBlockLabel(block);
              const isCurrent = i === activeIndex;
              const isCompleted = i < activeIndex;
              const isFuture = i > activeIndex;
              return (
                <li
                  key={block.id}
                  className={`sidebar-item ${isCurrent ? 'current' : ''} ${isCompleted ? 'completed' : ''} ${isFuture ? 'future' : ''}`}
                >
                  <button
                    className="sidebar-item-btn"
                    onClick={() => onNavigate(i)}
                    disabled={isFuture}
                  >
                    <span className="sidebar-item-icon">
                      {isCompleted ? '✓' : isCurrent ? '▸' : (i + 1)}
                    </span>
                    <span className="sidebar-item-text">
                      <span className="sidebar-item-type">{prefix}</span>
                      {detail && <span className="sidebar-item-detail">{detail}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      )}
    </aside>
  );
}
