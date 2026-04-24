import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, buildToolDefinitions } from './prompts';
import { webSearch } from './search';
import { v4 as uuidv4 } from 'uuid';

const client = new Anthropic();

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse partial (incomplete) JSON by closing open strings, removing trailing
 * delimiters, and closing open structures. Returns parsed object or null.
 */
function parsePartialJson(str) {
  let inString = false;
  let escaped = false;
  let stack = [];
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\' && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') stack.push('}');
    else if (ch === '[') stack.push(']');
    else if (ch === '}' || ch === ']') {
      if (stack.length > 0 && stack[stack.length - 1] === ch) stack.pop();
    }
  }
  let fixed = str;
  if (escaped) fixed = fixed.slice(0, -1); // drop trailing incomplete escape
  if (inString) fixed += '"'; // close open string
  fixed = fixed.replace(/[,:]\s*$/, ''); // remove trailing comma/colon
  while (stack.length > 0) fixed += stack.pop(); // close open structures
  try {
    return JSON.parse(fixed);
  } catch {
    return null;
  }
}

/**
 * Incrementally extract complete JSON objects from a partial operations array string.
 * Tracks brace/bracket depth respecting string escaping.
 * Returns { operations, incompleteStart } where incompleteStart is the position
 * of the next incomplete operation object, or -1 if none.
 */
function extractCompleteOperations(accumulated) {
  const opsMatch = accumulated.indexOf('"operations"');
  if (opsMatch === -1) return { operations: [], incompleteStart: -1 };

  const bracketStart = accumulated.indexOf('[', opsMatch);
  if (bracketStart === -1) return { operations: [], incompleteStart: -1 };

  const operations = [];
  let depth = 0;
  let inString = false;
  let escaped = false;
  let objStart = -1;

  for (let i = bracketStart + 1; i < accumulated.length; i++) {
    const ch = accumulated[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === '\\' && inString) {
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === '{') {
      if (depth === 0) objStart = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && objStart !== -1) {
        const objStr = accumulated.slice(objStart, i + 1);
        try {
          const obj = JSON.parse(objStr);
          operations.push(obj);
        } catch {
          // Incomplete JSON, skip
        }
        objStart = -1;
      }
    }
  }

  return { operations, incompleteStart: objStart };
}

/**
 * Apply update_lesson operations to a lesson object server-side,
 * so review_lesson can see the current state.
 */
function applyOperations(lesson, input) {
  let blocks = (lesson.blocks || []).map(b => ({ ...b }));
  if (input.title) lesson = { ...lesson, title: input.title };

  for (const op of input.operations) {
    if (op.action === 'add' && op.block) {
      blocks.push({ ...op.block });
    } else if (op.action === 'replace' && op.blockId && op.block) {
      blocks = blocks.map(b =>
        b.id === op.blockId ? { ...op.block, id: op.blockId } : b
      );
    } else if (op.action === 'remove' && op.blockId) {
      blocks = blocks.filter(b => b.id !== op.blockId);
    } else if (op.action === 'reorder' && op.order) {
      const orderMap = new Map(op.order.map((id, i) => [id, i]));
      blocks.sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));
    }
  }

  return { ...lesson, blocks };
}

/**
 * Run automated quality checks on a lesson.
 * Returns { issues: [...], summary: string }.
 */
function reviewLesson(lesson) {
  const issues = [];
  const blocks = lesson.blocks || [];

  if (blocks.length === 0) {
    return { issues: [], summary: 'No blocks to review.' };
  }

  // Reading blocks over 120 words
  for (const block of blocks) {
    if (block.type === 'reading' && block.data?.content) {
      const wordCount = block.data.content.split(/\s+/).filter(w => w.length > 0).length;
      if (wordCount > 120) {
        issues.push({
          blockId: block.id,
          rule: 'word_count',
          message: `Reading block "${block.data.title || 'untitled'}" has ${wordCount} words (max 120). Split or trim it.`,
        });
      }
    }
  }

  // More than 2 readings in a row without interactive
  let consecutiveReadings = 0;
  for (const block of blocks) {
    if (block.type === 'reading') {
      consecutiveReadings++;
      if (consecutiveReadings > 2) {
        issues.push({
          blockId: block.id,
          rule: 'consecutive_readings',
          message: `More than 2 reading blocks in a row — add an interactive block before "${block.data?.title || 'untitled'}".`,
        });
      }
    } else {
      consecutiveReadings = 0;
    }
  }

  // Quiz blocks missing explanations
  for (const block of blocks) {
    if (block.type === 'quiz' && (!block.data?.explanation || block.data.explanation.trim() === '')) {
      issues.push({
        blockId: block.id,
        rule: 'missing_explanation',
        message: `Quiz "${block.data?.question?.slice(0, 50) || 'untitled'}" is missing an explanation.`,
      });
    }
  }

  // Same interactive type back-to-back (excluding reading)
  const interactiveTypes = ['quiz', 'fill-blank', 'drag-order', 'short-answer', 'sandbox'];
  for (let i = 1; i < blocks.length; i++) {
    if (
      interactiveTypes.includes(blocks[i].type) &&
      blocks[i].type === blocks[i - 1].type
    ) {
      issues.push({
        blockId: blocks[i].id,
        rule: 'same_type_adjacent',
        message: `Two "${blocks[i].type}" blocks in a row (positions ${i} and ${i + 1}). Use a different type for variety.`,
      });
    }
  }

  // First block should be an interactive hook
  const hookTypes = ['quiz', 'short-answer'];
  if (!hookTypes.includes(blocks[0].type)) {
    issues.push({
      blockId: blocks[0].id,
      rule: 'missing_hook',
      message: `Lesson should start with a hook question (quiz or short-answer), not "${blocks[0].type}".`,
    });
  }

  // Lesson should end with review questions
  if (blocks.length >= 5) {
    const lastThree = blocks.slice(-3);
    const reviewTypes = ['quiz', 'fill-blank', 'drag-order', 'short-answer'];
    const hasReview = lastThree.some(b => reviewTypes.includes(b.type));
    if (!hasReview) {
      issues.push({
        rule: 'missing_review',
        message: 'Lesson should end with review questions. The last 3 blocks are all non-interactive.',
      });
    }
  }

  // Lesson too short
  if (blocks.length < 5) {
    issues.push({
      rule: 'too_short',
      message: `Lesson has only ${blocks.length} blocks. A short lesson should have at least 8-10.`,
    });
  }

  return {
    issues,
    summary: issues.length === 0
      ? 'All checks passed — the lesson follows all design rules.'
      : `Found ${issues.length} issue${issues.length === 1 ? '' : 's'} to fix.`,
  };
}

/**
 * Runs a streaming conversation with Claude that may involve multiple
 * tool-use turns. Calls callbacks as events occur.
 */
export async function streamChat({ messages, lesson, onText, onToolStart, onToolCall, onToolResult, onTextBreak, onToolBlockPartial, onToolStatus, onToolProgress, onBlockContentDelta, onDone, onError }) {
  const tools = buildToolDefinitions();

  // Inject current lesson state into the system prompt
  const systemWithLesson = `${SYSTEM_PROMPT}

## Current Lesson State
The lesson currently has ${lesson.blocks?.length || 0} blocks:
${JSON.stringify(lesson.blocks || [], null, 2)}

Each block has an "id" field. Use these IDs when replacing or removing blocks.`;

  // Build the messages array for Claude
  let claudeMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Track current lesson state server-side so review_lesson can see it
  let currentLesson = { ...lesson, blocks: (lesson.blocks || []).map(b => ({ ...b })) };

  try {
    // Agentic loop: Claude may use tools, which requires follow-up turns
    let isFirstTurn = true;
    while (true) {
      if (!isFirstTurn) {
        onTextBreak?.();
      }
      isFirstTurn = false;

      const stream = await client.messages.stream({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 16000,
        system: systemWithLesson,
        tools,
        messages: claudeMessages,
      });

      let currentText = '';
      // Track which tool_use blocks we've already signaled start for
      const startedTools = new Set();
      // Track partial tool input for streaming blocks
      let currentToolName = null;
      let currentToolIndex = null;
      let currentToolInput = '';
      let emittedPartialCount = 0;
      let emittedStatus = false;
      let lastEmittedStatusCount = 0;
      // Map of tool_use content block index → array of IDs assigned during streaming
      const partialBlockIdsMap = new Map();
      // Block content streaming state (for streaming partial block data to client)
      let streamingBlockId = null;
      let lastStreamedData = '';

      for await (const event of stream) {
        if (event.type === 'content_block_start') {
          if (event.content_block.type === 'text') {
            currentText = '';
          } else if (event.content_block.type === 'tool_use') {
            // Signal tool start as soon as we see the block begin (during streaming)
            const toolName = event.content_block.name;
            startedTools.add(event.index);
            currentToolName = toolName;
            currentToolIndex = event.index;
            currentToolInput = '';
            emittedPartialCount = 0;
            emittedStatus = false;
            lastEmittedStatusCount = 0;
            if (toolName === 'update_lesson') {
              partialBlockIdsMap.set(event.index, []);
            }
            onToolStart?.(toolName, {});
          }
        } else if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            currentText += event.delta.text;
            onText(event.delta.text);
          } else if (event.delta.type === 'input_json_delta') {
            currentToolInput += event.delta.partial_json;

            if (currentToolName === 'update_lesson') {
              // Emit progress to client for debug visibility
              if (currentToolInput.length % 200 < event.delta.partial_json.length) {
                onToolProgress?.({ chars: currentToolInput.length, hasStatus: emittedStatus, snippet: currentToolInput.slice(0, 120) });
              }
              // Extract status_message from partial JSON (may be incomplete array)
              if (!emittedStatus) {
                // Try complete array: "status_message": ["msg1", "msg2"]
                const arrayMatch = currentToolInput.match(/"status_message"\s*:\s*\[([^\]]*)\]/);
                if (arrayMatch) {
                  emittedStatus = true;
                  const items = arrayMatch[1].match(/"([^"]*)"/g);
                  if (items) {
                    const messages = items.map(s => s.slice(1, -1));
                    onToolStatus?.(messages);
                  }
                } else {
                  // Try incomplete array: extract items seen so far
                  const arrayStart = currentToolInput.match(/"status_message"\s*:\s*\[/);
                  if (arrayStart) {
                    const afterBracket = currentToolInput.slice(arrayStart.index + arrayStart[0].length);
                    const items = [...afterBracket.matchAll(/"((?:[^"\\]|\\.)*)"/g)];
                    if (items.length > lastEmittedStatusCount) {
                      lastEmittedStatusCount = items.length;
                      const messages = items.map(m => m[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
                      onToolStatus?.(messages);
                    }
                  } else {
                    // Try string format: "status_message": "msg"
                    const stringMatch = currentToolInput.match(/"status_message"\s*:\s*"([^"]*)"/);
                    if (stringMatch) {
                      emittedStatus = true;
                      onToolStatus?.(stringMatch[1]);
                    }
                  }
                }
              }

              // Try to extract complete operations
              const { operations: ops, incompleteStart } = extractCompleteOperations(currentToolInput);
              const newOps = ops.slice(emittedPartialCount);

              for (const op of newOps) {
                if (op.action === 'add' && op.block) {
                  // Reuse streaming block ID if we were streaming this block's content
                  const id = streamingBlockId || uuidv4();
                  op.block.id = id;
                  if (streamingBlockId) {
                    streamingBlockId = null;
                    lastStreamedData = '';
                  }
                  partialBlockIdsMap.get(currentToolIndex).push(id);
                  onToolBlockPartial?.(op.block);
                }
                emittedPartialCount++;
              }

              // Stream partial block content for the current incomplete operation
              if (incompleteStart !== -1) {
                const partialStr = currentToolInput.slice(incompleteStart);
                const parsed = parsePartialJson(partialStr);
                if (parsed?.action === 'add' && parsed?.block?.type) {
                  const serialized = JSON.stringify(parsed.block);
                  if (serialized !== lastStreamedData) {
                    lastStreamedData = serialized;
                    const isFirst = streamingBlockId === null;
                    if (isFirst) {
                      streamingBlockId = uuidv4();
                    }
                    onBlockContentDelta?.({ blockId: streamingBlockId, block: parsed.block, isFirst });
                  }
                }
              }
            } else if (currentToolName === 'web_search') {
              // Extract query early from partial JSON
              if (!emittedStatus) {
                const queryMatch = currentToolInput.match(/"query"\s*:\s*"([^"]*)"/);
                if (queryMatch) {
                  emittedStatus = true;
                  onToolStatus?.(queryMatch[1]);
                }
              }
            }
          }
        } else if (event.type === 'content_block_stop') {
          if (currentToolName === 'update_lesson') {
            console.log('[status-debug] block_stop — emittedStatus:', emittedStatus, 'lastEmittedStatusCount:', lastEmittedStatusCount, 'input has status_message:', currentToolInput.includes('status_message'));
            if (!emittedStatus && !currentToolInput.includes('status_message')) {
              console.log('[status-debug] Claude did NOT include status_message in tool input');
            }
          }
          currentToolName = null;
          currentToolIndex = null;
          currentToolInput = '';
          emittedPartialCount = 0;
          lastEmittedStatusCount = 0;
          streamingBlockId = null;
          lastStreamedData = '';
        }
      }

      const finalMessage = await stream.finalMessage();

      // Process the final message content blocks
      const assistantContent = [];
      const toolResults = [];

      let contentBlockIndex = 0;
      for (const block of finalMessage.content) {
        const blockIndex = contentBlockIndex++;
        if (block.type === 'text') {
          assistantContent.push(block);
        } else if (block.type === 'tool_use') {
          assistantContent.push(block);

          if (block.name === 'update_lesson') {
            // Assign IDs to new blocks, reusing IDs from partial streaming for this specific tool_use block
            const partialIds = partialBlockIdsMap.get(blockIndex) || [];
            let partialIdx = 0;
            for (const op of block.input.operations) {
              if (op.action === 'add' && op.block) {
                if (partialIdx < partialIds.length) {
                  op.block.id = partialIds[partialIdx++];
                } else {
                  op.block.id = uuidv4();
                }
              }
            }
            // Small delay so the "Building..." status is visible to the user
            await delay(600);
            onToolCall('update_lesson', block.input);
            // Keep server-side lesson state in sync for review_lesson
            currentLesson = applyOperations(currentLesson, block.input);
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: 'Lesson updated successfully.',
            });
          } else if (block.name === 'review_lesson') {
            const reviewResult = reviewLesson(currentLesson);
            onToolCall('review_lesson', reviewResult);
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(reviewResult),
            });
          } else if (block.name === 'web_search') {
            const searchResults = await webSearch(block.input.query);
            onToolCall('web_search', { query: block.input.query, results: searchResults.results });
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(searchResults),
            });
          }

          // Signal tool is done
          onToolResult?.(block.name);
        }
      }

      const hasToolUse = toolResults.length > 0;

      if (!hasToolUse) {
        // Claude is done — no more tool calls
        onDone();
        return;
      }

      // Continue the conversation with tool results
      claudeMessages = [
        ...claudeMessages,
        { role: 'assistant', content: assistantContent },
        { role: 'user', content: toolResults },
      ];
    }
  } catch (error) {
    onError(error);
  }
}
