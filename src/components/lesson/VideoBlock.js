'use client';

import { useState } from 'react';
import RichText from './RichText';

function getEmbedUrl(url) {
  const ytMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/
  );
  if (ytMatch) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }
  return url;
}

export default function VideoBlock({ data, onContinue }) {
  // Guard for partial data during streaming
  if (!data.url) {
    return (
      <div className="block block-video">
        {data.caption && <h3 className="block-title"><RichText inline>{data.caption}</RichText></h3>}
      </div>
    );
  }

  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [allDone, setAllDone] = useState(
    !data.checkQuestions || data.checkQuestions.length === 0
  );

  const question = data.checkQuestions?.[questionIndex];

  function handleSubmit() {
    setSubmitted(true);
  }

  function handleNext() {
    if (questionIndex + 1 < data.checkQuestions.length) {
      setQuestionIndex((i) => i + 1);
      setSelected(null);
      setSubmitted(false);
    } else {
      setAllDone(true);
    }
  }

  return (
    <div className="block block-video">
      {data.caption && <h3 className="block-title"><RichText inline>{data.caption}</RichText></h3>}
      <div className="video-container">
        <iframe
          src={getEmbedUrl(data.url)}
          title={data.caption || 'Video'}
          allowFullScreen
          className="video-iframe"
        />
      </div>
      {question && !allDone && (
        <div className="video-question">
          <div className="block-title"><RichText inline>{question.question}</RichText></div>
          <div className="quiz-options">
            {question.options.map((opt, i) => (
              <button
                key={i}
                className={`quiz-option ${selected === i ? 'selected' : ''} ${
                  submitted
                    ? i === question.correctIndex
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
                {opt}
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
            <>
              <div
                className={`quiz-feedback ${
                  selected === question.correctIndex
                    ? 'feedback-correct'
                    : 'feedback-incorrect'
                }`}
              >
                <strong>
                  {selected === question.correctIndex ? 'Correct!' : 'Not quite.'}
                </strong>
                <p>{question.explanation}</p>
              </div>
              <button className="btn btn-primary" onClick={handleNext}>
                {questionIndex + 1 < data.checkQuestions.length
                  ? 'Next Question'
                  : 'Continue'}
              </button>
            </>
          )}
        </div>
      )}
      {allDone && onContinue && (
        <button className="btn btn-primary" onClick={onContinue}>
          Continue
        </button>
      )}
    </div>
  );
}
