'use client';

import { useState } from 'react';

export default function ShortAnswerBlock({ data, onContinue }) {
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showHint, setShowHint] = useState(0);

  function handleSubmit() {
    if (!answer.trim()) return;
    setSubmitted(true);
  }

  return (
    <div className="block block-short-answer">
      <h3 className="block-title">{data.question}</h3>
      {!submitted && data.hints && data.hints.length > 0 && showHint < data.hints.length && (
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setShowHint((h) => h + 1)}
        >
          Show hint
        </button>
      )}
      {data.hints?.slice(0, showHint).map((hint, i) => (
        <p key={i} className="hint">
          Hint: {hint}
        </p>
      ))}
      <textarea
        className="input-textarea"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Type your answer..."
        disabled={submitted}
        rows={3}
      />
      {!submitted && (
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={!answer.trim()}
        >
          Submit
        </button>
      )}
      {submitted && (
        <div className="quiz-feedback feedback-neutral">
          <strong>Model answer:</strong>
          <p>{data.modelAnswer}</p>
        </div>
      )}
      {submitted && onContinue && (
        <button className="btn btn-primary" onClick={onContinue}>
          Continue
        </button>
      )}
    </div>
  );
}
