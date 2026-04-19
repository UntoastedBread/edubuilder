'use client';

export default function ProgressBar({ current, total }) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="progress-bar-container">
      <div className="progress-bar">
        <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
      </div>
      <span className="progress-bar-label">{percent}%</span>
    </div>
  );
}
