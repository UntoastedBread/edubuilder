'use client';

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import CodeBlock, { PreBlock } from './CodeBlock';

const codeComponents = {
  code({ className, children }) {
    return <CodeBlock className={className}>{children}</CodeBlock>;
  },
  pre({ children }) {
    return <PreBlock>{children}</PreBlock>;
  },
};

/**
 * Renders text with markdown and LaTeX support.
 * Use for any text that might contain $inline$ or $$display$$ math,
 * markdown formatting, or just plain text.
 *
 * inline={true} wraps in a <span> instead of <div> — use for quiz options,
 * single-line text, etc.
 */
export default function RichText({ children, inline = false }) {
  if (!children) return null;

  const content = (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={inline ? {
        // In inline mode, unwrap paragraphs to avoid block-level elements inside spans
        p({ children }) { return <>{children}</>; },
      } : codeComponents}
    >
      {children}
    </ReactMarkdown>
  );

  if (inline) {
    return <span className="rich-text-inline">{content}</span>;
  }

  return <div className="rich-text">{content}</div>;
}
