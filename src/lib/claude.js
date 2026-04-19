import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, buildToolDefinitions } from './prompts';
import { webSearch } from './search';
import { v4 as uuidv4 } from 'uuid';

const client = new Anthropic();

/**
 * Runs a streaming conversation with Claude that may involve multiple
 * tool-use turns. Calls onText/onToolCall/onDone callbacks as events occur.
 *
 * @param {Object} opts
 * @param {Array} opts.messages - Conversation messages [{role, content}]
 * @param {Object} opts.lesson - Current lesson state (blocks array, metadata)
 * @param {Function} opts.onText - Called with (textChunk) for each streamed text token
 * @param {Function} opts.onToolCall - Called with (toolName, toolInput) for completed tool calls
 * @param {Function} opts.onDone - Called when Claude finishes (no more tool calls)
 * @param {Function} opts.onError - Called with (error) on failure
 */
export async function streamChat({ messages, lesson, onText, onToolCall, onDone, onError }) {
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

  try {
    // Agentic loop: Claude may use tools, which requires follow-up turns
    while (true) {
      const stream = await client.messages.stream({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 16000,
        system: systemWithLesson,
        tools,
        messages: claudeMessages,
      });

      let assistantContent = [];
      let currentText = '';
      let hasToolUse = false;

      for await (const event of stream) {
        if (event.type === 'content_block_start') {
          if (event.content_block.type === 'text') {
            currentText = '';
          }
        } else if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            currentText += event.delta.text;
            onText(event.delta.text);
          }
        } else if (event.type === 'content_block_stop') {
          // handled by finalMessage
        }
      }

      const finalMessage = await stream.finalMessage();

      // Process the final message content blocks
      const toolResults = [];

      for (const block of finalMessage.content) {
        if (block.type === 'text') {
          assistantContent.push(block);
        } else if (block.type === 'tool_use') {
          hasToolUse = true;
          assistantContent.push(block);

          if (block.name === 'update_lesson') {
            // Assign IDs to new blocks
            for (const op of block.input.operations) {
              if (op.action === 'add' && op.block) {
                op.block.id = uuidv4();
              }
            }
            onToolCall('update_lesson', block.input);
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: 'Lesson updated successfully.',
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
        }
      }

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
