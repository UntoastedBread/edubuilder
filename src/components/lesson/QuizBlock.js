'use client';

import { useState } from 'react';

export default function QuizBlock({ data, onContinue }) {
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const isCorrect = selected === data.correctIndex;

  function handleSubmit() {
    if (selected === null) return;
    setSubmitted(true);
  }

  return (
    <div className="block block-quiz">
      <h3 className="block-title">{data.question}</h3>
      <div className="quiz-options">
        {data.options.map((option, i) => (
          <button
            key={i}
            className={`quiz-option ${selected === i ? 'selected' : ''} ${
              submitted
                ? i === data.correctIndex
                  ? 'correct'
                  : selected === i
                    ? 'incorrect'
                    : ''
                : ''
            }`}
            onClick={() => !submitted && setSelected(i)}
            disabled={submitted}
          >
            <span className="quiz-option-letter">
              {String.fromCharCode(65 + i)}
            </span>
            {option}
          </button>
        ))}
      </div>
      {!submitted && (
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={selected === null}
        >
          Submit
        </button>
      )}
      {submitted && (
        <div className={`quiz-feedback ${isCorrect ? 'feedback-correct' : 'feedback-incorrect'}`}>
          <strong>{isCorrect ? 'Correct!' : 'Not quite.'}</strong>
          <p>{data.explanation}</p>
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
