'use client';

import { useState, useRef, useCallback } from 'react';

export default function SplitPane({ left, right, defaultSplit = 40 }) {
  const [splitPercent, setSplitPercent] = useState(defaultSplit);
  const containerRef = useRef(null);
  const draggingRef = useRef(false);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    draggingRef.current = true;

    function handleMouseMove(e) {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const percent = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPercent(Math.min(Math.max(percent, 20), 80));
    }

    function handleMouseUp() {
      draggingRef.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  return (
    <div className="split-pane" ref={containerRef}>
      <div className="split-pane-left" style={{ width: `${splitPercent}%` }}>
        {left}
      </div>
      <div className="split-pane-divider" onMouseDown={handleMouseDown} />
      <div
        className="split-pane-right"
        style={{ width: `${100 - splitPercent}%` }}
      >
        {right}
      </div>
    </div>
  );
}
