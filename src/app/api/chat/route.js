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
        onToolCall(name, input) {
          send('tool_call', { name, input });
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
