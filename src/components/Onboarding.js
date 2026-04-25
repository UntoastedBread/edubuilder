'use client';

import { useMode } from '@/lib/ModeContext';

const OPTIONS = [
  {
    mode: 'teacher',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    label: "I'm a Teacher",
    subtitle: 'Build lessons for your students',
  },
  {
    mode: 'learner',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
    label: "I'm a Student",
    subtitle: 'Learn at your own pace',
  },
  {
    mode: 'explorer',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
      </svg>
    ),
    label: 'Just Exploring',
    subtitle: 'See what EduBuilder can do',
  },
];

export default function Onboarding() {
  const { showOnboarding, setMode } = useMode();

  if (!showOnboarding) return null;

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        <h2 className="onboarding-title">Welcome to EduBuilder</h2>
        <p className="onboarding-subtitle">How will you use EduBuilder?</p>
        <div className="onboarding-options">
          {OPTIONS.map((opt) => (
            <button
              key={opt.mode}
              className="onboarding-option"
              onClick={() => setMode(opt.mode)}
            >
              <span className="onboarding-option-icon">{opt.icon}</span>
              <span className="onboarding-option-label">{opt.label}</span>
              <span className="onboarding-option-sub">{opt.subtitle}</span>
            </button>
          ))}
        </div>
        <p className="onboarding-footnote">You can change this anytime in settings.</p>
      </div>
    </div>
  );
}
