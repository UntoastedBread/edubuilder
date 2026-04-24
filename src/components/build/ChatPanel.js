'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

function ImageReview({ images, onAction }) {
  return (
    <div className="image-review">
      <p className="image-review-header">
        I&apos;m better at words than diagrams &mdash; could you check these for me?
      </p>
      <div className="image-review-cards">
        {images.map((img) => (
          <div key={img.blockId} className={`image-review-card ${img.status !== 'pending' ? 'image-review-card-resolved' : ''}`}>
            <div className="image-review-preview">
              <img src={img.image} alt={img.description || img.title} />
            </div>
            <div className="image-review-info">
              <span className="image-review-title">{img.title}</span>
              {img.description && <span className="image-review-desc">{img.description}</span>}
            </div>
            {img.status === 'pending' ? (
              <div className="image-review-actions">
                <button className="btn btn-sm btn-secondary" onClick={() => onAction(img.blockId, 'discard')}>Discard</button>
                <button className="btn btn-sm btn-secondary" onClick={() => onAction(img.blockId, 'retry')}>Retry</button>
                <button className="btn btn-sm btn-primary" onClick={() => onAction(img.blockId, 'use')}>Use</button>
              </div>
            ) : (
              <div className="image-review-resolved">
                {img.status === 'accepted' && <span className="image-review-badge image-review-badge-accepted">Kept</span>}
                {img.status === 'discarded' && <span className="image-review-badge image-review-badge-discarded">Discarded</span>}
                {img.status === 'retrying' && <span className="image-review-badge image-review-badge-retrying">Retrying...</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusTimer({ done }) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    if (done) return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [done]);

  if (elapsed < 1) return null;
  return <span className="status-timer">{elapsed}s</span>;
}

function StatusMessage({ message, onScrollToBlock }) {
  const [expanded, setExpanded] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const isDone = message.done;
  const isInterrupted = message.interrupted;
  const hasBlocks = isDone && message.type === 'build' && message.blocks && message.blocks.length > 0;

  return (
    <div className={`status-pill ${isInterrupted ? 'status-done' : isDone ? 'status-done' : 'status-active'}`}>
      <span className={isInterrupted ? 'status-interrupted' : isDone ? 'status-check' : 'status-dot'} />
      <span key={message.content} className={!isDone && !isInterrupted ? 'status-text-animated' : undefined}>
        {message.content}
      </span>
      <StatusTimer done={isDone || isInterrupted} />
      {/* DEBUG: toggle raw status data */}
      <button
        onClick={() => setShowDebug(!showDebug)}
        style={{ marginLeft: 4, fontSize: 9, opacity: 0.4, cursor: 'pointer', background: 'none', border: '1px solid currentColor', borderRadius: 3, padding: '0 3px', lineHeight: '14px' }}
      >
        dbg
      </button>
      {hasBlocks && (
        <button
          className="status-expand-btn"
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}
      {showDebug && (
        <div style={{ width: '100%', marginTop: 4, padding: '6px 8px', background: '#f1f5f9', borderRadius: 6, fontSize: 11, fontFamily: 'var(--font-mono)', lineHeight: 1.5, color: '#475569', wordBreak: 'break-all' }}>
          <div><strong>type:</strong> {message.type}</div>
          <div><strong>content:</strong> {message.content}</div>
          <div><strong>done:</strong> {String(!!message.done)}</div>
          <div><strong>interrupted:</strong> {String(!!message.interrupted)}</div>
          <div><strong>statusQueue:</strong> {message.statusQueue ? JSON.stringify(message.statusQueue) : 'null'}</div>
          <div><strong>statusIndex:</strong> {message.statusIndex ?? 'null'}</div>
          <div><strong>partialCount:</strong> {message.partialCount ?? 'null'}</div>
          <div><strong>blocks:</strong> {message.blocks ? message.blocks.length : 'null'}</div>
          <hr style={{ border: 'none', borderTop: '1px solid #cbd5e1', margin: '4px 0' }} />
          <div><strong>inputChars:</strong> {message._dbgChars ?? '—'}</div>
          <div><strong>statusFound:</strong> {message._dbgHasStatus != null ? String(message._dbgHasStatus) : '—'}</div>
          <div style={{ opacity: 0.7 }}><strong>snippet:</strong> {message._dbgSnippet ?? '—'}</div>
        </div>
      )}
      {expanded && hasBlocks && (
        <div className="status-block-list">
          {message.blocks.map((b, i) => (
            <button
              key={b.id || i}
              className="status-block-item"
              onClick={() => onScrollToBlock?.(b.id)}
            >
              <span className="status-block-num">{i + 1}</span>
              <span className="status-block-title">{b.title || b.type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChatPanel({ onLessonUpdate, onTitleUpdate, lesson, sendRef, expanded, onStarted }) {
  const startedRef = useRef(false);
  const [welcomeLayout, setWelcomeLayout] = useState(true);
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const messagesEndRef = useRef(null);
  const abortRef = useRef(null);
  const partialBlockIdsRef = useRef(new Set());
  const retryQueueRef = useRef([]);
  const hadToolCallsRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  function scrollToBlock(blockId) {
    const el = document.querySelector(`[data-block-id="${blockId}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  const handleSend = useCallback(async function handleSend(text) {
    if (!startedRef.current && onStarted) {
      startedRef.current = true;
      onStarted();
      // Delay layout class removal by one frame so the browser paints the
      // "from" state and CSS transitions animate smoothly
      requestAnimationFrame(() => setWelcomeLayout(false));
    }

    const userMessage = { role: 'user', content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setStreaming(true);
    setStreamingText('');
    partialBlockIdsRef.current = new Set();

    // Collect low-confidence images across all tool_calls in this stream
    const lowConfidenceImages = [];
    hadToolCallsRef.current = false;
    let planningPillInserted = false;

    try {
      const abortController = new AbortController();
      abortRef.current = abortController;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map((m) => ({ role: m.role, content: m.content })),
          lesson,
        }),
        signal: abortController.signal,
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let eventType = null;

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7);
          } else if (line.startsWith('data: ') && eventType) {
            const data = JSON.parse(line.slice(6));

            if (eventType === 'text') {
              fullText += data.content;
              setStreamingText(fullText);
              if (!planningPillInserted && !hadToolCallsRef.current && (!lesson.blocks || lesson.blocks.length === 0)) {
                planningPillInserted = true;
                setMessages((prev) => [
                  ...prev,
                  { role: 'status', type: 'plan', content: 'Planning...', done: false },
                ]);
              }
            } else if (eventType === 'tool_start') {
              const isFirstTool = !hadToolCallsRef.current;
              hadToolCallsRef.current = true;
              if (fullText.trim().length > 1) {
                const savedText = fullText;
                const isPlan = isFirstTool && (!lesson.blocks || lesson.blocks.length === 0);
                if (isPlan) {
                  // Mark planning pill as done, store plan text as hidden message
                  setMessages((prev) => {
                    const updated = [...prev];
                    for (let i = updated.length - 1; i >= 0; i--) {
                      if (updated[i].role === 'status' && updated[i].type === 'plan' && !updated[i].done) {
                        updated[i] = { ...updated[i], done: true, content: 'Planned' };
                        break;
                      }
                    }
                    updated.push({ role: 'assistant', content: savedText, isPlan: true });
                    return updated;
                  });
                } else {
                  setMessages((prev) => [
                    ...prev,
                    { role: 'assistant', content: savedText },
                  ]);
                }
              }
              fullText = '';
              setStreamingText('');

              let statusContent = '';
              let statusType = 'build';
              if (data.name === 'web_search') {
                statusContent = 'Searching...';
                statusType = 'search';
              } else if (data.name === 'update_lesson') {
                statusContent = 'Updating lesson...';
                statusType = 'build';
              } else if (data.name === 'review_lesson') {
                statusContent = 'Reviewing lesson...';
                statusType = 'review';
              }
              if (statusContent) {
                setMessages((prev) => [
                  ...prev,
                  { role: 'status', type: statusType, content: statusContent, done: false },
                ]);
              }
            } else if (eventType === 'tool_status') {
              // Update the most recent active status pill with the real message
              const statusMessages = Array.isArray(data.message) ? data.message : [data.message];
              setMessages((prev) => {
                const updated = [...prev];
                for (let i = updated.length - 1; i >= 0; i--) {
                  if (updated[i].role === 'status' && !updated[i].done) {
                    const msg = updated[i];
                    if (msg.type === 'search') {
                      updated[i] = { ...msg, content: `Searching: ${statusMessages[0]}` };
                    } else if (msg.type === 'build') {
                      // Jump to the right index if partials already arrived before status
                      const idx = Math.min(msg.partialCount || 0, statusMessages.length - 1);
                      updated[i] = {
                        ...msg,
                        content: `${statusMessages[idx]}...`,
                        statusQueue: statusMessages,
                        statusIndex: idx,
                      };
                    }
                    break;
                  }
                }
                return updated;
              });
            } else if (eventType === 'tool_progress') {
              // Debug: update the active build pill with streaming progress info
              setMessages((prev) => {
                const updated = [...prev];
                for (let i = updated.length - 1; i >= 0; i--) {
                  if (updated[i].role === 'status' && !updated[i].done && updated[i].type === 'build') {
                    updated[i] = {
                      ...updated[i],
                      _dbgChars: data.chars,
                      _dbgHasStatus: data.hasStatus,
                      _dbgSnippet: data.snippet,
                    };
                    break;
                  }
                }
                return updated;
              });
            } else if (eventType === 'block_content_delta') {
              const { blockId, block, isFirst } = data;
              if (isFirst) {
                partialBlockIdsRef.current.add(blockId);
              }
              onLessonUpdate([{ action: '_set_streaming_block', blockId, block }]);
            } else if (eventType === 'tool_block_partial') {
              // A complete block extracted from the tool input
              const block = data.block;
              if (block && block.id) {
                if (partialBlockIdsRef.current.has(block.id)) {
                  // Block already exists (from content streaming) — update its data in place
                  onLessonUpdate([{ action: '_set_streaming_block', blockId: block.id, block: { type: block.type, data: block.data } }]);
                } else {
                  block._streaming = true;
                  partialBlockIdsRef.current.add(block.id);
                  onLessonUpdate([{ action: 'add', block }]);
                }
                // Advance status pill to next queue item (or count if queue hasn't arrived yet)
                setMessages((prev) => {
                  const updated = [...prev];
                  for (let i = updated.length - 1; i >= 0; i--) {
                    if (updated[i].role === 'status' && !updated[i].done && updated[i].type === 'build') {
                      const msg = updated[i];
                      if (msg.statusQueue) {
                        const nextIndex = (msg.statusIndex || 0) + 1;
                        if (nextIndex < msg.statusQueue.length) {
                          updated[i] = {
                            ...msg,
                            content: `${msg.statusQueue[nextIndex]}...`,
                            statusIndex: nextIndex,
                            partialCount: (msg.partialCount || 0) + 1,
                          };
                        }
                      } else {
                        // Queue hasn't arrived yet — just count partials
                        updated[i] = { ...msg, partialCount: (msg.partialCount || 0) + 1 };
                      }
                      break;
                    }
                  }
                  return updated;
                });
              }
            } else if (eventType === 'tool_call') {
              if (data.name === 'update_lesson') {
                // Handle title from tool call
                if (data.input.title && onTitleUpdate) {
                  onTitleUpdate(data.input.title);
                }

                const ops = data.input.operations;
                const streamedIds = partialBlockIdsRef.current;

                // Filter out add ops whose blocks were already streamed as partials
                const finalOps = ops.filter(op => {
                  if (op.action === 'add' && op.block && streamedIds.has(op.block.id)) {
                    return false; // skip — already added via partial streaming
                  }
                  return true;
                });

                // Clear streaming flag on already-added blocks
                if (streamedIds.size > 0) {
                  onLessonUpdate([{ action: '_clear_streaming' }]);
                }

                if (finalOps.length > 0) {
                  onLessonUpdate(finalOps);
                }
                partialBlockIdsRef.current = new Set();

                // Attach block list for status dropdown
                const addedBlocks = ops
                  .filter(op => op.action === 'add' && op.block)
                  .map(op => ({
                    id: op.block.id,
                    type: op.block.type,
                    title: op.block.data?.title || op.block.data?.question?.slice(0, 40) || op.block.type,
                  }));

                if (addedBlocks.length > 0) {
                  setMessages((prev) => {
                    const updated = [...prev];
                    for (let i = updated.length - 1; i >= 0; i--) {
                      if (updated[i].role === 'status' && !updated[i].done && updated[i].type === 'build') {
                        updated[i] = { ...updated[i], blocks: addedBlocks };
                        break;
                      }
                    }
                    return updated;
                  });
                }

                // Collect low-confidence images from this tool call
                for (const op of ops) {
                  if (
                    (op.action === 'add' || op.action === 'replace') &&
                    op.block?.type === 'reading' &&
                    op.block?.data?.image &&
                    op.block?.data?.imageConfidence === 'low'
                  ) {
                    const blockId = op.block.id || op.blockId;
                    lowConfidenceImages.push({
                      blockId,
                      title: op.block.data.title || 'Untitled block',
                      image: op.block.data.image,
                      description: op.block.data.imageDescription || '',
                      status: 'pending',
                    });
                  }
                }
              }
            } else if (eventType === 'tool_result') {
              const doneType = data.name === 'web_search' ? 'search' : data.name === 'update_lesson' ? 'build' : data.name === 'review_lesson' ? 'review' : null;
              if (doneType) {
                setMessages((prev) => {
                  const updated = [...prev];
                  // Mark all active status pills of this type as done (may be multiple from array status)
                  for (let i = updated.length - 1; i >= 0; i--) {
                    if (updated[i].role === 'status' && !updated[i].done && updated[i].type === doneType) {
                      const msg = updated[i];
                      let doneContent = msg.content;
                      if (msg.type === 'search') {
                        doneContent = msg.content.replace('Searching', 'Searched');
                      } else if (msg.type === 'review') {
                        doneContent = msg.content.replace('Reviewing', 'Reviewed').replace(/\.{3}$/, '');
                      } else if (msg.type === 'build') {
                        // Convert "Verbing..." -> "Verbed" by replacing the trailing "ing" of the first word
                        doneContent = msg.content.replace(/^(\w+?)ing\b/, (_, root) => root + 'ed');
                        doneContent = doneContent.replace(/\.{3}$/, '');
                      }
                      updated[i] = { ...msg, done: true, content: doneContent };
                    }
                  }
                  return updated;
                });
              }
            } else if (eventType === 'text_break') {
              if (fullText.trim().length > 1) {
                const savedText = fullText;
                setMessages((prev) => [
                  ...prev,
                  { role: 'assistant', content: savedText },
                ]);
              }
              fullText = '';
              setStreamingText('');
            } else if (eventType === 'error') {
              console.error('Stream error:', data.message);
            }

            eventType = null;
          }
        }
      }

      // If planning pill was inserted but no tools were called,
      // it was a clarifying question — remove the pill
      if (planningPillInserted && !hadToolCallsRef.current) {
        setMessages((prev) => prev.filter((m) => !(m.role === 'status' && m.type === 'plan')));
      }

      if (fullText.trim().length > 1) {
        const savedText = fullText;
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: savedText },
        ]);
      }

      // Insert image review message if any low-confidence images were collected
      if (lowConfidenceImages.length > 0) {
        setMessages((prev) => [
          ...prev,
          { role: 'image_review', images: lowConfidenceImages },
        ]);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        // Mark all active status pills as interrupted and add "Interrupted" indicator
        setMessages((prev) => {
          const updated = prev.map((m) => {
            if (m.role === 'status' && !m.done) {
              return { ...m, interrupted: true };
            }
            return m;
          });
          updated.push({ role: 'interrupted' });
          return updated;
        });
      } else {
        console.error('Chat error:', err);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
        ]);
      }
    } finally {
      setStreaming(false);
      setStreamingText('');
      abortRef.current = null;

      // Drain the retry queue
      const queue = retryQueueRef.current;
      retryQueueRef.current = [];
      if (queue.length > 0) {
        // Small delay to allow state to settle, then send first retry
        setTimeout(() => handleSend(queue[0]), 300);
      }
    }
  }, [messages, lesson, onLessonUpdate, onTitleUpdate, onStarted]);

  // Expose handleSend to parent via sendRef
  useEffect(() => {
    if (sendRef) {
      sendRef.current = handleSend;
    }
  }, [sendRef, handleSend]);

  function handleImageReviewAction(blockId, action) {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.role !== 'image_review') return msg;
        return {
          ...msg,
          images: msg.images.map((img) => {
            if (img.blockId !== blockId) return img;
            if (action === 'use') {
              return { ...img, status: 'accepted' };
            }
            if (action === 'discard') {
              // Remove image from the block in the lesson
              const block = lesson.blocks.find(b => b.id === blockId);
              if (block) {
                const { image, imagePosition, imageConfidence, imageDescription, ...rest } = block.data;
                onLessonUpdate([{
                  action: 'replace',
                  blockId,
                  block: { type: 'reading', data: rest },
                }]);
              }
              return { ...img, status: 'discarded' };
            }
            if (action === 'retry') {
              // Remove image from block
              const block = lesson.blocks.find(b => b.id === blockId);
              if (block) {
                const { image, imagePosition, imageConfidence, imageDescription, ...rest } = block.data;
                onLessonUpdate([{
                  action: 'replace',
                  blockId,
                  block: { type: 'reading', data: rest },
                }]);
              }
              // Queue a retry message
              retryQueueRef.current.push(`Regenerate the image for the block titled "${img.title}"`);
              return { ...img, status: 'retrying' };
            }
            return img;
          }),
        };
      })
    );
  }

  const hasActiveStatus = messages.some((m) => m.role === 'status' && !m.done);

  const suggestedPrompts = [
    'Teach photosynthesis to 8th graders',
    'A-level Chemistry: organic reactions',
    'Introduction to fractions for Year 4',
    'High school history: causes of WWI',
  ];

  return (
    <div className={`chat-panel${welcomeLayout ? ' chat-panel-welcome' : ''}`}>
      <div className="chat-welcome-spacer" />
      <div className="chat-messages">
        {messages.length === 0 && !streaming && (
          <div className="chat-welcome">
            <h3>What would you like to teach?</h3>
            <p className="text-muted">Describe a topic, level, and any specifics &mdash; I&apos;ll build the lesson.</p>
          </div>
        )}
        {messages.map((msg, i) => {
          if (msg.role === 'status') {
            return <StatusMessage key={i} message={msg} onScrollToBlock={scrollToBlock} />;
          }

          if (msg.role === 'interrupted') {
            return <div key={i} className="chat-interrupted">Interrupted</div>;
          }

          if (msg.role === 'image_review') {
            return <ImageReview key={i} images={msg.images} onAction={handleImageReviewAction} />;
          }

          if (msg.isPlan) return null;

          return (
            <div key={i}>
              <ChatMessage
                message={msg}
                isStreaming={false}
              />
            </div>
          );
        })}
        {streaming && streamingText.trim().length > 1
          && (hadToolCallsRef.current || lesson.blocks?.length > 0) && (
          <ChatMessage
            message={{ role: 'assistant', content: streamingText }}
            isStreaming={true}
          />
        )}
        {streaming && !streamingText.trim() && !hasActiveStatus && (
          <div className="chat-thinking">
            <span className="dot-pulse" />
            <span className="chat-thinking-text">Thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <ChatInput
        onSend={handleSend}
        onStop={() => abortRef.current?.abort()}
        disabled={streaming}
        streaming={streaming}
      />
      {messages.length === 0 && !streaming && (
        <div className="suggested-prompts">
          <div
            className="suggested-prompts-track"
            onScroll={(e) => {
              const el = e.currentTarget;
              const atStart = el.scrollLeft < 4;
              const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
              const cls = atStart && atEnd ? 'fade-none' : atStart ? '' : atEnd ? 'fade-left' : 'fade-both';
              el.className = 'suggested-prompts-track' + (cls ? ' ' + cls : '');
            }}
          >
            {suggestedPrompts.map((prompt, i) => (
              <button
                key={i}
                className="suggested-prompt"
                onClick={() => handleSend(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="chat-welcome-spacer" />
    </div>
  );
}
