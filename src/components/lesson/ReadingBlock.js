'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import CodeBlock, { PreBlock } from './CodeBlock';
import RichText from './RichText';

// Custom renderers for richer reading blocks
const markdownComponents = {
  code({ className, children }) {
    return <CodeBlock className={className}>{children}</CodeBlock>;
  },
  pre({ children }) {
    return <PreBlock>{children}</PreBlock>;
  },
  // Blockquotes become styled callout cards
  blockquote({ children }) {
    return <div className="reading-callout">{children}</div>;
  },
  // Bold text gets a subtle highlight
  strong({ children }) {
    return <strong className="reading-key-term">{children}</strong>;
  },
  // Horizontal rules become visual section dividers
  hr() {
    return <div className="reading-divider" />;
  },
  // Headers get distinct styling
  h2({ children }) {
    return <h2 className="reading-h2">{children}</h2>;
  },
  h3({ children }) {
    return <h3 className="reading-h3">{children}</h3>;
  },
  // Lists get card-like styling
  ul({ children }) {
    return <ul className="reading-list">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="reading-list reading-list-ordered">{children}</ol>;
  },
  li({ children }) {
    return <li className="reading-list-item">{children}</li>;
  },
};

function ImageFigure({ image, caption, onImageAction, blockId }) {
  const imgEl = (
    <img
      src={image.src}
      alt={image.alt}
      className="block-image"
      loading="lazy"
      onError={image.onError}
    />
  );

  const captionEl = caption ? (
    <p className="block-image-caption">{caption}</p>
  ) : null;

  if (onImageAction) {
    return (
      <figure className="image-figure">
        <div className="image-hover-container">
          {imgEl}
          <div className="image-hover-overlay">
            <button
              className="image-hover-btn image-hover-btn-delete"
              onClick={() => onImageAction(blockId, 'delete')}
              aria-label="Delete image"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
            <button
              className="image-hover-btn image-hover-btn-retry"
              onClick={() => onImageAction(blockId, 'retry')}
              aria-label="Retry image"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
            </button>
          </div>
        </div>
        {captionEl}
      </figure>
    );
  }

  return (
    <figure className="image-figure">
      {imgEl}
      {captionEl}
    </figure>
  );
}

export default function ReadingBlock({ data, onContinue, onImageAction, blockId }) {
  const [imgError, setImgError] = useState(false);
  const pos = data.imagePosition || 'bottom';
  const hasImage = data.image && !imgError;
  const isSideBySide = hasImage && (pos === 'left' || pos === 'right');

  const imageProps = hasImage ? {
    src: data.image,
    alt: data.imageDescription || data.title || 'Lesson image',
    onError: () => setImgError(true),
  } : null;

  const imageEl = hasImage ? (
    <ImageFigure
      image={imageProps}
      caption={data.imageDescription}
      onImageAction={onImageAction}
      blockId={blockId}
    />
  ) : null;

  const contentEl = (
    <div className="block-content">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={markdownComponents}
      >
        {data.content || ''}
      </ReactMarkdown>
    </div>
  );

  return (
    <div className="block block-reading">
      {data.title && <h3 className="block-title"><RichText inline>{data.title}</RichText></h3>}
      {hasImage && pos === 'top' && (
        <div className="reading-image-top">{imageEl}</div>
      )}
      {isSideBySide ? (
        <div className={`reading-layout reading-layout-${pos}`}>
          {pos === 'left' && <div className="reading-layout-image">{imageEl}</div>}
          <div className="reading-layout-text">{contentEl}</div>
          {pos === 'right' && <div className="reading-layout-image">{imageEl}</div>}
        </div>
      ) : (
        <>
          {contentEl}
          {hasImage && (pos === 'bottom' || !pos) && (
            <div className="reading-image-bottom">{imageEl}</div>
          )}
        </>
      )}
      {onContinue && (
        <button className="btn btn-primary block-continue" onClick={onContinue}>
          Continue
        </button>
      )}
    </div>
  );
}
