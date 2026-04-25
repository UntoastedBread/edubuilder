'use client';

import { useState } from 'react';
import RichText from './RichText';

function OptionLabel({ option }) {
  const [imgError, setImgError] = useState(false);
  if (typeof option === 'string') return <RichText inline>{option}</RichText>;
  return (
    <>
      {option.image && !imgError && (
        <img
          src={option.image}
          alt={option.text || ''}
          loading="lazy"
          onError={() => setImgError(true)}
        />
      )}
      <span className="quiz-option-text"><RichText inline>{option.text}</RichText></span>
    </>
  );
}

function getOptionText(option) {
  return typeof option === 'string' ? option : option.text;
}

function hasImages(options) {
  return options.some(opt => typeof opt === 'object' && opt.image);
}

export default function QuizBlock({ data, onContinue, onScore }) {
  const isMulti = data.multiSelect === true;
  const [selected, setSelected] = useState(isMulti ? new Set() : null);
  const [submitted, setSubmitted] = useState(false);

  // Guard for partial data during streaming (hooks must be above)
  if (!data.options || data.options.length === 0) {
    return (
      <div className="block block-quiz">
        {data.question && <div className="block-title"><RichText inline>{data.question}</RichText></div>}
      </div>
    );
  }

  const useGrid = hasImages(data.options);

  function toggleSelect(i) {
    if (submitted) return;
    if (isMulti) {
      setSelected(prev => {
        const next = new Set(prev);
        if (next.has(i)) next.delete(i);
        else next.add(i);
        return next;
      });
    } else {
      setSelected(i);
    }
  }

  function isSelected(i) {
    if (isMulti) return selected.has(i);
    return selected === i;
  }

  function canSubmit() {
    if (isMulti) return selected.size > 0;
    return selected !== null;
  }

  function getCorrectSet() {
    if (isMulti && data.correctIndices) {
      return new Set(data.correctIndices);
    }
    return new Set([data.correctIndex]);
  }

  function isCorrectResult() {
    const correctSet = getCorrectSet();
    if (isMulti) {
      if (selected.size !== correctSet.size) return false;
      for (const i of selected) {
        if (!correctSet.has(i)) return false;
      }
      return true;
    }
    return selected === data.correctIndex;
  }

  function getOptionClass(i) {
    const classes = [];
    if (isSelected(i)) classes.push('selected');
    if (submitted) {
      const correctSet = getCorrectSet();
      if (correctSet.has(i)) {
        classes.push('correct');
      } else if (isSelected(i)) {
        classes.push('incorrect');
      }
    }
    return classes.join(' ');
  }

  function handleSubmit() {
    if (!canSubmit()) return;
    setSubmitted(true);
    if (onScore) onScore(isCorrectResult());
  }

  const isCorrect = submitted && isCorrectResult();

  // Grid layout for image options
  if (useGrid) {
    return (
      <div className="block block-quiz">
        <div className="block-title"><RichText inline>{data.question}</RichText></div>
        {data.description && (
          <div className="quiz-description"><RichText>{data.description}</RichText></div>
        )}
        <div className="quiz-options-grid">
          {data.options.map((option, i) => (
            <button
              key={i}
              className={`quiz-option-grid-cell ${getOptionClass(i)}`}
              onClick={() => toggleSelect(i)}
              disabled={submitted}
            >
              <span className="quiz-option-letter">
                {String.fromCharCode(65 + i)}
              </span>
              <OptionLabel option={option} />
              {isMulti && (
                <span className={`quiz-option-checkbox ${isSelected(i) ? 'checked' : ''}`} />
              )}
            </button>
          ))}
        </div>
        {!submitted && (
          <button
            className="btn btn-primary block-submit"
            onClick={handleSubmit}
            disabled={!canSubmit()}
          >
            Submit
          </button>
        )}
        {submitted && (
          <div className={`quiz-feedback ${isCorrect ? 'feedback-correct' : 'feedback-incorrect'}`}>
            <strong>{isCorrect ? 'Correct!' : 'Not quite.'}</strong>
            <RichText>{data.explanation}</RichText>
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

  // Standard list layout
  return (
    <div className="block block-quiz">
      <div className="block-title"><RichText inline>{data.question}</RichText></div>
      {data.description && (
        <div className="quiz-description"><RichText>{data.description}</RichText></div>
      )}
      <div className="quiz-options">
        {data.options.map((option, i) => (
          <button
            key={i}
            className={`quiz-option ${getOptionClass(i)}`}
            onClick={() => toggleSelect(i)}
            disabled={submitted}
          >
            {isMulti ? (
              <span className={`quiz-option-checkbox ${isSelected(i) ? 'checked' : ''}`} />
            ) : (
              <span className="quiz-option-letter">
                {String.fromCharCode(65 + i)}
              </span>
            )}
            <RichText inline>{getOptionText(option)}</RichText>
          </button>
        ))}
      </div>
      {!submitted && (
        <button
          className="btn btn-primary block-submit"
          onClick={handleSubmit}
          disabled={!canSubmit()}
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
        <button className="btn btn-primary block-continue" onClick={onContinue}>
          Continue
        </button>
      )}
    </div>
  );
}
