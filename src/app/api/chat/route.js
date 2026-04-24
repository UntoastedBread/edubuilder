import { streamChat } from '@/lib/claude';

export async function POST(request) {
  const { messages, lesson } = await request.json();

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
