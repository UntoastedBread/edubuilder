'use client';

import ReactMarkdown from 'react-markdown';
import CodeBlock, { PreBlock } from '../lesson/CodeBlock';

const chatCodeComponents = {
  code({ className, children }) {
    return <CodeBlock className={className}>{children}</CodeBlock>;
  },
  pre({ children }) {
    return <PreBlock>{children}</PreBlock>;
  },
};

export default function ChatMessage({ message, isStreaming }) {
  const isUser = message.role === 'user';

  return (
    <div className={`chat-message ${isUser ? 'chat-message-user' : 'chat-message-assistant'}`}>
      <div className="chat-message-content">
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <ReactMarkdown components={chatCodeComponents}>{message.content}</ReactMarkdown>
        )}
      </div>
    </div>
  );
}
