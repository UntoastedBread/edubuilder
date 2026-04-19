'use client';

import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import SplitPane from '@/components/ui/SplitPane';
import ChatPanel from '@/components/build/ChatPanel';
import LessonPreview from '@/components/build/LessonPreview';

export default function BuildPage() {
  const [lesson, setLesson] = useState({
    title: 'Untitled Lesson',
    subject: '',
    level: '',
    standard: '',
    blocks: [],
  });

  const handleLessonUpdate = useCallback((operations) => {
    setLesson((prev) => {
      let blocks = [...prev.blocks];

      for (const op of operations) {
        switch (op.action) {
          case 'add': {
            const block = {
              ...op.block,
              id: op.block.id || uuidv4(),
            };
            blocks.push(block);
            break;
          }
          case 'replace': {
            const idx = blocks.findIndex((b) => b.id === op.blockId);
            if (idx !== -1) {
              blocks[idx] = { ...op.block, id: op.blockId };
            }
            break;
          }
          case 'remove': {
            blocks = blocks.filter((b) => b.id !== op.blockId);
            break;
          }
          case 'reorder': {
            const ordered = [];
            for (const id of op.order) {
              const block = blocks.find((b) => b.id === id);
              if (block) ordered.push(block);
            }
            blocks = ordered;
            break;
          }
        }
      }

      return { ...prev, blocks };
    });
  }, []);

  function handleEditBlock(block) {
    console.log('Edit block:', block.id, block.type);
  }

  return (
    <div className="build-page">
      <SplitPane
        defaultSplit={40}
        left={
          <ChatPanel
            onLessonUpdate={handleLessonUpdate}
            lesson={lesson}
          />
        }
        right={
          <LessonPreview
            lesson={lesson}
            onEditBlock={handleEditBlock}
          />
        }
      />
    </div>
  );
}
