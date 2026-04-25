import { streamChat, MODEL_BUILD, MODEL_CHAT } from '@/lib/claude';

// Keywords that suggest building or modifying a lesson
const BUILD_PATTERN = /\b(build|create|make|add|change|modify|replace|update|remove|delete|reorder|move|swap|edit|fix|redo|rebuild|redesign|harder|easier|shorter|longer|simpler|lesson|blocks?|quiz|reading|sandbox|interactive|simulation)\b/i;

function selectModel(messages, lesson) {
  const hasLesson = lesson?.blocks?.length >= 5;
  if (!hasLesson) return MODEL_BUILD;

  const lastMessage = messages[messages.length - 1]?.content || '';
  if (BUILD_PATTERN.test(lastMessage)) return MODEL_BUILD;

  // Lesson already built and message doesn't look like a modification — use Haiku
  return MODEL_CHAT;
}

export async function POST(request) {
  const { messages, lesson, mode } = await request.json();
  const model = selectModel(messages, lesson);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(event, data) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      }

      await streamChat({
        messages,
        lesson: lesson || { blocks: [] },
        model,
        mode: mode || 'teacher',
        onText(chunk) {
          send('text', { content: chunk });
        },
        onToolStart(name, input) {
          send('tool_start', { name, input });
        },
        onToolCall(name, input) {
          send('tool_call', { name, input });
        },
        onToolResult(name) {
          send('tool_result', { name });
        },
        onTextBreak() {
          send('text_break', {});
        },
        onToolBlockPartial(block) {
          send('tool_block_partial', { block });
        },
        onToolStatus(message) {
          send('tool_status', { message });
        },
        onToolProgress(data) {
          send('tool_progress', data);
        },
        onBlockContentDelta(data) {
          send('block_content_delta', data);
        },
        onDone() {
          send('done', {});
          controller.close();
        },
        onError(error) {
          console.error('Chat stream error:', error);
          send('error', { message: error.message });
          controller.close();
        },
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
