'use client';

import { useState } from 'react';
import RichText from './RichText';

export default function DragOrderBlock({ data, onContinue, onScore }) {
  // Guard for partial data during streaming
  if (!data.items || data.items.length === 0) {
    return (
      <div className="block block-drag-order">
        {data.instruction && <div className="block-title"><RichText inline>{data.instruction}</RichText></div>}
      </div>
    );
  }

  const [items, setItems] = useState(() => {
    const shuffled = [...data.items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  });
  const [dragIndex, setDragIndex] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  function handleDragStart(index) {
    setDragIndex(index);
  }

  function handleDragOver(e, index) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const next = [...items];
    const [dragged] = next.splice(dragIndex, 1);
    next.splice(index, 0, dragged);
    setItems(next);
    setDragIndex(index);
  }

  function handleDragEnd() {
    setDragIndex(null);
  }

  function handleSubmit() {
    setSubmitted(true);
    if (onScore) onScore(isCorrectOrder());
  }

  function isCorrectOrder() {
    return items.every((item, i) => item.id === data.correctOrder[i]);
  }

  function getCorrectPosition(itemId) {
    return data.correctOrder.indexOf(itemId);
  }

  return (
    <div className="block block-drag-order">
      <div className="block-title"><RichText inline>{data.instruction}</RichText></div>
      <div className="drag-list">
        {items.map((item, i) => {
          const correct = submitted && item.id === data.correctOrder[i];
          const wrong = submitted && item.id !== data.correctOrder[i];
          return (
            <div
              key={item.id}
              className={`drag-item ${dragIndex === i ? 'dragging' : ''} ${correct ? 'correct' : ''} ${wrong ? 'incorrect' : ''}`}
              draggable={!submitted}
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDragEnd={handleDragEnd}
            >
              <span className="drag-position">{i + 1}.</span>
              <span className="drag-handle">&#x2807;</span>
              <span><RichText inline>{item.label}</RichText></span>
              {wrong && (
                <span className="drag-correct-pos">
                  should be #{getCorrectPosition(item.id) + 1}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {!submitted && (
        <button className="btn btn-primary block-submit" onClick={handleSubmit}>
          Submit
        </button>
      )}
      {submitted && (
        <div className={`quiz-feedback ${isCorrectOrder() ? 'feedback-correct' : 'feedback-incorrect'}`}>
          <strong>{isCorrectOrder() ? 'Perfect order!' : 'Not quite right.'}</strong>
          {!isCorrectOrder() && (
            <p>The correct order is: {data.correctOrder.map((id) => data.items.find((item) => item.id === id)?.label).join(' → ')}</p>
          )}
        </div>
      )}
      {submitted && onContinue && (
        <button className="btn btn-primary block-continue" onClick={onContinue}>
          Continue
        </button>
      )}
    </div>
  );
}
