'use client';

import { useState } from 'react';
import RichText from './RichText';

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
      <div className="block-title"><RichText inline>{data.question}</RichText></div>
      {!submitted && data.hints && data.hints.length > 0 && showHint < data.hints.length && (
        <div className="hint-btn-row">
          <button
            className="btn btn-secondary btn-sm btn-hint"
            onClick={() => setShowHint((h) => h + 1)}
          >
            Show hint
          </button>
        </div>
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
          className="btn btn-primary block-submit"
          onClick={handleSubmit}
          disabled={!answer.trim()}
        >
          Submit
        </button>
      )}
      {submitted && (
        <div className="quiz-feedback feedback-neutral">
          <strong>Model answer:</strong>
          <RichText>{data.modelAnswer}</RichText>
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
