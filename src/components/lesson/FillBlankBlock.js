'use client';

import { useState } from 'react';

export default function FillBlankBlock({ data, onContinue }) {
  const [answers, setAnswers] = useState(data.blanks.map(() => ''));
  const [submitted, setSubmitted] = useState(false);

  function handleChange(index, value) {
    const next = [...answers];
    next[index] = value;
    setAnswers(next);
  }

  function checkAnswer(index) {
    const blank = data.blanks[index];
    const userAnswer = answers[index].trim().toLowerCase();
    const accepted = [blank.answer, ...(blank.accept || [])].map((a) =>
      a.toLowerCase()
    );
    return accepted.includes(userAnswer);
  }

  function handleSubmit() {
    if (answers.some((a) => !a.trim())) return;
    setSubmitted(true);
  }

  // Split template on {{0}}, {{1}}, etc. and interleave with inputs
  const parts = data.template.split(/\{\{(\d+)\}\}/);

  return (
    <div className="block block-fill-blank">
      <div className="fill-blank-sentence">
        {parts.map((part, i) => {
          if (i % 2 === 0) {
            return <span key={i}>{part}</span>;
          }
          const blankIndex = parseInt(part, 10);
          const isCorrect = submitted && checkAnswer(blankIndex);
          const isWrong = submitted && !checkAnswer(blankIndex);
          return (
            <input
              key={i}
              type="text"
              className={`fill-blank-input ${isCorrect ? 'correct' : ''} ${isWrong ? 'incorrect' : ''}`}
              value={answers[blankIndex]}
              onChange={(e) => handleChange(blankIndex, e.target.value)}
              disabled={submitted}
              placeholder="..."
            />
          );
        })}
      </div>
      {!submitted && (
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={answers.some((a) => !a.trim())}
        >
          Submit
        </button>
      )}
      {submitted && (
        <div className="quiz-feedback feedback-neutral">
          <strong>Answers:</strong>
          <ul>
            {data.blanks.map((blank, i) => (
              <li key={i}>
                Blank {i + 1}: <strong>{blank.answer}</strong>
                {!checkAnswer(i) && (
                  <span className="text-error"> (you wrote: {answers[i]})</span>
                )}
              </li>
            ))}
          </ul>
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
