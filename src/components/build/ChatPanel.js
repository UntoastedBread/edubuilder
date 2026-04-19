'use client';

import { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

export default function ChatPanel({ onLessonUpdate, lesson }) {
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const messagesEndRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  async function handleSend(text) {
    const userMessage = { role: 'user', content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setStreaming(true);
    setStreamingText('');

    try {
      const abortController = new AbortController();
      abortRef.current = abortController;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
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
            } else if (eventType === 'tool_call' && data.name === 'update_lesson') {
              onLessonUpdate(data.input.operations);
            } else if (eventType === 'done') {
              // Stream complete
            } else if (eventType === 'error') {
              console.error('Stream error:', data.message);
            }

            eventType = null;
          }
        }
      }

      if (fullText) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: fullText },
        ]);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
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
    }
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h2>EduBuilder</h2>
        <p className="text-muted">Describe your lesson and I&apos;ll build it</p>
      </div>
      <div className="chat-messages">
        {messages.length === 0 && !streaming && (
          <div className="chat-welcome">
            <h3>Welcome to EduBuilder</h3>
            <p>Tell me what lesson you&apos;d like to create. Include:</p>
            <ul>
              <li>The subject and topic</li>
              <li>NCEA level and standard (if applicable)</li>
              <li>Any specific concepts to cover</li>
            </ul>
            <p className="text-muted">
              Example: &ldquo;Create a Level 1 Science lesson on gravity and
              forces, aligned to AS91027&rdquo;
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}
        {streaming && streamingText && (
          <ChatMessage
            message={{ role: 'assistant', content: streamingText }}
          />
        )}
        {streaming && !streamingText && (
          <div className="chat-thinking">
            <span className="dot-pulse" />
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <ChatInput onSend={handleSend} disabled={streaming} />
    </div>
  );
}
