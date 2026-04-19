'use client';

import ReactMarkdown from 'react-markdown';

export default function ReadingBlock({ data, onContinue }) {
  return (
    <div className="block block-reading">
      {data.title && <h3 className="block-title">{data.title}</h3>}
      <div className="block-content">
        <ReactMarkdown>{data.content}</ReactMarkdown>
      </div>
      {data.image && (
        <img src={data.image} alt={data.title || 'Lesson image'} className="block-image" />
      )}
      {onContinue && (
        <button className="btn btn-primary" onClick={onContinue}>
          Continue
        </button>
      )}
    </div>
  );
}
