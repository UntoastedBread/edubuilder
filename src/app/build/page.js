'use client';

import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import SplitPane from '@/components/ui/SplitPane';
import ChatPanel from '@/components/build/ChatPanel';
import LessonPreview from '@/components/build/LessonPreview';
import AppRail from '@/components/AppRail';
import { useMode } from '@/lib/ModeContext';


export default function BuildPage() {
  const { mode } = useMode();
  const [lesson, setLesson] = useState({
    title: 'Untitled Lesson',
    subject: '',
    level: '',
    standard: '',
    curriculumRef: '',
    audience: mode,
    tags: [],
    difficulty: '',
    visibility: 'private',
    blocks: [],
  });
  const [started, setStarted] = useState(false);
  const [split, setSplit] = useState(100);
  const pendingOpsRef = useRef(null);
  const chatSendRef = useRef(null);

  const handleStarted = useCallback(() => {
    setStarted(true);
    setSplit(40);
  }, []);

  const handleLessonUpdate = useCallback((operations) => {
    // Handle special _clear_streaming action
    const hasClearStreaming = operations.some(op => op.action === '_clear_streaming');
    if (hasClearStreaming) {
      setLesson((prev) => ({
        ...prev,
        blocks: prev.blocks.map(b => {
          if (b._streaming) {
            const { _streaming, ...rest } = b;
            return rest;
          }
          return b;
        }),
      }));
      operations = operations.filter(op => op.action !== '_clear_streaming');
      if (operations.length === 0) return;
    }

    // Handle _finalize_block action — clear _streaming flag and set final data for a completed block
    const finalizeOps = operations.filter(op => op.action === '_finalize_block');
    if (finalizeOps.length > 0) {
      setLesson((prev) => {
        let blocks = [...prev.blocks];
        for (const op of finalizeOps) {
          const idx = blocks.findIndex(b => b.id === op.blockId);
          if (idx !== -1) {
            const { _streaming, ...rest } = blocks[idx];
            blocks[idx] = { ...rest, type: op.block.type, data: op.block.data };
          }
        }
        return { ...prev, blocks };
      });
      operations = operations.filter(op => op.action !== '_finalize_block');
      if (operations.length === 0) return;
    }

    // Handle _set_streaming_block action — creates block if missing, updates type/data if exists
    const setBlockOps = operations.filter(op => op.action === '_set_streaming_block');
    if (setBlockOps.length > 0) {
      setLesson((prev) => {
        let blocks = [...prev.blocks];
        for (const op of setBlockOps) {
          const idx = blocks.findIndex(b => b.id === op.blockId);
          if (idx !== -1) {
            blocks[idx] = { ...blocks[idx], type: op.block.type, data: op.block.data };
          } else {
            blocks.push({
              id: op.blockId,
              type: op.block.type || 'reading',
              _streaming: true,
              data: op.block.data || {},
            });
          }
        }
        return { ...prev, blocks };
      });
      operations = operations.filter(op => op.action !== '_set_streaming_block');
      if (operations.length === 0) return;
    }

    // Split add operations to stagger them in visually
    const addOps = operations.filter(op => op.action === 'add');
    const otherOps = operations.filter(op => op.action !== 'add');

    // Apply non-add operations immediately
    if (otherOps.length > 0) {
      setLesson((prev) => {
        let blocks = [...prev.blocks];
        for (const op of otherOps) {
          switch (op.action) {
            case 'replace': {
              const idx = blocks.findIndex((b) => b.id === op.blockId);
              if (idx !== -1) blocks[idx] = { ...op.block, id: op.blockId };
              break;
            }
            case 'edit': {
              const idx = blocks.findIndex((b) => b.id === op.blockId);
              if (idx !== -1) {
                const block = blocks[idx];
                if (op.data) {
                  blocks[idx] = { ...block, data: { ...block.data, ...op.data } };
                } else if (op.field && op.find != null && op.replace_with != null) {
                  const current = block.data?.[op.field];
                  if (typeof current === 'string') {
                    blocks[idx] = { ...block, data: { ...block.data, [op.field]: current.replace(op.find, op.replace_with) } };
                  }
                }
              }
              break;
            }
            case 'remove':
              blocks = blocks.filter((b) => b.id !== op.blockId);
              break;
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
    }

    // Clear any pending stagger from a previous call
    if (pendingOpsRef.current) {
      clearTimeout(pendingOpsRef.current);
      pendingOpsRef.current = null;
    }

    // Stagger add operations with 150ms delay each
    addOps.forEach((op, i) => {
      const delay = i * 150;
      const timer = setTimeout(() => {
        setLesson((prev) => {
          const block = { ...op.block, id: op.block.id || uuidv4() };
          return { ...prev, blocks: [...prev.blocks, block] };
        });
      }, delay);
      if (i === addOps.length - 1) {
        pendingOpsRef.current = timer;
      }
    });
  }, []);

  const handleTitleUpdate = useCallback((title) => {
    setLesson((prev) => ({ ...prev, title }));
  }, []);

  const handleReorder = useCallback((newBlocks) => {
    setLesson((prev) => ({ ...prev, blocks: newBlocks }));
  }, []);

  const handleImageAction = useCallback((blockId, action) => {
    if (action === 'delete') {
      // Replace block with version without image
      setLesson((prev) => {
        const block = prev.blocks.find(b => b.id === blockId);
        if (!block || block.type !== 'reading') return prev;
        const { image, imagePosition, imageConfidence, imageDescription, ...rest } = block.data;
        return {
          ...prev,
          blocks: prev.blocks.map(b =>
            b.id === blockId ? { ...b, data: rest } : b
          ),
        };
      });
    } else if (action === 'retry') {
      // Delete image and send retry message via chat
      setLesson((prev) => {
        const block = prev.blocks.find(b => b.id === blockId);
        if (!block || block.type !== 'reading') return prev;
        const title = block.data.title || 'Untitled block';
        const { image, imagePosition, imageConfidence, imageDescription, ...rest } = block.data;
        // Queue the send after state update
        setTimeout(() => {
          if (chatSendRef.current) {
            chatSendRef.current(`Regenerate the image for the block titled "${title}"`);
          }
        }, 100);
        return {
          ...prev,
          blocks: prev.blocks.map(b =>
            b.id === blockId ? { ...b, data: rest } : b
          ),
        };
      });
    }
  }, []);

  return (
    <div className="build-page">
      <AppRail forceClose={started} />
      <SplitPane
        split={split}
        onSplitChange={setSplit}
        left={
          <ChatPanel
            onLessonUpdate={handleLessonUpdate}
            onTitleUpdate={handleTitleUpdate}
            lesson={lesson}
            sendRef={chatSendRef}
            expanded={!started}
            onStarted={handleStarted}
          />
        }
        right={
          <LessonPreview
            lesson={lesson}
            started={started}
            onTitleUpdate={handleTitleUpdate}
            onReorder={handleReorder}
            onImageAction={handleImageAction}
          />
        }
      />
    </div>
  );
}
