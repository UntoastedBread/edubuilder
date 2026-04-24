'use client';

import { useState, useMemo } from 'react';
import RichText from './RichText';

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => {
    const row = new Array(n + 1);
    row[0] = i;
    return row;
  });
  for (let j = 1; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export default function FillBlankBlock({ data, onContinue, onScore }) {
  // Guard for partial data during streaming
  if (!data.blanks || !data.template) {
    return <div className="block block-fill-blank" />;
  }

  const [answers, setAnswers] = useState(data.blanks.map(() => ''));
  const [submitted, setSubmitted] = useState(false);
  const [selectedBlank, setSelectedBlank] = useState(0);
  const [usedChips, setUsedChips] = useState(new Set());

  // Shuffled word bank from all correct answers
  const wordBank = useMemo(() => {
    const words = data.blanks.map((b) => b.answer);
    // Fisher-Yates shuffle
    const shuffled = [...words];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [data.blanks]);

  function handleChange(index, value) {
    const next = [...answers];
    next[index] = value;
    setAnswers(next);
  }

  function handleChipClick(word, chipIndex) {
    if (submitted || usedChips.has(chipIndex)) return;
    // Find next empty blank (or use selected)
    let targetBlank = selectedBlank;
    if (answers[targetBlank]?.trim()) {
      // Find first empty blank
      const emptyIdx = answers.findIndex((a) => !a.trim());
      if (emptyIdx === -1) return;
      targetBlank = emptyIdx;
    }
    const next = [...answers];
    next[targetBlank] = word;
    setAnswers(next);
    setUsedChips((prev) => new Set([...prev, chipIndex]));
    // Move to next blank
    const nextEmpty = next.findIndex((a, i) => i > targetBlank && !a.trim());
    if (nextEmpty !== -1) setSelectedBlank(nextEmpty);
  }

  function handleBlankClick(index) {
    if (submitted) return;
    if (answers[index]?.trim()) {
      // Clear blank and return chip to bank
      const clearedWord = answers[index];
      const chipIdx = wordBank.findIndex((w, ci) => w === clearedWord && usedChips.has(ci));
      if (chipIdx !== -1) {
        setUsedChips((prev) => {
          const next = new Set(prev);
          next.delete(chipIdx);
          return next;
        });
      }
      const next = [...answers];
      next[index] = '';
      setAnswers(next);
    }
    setSelectedBlank(index);
  }

  function checkAnswer(index) {
    const blank = data.blanks[index];
    const userAnswer = answers[index].trim().toLowerCase();
    const accepted = [blank.answer, ...(blank.accept || [])].map((a) =>
      a.toLowerCase()
    );
    // Exact match
    if (accepted.includes(userAnswer)) return { correct: true, typo: false };
    // Typo tolerance: Levenshtein distance <= 2
    for (const acc of accepted) {
      if (levenshtein(userAnswer, acc) <= 2) return { correct: true, typo: true };
    }
    return { correct: false, typo: false };
  }

  function handleSubmit() {
    if (answers.some((a) => !a.trim())) return;
    setSubmitted(true);
    if (onScore) {
      const allCorrect = data.blanks.every((_, i) => checkAnswer(i).correct);
      onScore(allCorrect);
    }
  }

  // Split template on {{0}}, {{1}}, etc. and interleave with inputs
  const parts = data.template.split(/\{\{(\d+)\}\}/);

  return (
    <div className="block block-fill-blank">
      {/* Word bank */}
      <div className="word-bank">
        {wordBank.map((word, i) => (
          <button
            key={i}
            className={`word-chip ${usedChips.has(i) ? 'used' : ''}`}
            onClick={() => handleChipClick(word, i)}
            disabled={submitted || usedChips.has(i)}
          >
            {word}
          </button>
        ))}
      </div>

      <div className="fill-blank-sentence">
        {parts.map((part, i) => {
          if (i % 2 === 0) {
            return <span key={i}><RichText inline>{part}</RichText></span>;
          }
          const blankIndex = parseInt(part, 10);
          const result = submitted ? checkAnswer(blankIndex) : null;
          const isCorrect = result?.correct;
          const isTypo = result?.typo;
          const isWrong = submitted && !isCorrect;
          return (
            <input
              key={i}
              type="text"
              className={`fill-blank-input ${isCorrect ? 'correct' : ''} ${isWrong ? 'incorrect' : ''} ${selectedBlank === blankIndex && !submitted ? 'focused' : ''}`}
              value={answers[blankIndex]}
              onChange={(e) => handleChange(blankIndex, e.target.value)}
              onClick={() => handleBlankClick(blankIndex)}
              disabled={submitted}
              placeholder="..."
            />
          );
        })}
      </div>
      {!submitted && (
        <button
          className="btn btn-primary block-submit"
          onClick={handleSubmit}
          disabled={answers.some((a) => !a.trim())}
        >
          Submit
        </button>
      )}
      {submitted && (
        <div className={`quiz-feedback ${data.blanks.every((_, i) => checkAnswer(i).correct) ? 'feedback-correct' : 'feedback-incorrect'}`}>
          <strong>{data.blanks.every((_, i) => checkAnswer(i).correct) ? 'Correct!' : 'Not quite.'}</strong>
          <ul>
            {data.blanks.map((blank, i) => {
              const result = checkAnswer(i);
              return (
                <li key={i}>
                  Blank {i + 1}: <strong>{blank.answer}</strong>
                  {result.typo && (
                    <span className="text-typo"> (close enough — we caught the typo!)</span>
                  )}
                  {!result.correct && (
                    <span className="text-error"> (you wrote: {answers[i]})</span>
                  )}
                </li>
              );
            })}
          </ul>
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
