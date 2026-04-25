'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useMode } from '@/lib/ModeContext';
import { useI18n } from '@/lib/I18nContext';
import { useTheme } from '@/lib/ThemeContext';
import { SUPPORTED_LOCALES } from '@/lib/i18n/index';

export default function AppRail({ forceClose }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const [langOpen, setLangOpen] = useState(false);
  const { mode } = useMode();
  const { t, locale, setLocale } = useI18n();
  const { theme, cycle } = useTheme();

  useEffect(() => {
    localStorage.setItem('railOpen', 'true');
  }, []);

  useEffect(() => {
    if (forceClose) {
      setOpen(false);
      localStorage.setItem('railOpen', 'false');
    }
  }, [forceClose]);

  const toggle = () => {
    setOpen(prev => {
      localStorage.setItem('railOpen', String(!prev));
      return !prev;
    });
  };

  const isTeacher = mode === 'teacher';

  // Diverse recent examples (not NZ-only)
  const recentLessons = [
    'Quadratic equations practice',
    'Creative writing workshop',
    'Chemical bonding basics',
    'Introduction to ecosystems',
    'The French Revolution',
    'Forces and motion',
    'Fractions and decimals',
    'World War II overview',
    'Cell structure and function',
    'Python programming intro',
    'Climate change science',
    'Literary analysis: poetry',
  ];

  return (
    <aside className={`app-rail${open ? ' rail-open' : ''}`}>

      {/* Logo / toggle */}
      <div className="rail-logo-row">
        <span className="logo-glyph">E</span>
        {open && (
          <button className="rail-toggle-btn" onClick={toggle} title="Collapse sidebar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="16" rx="2"/>
              <line x1="9" y1="4" x2="9" y2="20"/>
            </svg>
          </button>
        )}
      </div>
      {!open && (
        <button className="rail-expand-btn" onClick={toggle} title="Expand sidebar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2"/>
            <line x1="9" y1="4" x2="9" y2="20"/>
          </svg>
        </button>
      )}

      {/* Shared nav: New */}
      <button className="rail-btn" data-tip-title={t('nav.new')} data-tip-sub={t('nav.new.sub')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        <span className="lbl">{t('nav.new')}</span>
        <div className="rail-tooltip"><div className="t-title">{t('nav.new')}</div><div className="t-sub">{t('nav.new.sub')}</div></div>
      </button>

      {/* Shared: Build */}
      <button className={`rail-btn${pathname === '/build' ? ' active' : ''}`} onClick={() => router.push('/build')} data-tip-title={t('nav.build')} data-tip-sub={t('nav.build.sub')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        <span className="lbl">{t('nav.build')}</span>
        <div className="rail-tooltip"><div className="t-title">{t('nav.build')}</div><div className="t-sub">{t('nav.build.sub')}</div></div>
      </button>

      {/* Shared: Library */}
      <button className={`rail-btn${pathname === '/library' ? ' active' : ''}`} onClick={() => router.push('/library')} data-tip-title={t('nav.library')} data-tip-sub={t('nav.library.sub')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
        <span className="lbl">{t('nav.library')}</span>
        <div className="rail-tooltip"><div className="t-title">{t('nav.library')}</div><div className="t-sub">{t('nav.library.sub')}</div></div>
      </button>

      {/* Teacher-only: Classes */}
      {isTeacher && (
        <button className="rail-btn" data-tip-title={t('nav.classes')} data-tip-sub={t('nav.classes.sub')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <span className="lbl">{t('nav.classes')}</span>
          <div className="rail-tooltip"><div className="t-title">{t('nav.classes')}</div><div className="t-sub">{t('nav.classes.sub')}</div></div>
        </button>
      )}

      {/* Teacher-only: Insights */}
      {isTeacher && (
        <button className="rail-btn" data-tip-title={t('nav.insights')} data-tip-sub={t('nav.insights.sub')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          <span className="lbl">{t('nav.insights')}</span>
          <div className="rail-tooltip"><div className="t-title">{t('nav.insights')}</div><div className="t-sub">{t('nav.insights.sub')}</div></div>
        </button>
      )}

      {/* Learner-only: My Lessons */}
      {!isTeacher && (
        <button className="rail-btn" data-tip-title={t('nav.myLessons')} data-tip-sub={t('nav.myLessons.sub')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          <span className="lbl">{t('nav.myLessons')}</span>
          <div className="rail-tooltip"><div className="t-title">{t('nav.myLessons')}</div><div className="t-sub">{t('nav.myLessons.sub')}</div></div>
        </button>
      )}

      {/* Learner-only: Progress */}
      {!isTeacher && (
        <button className="rail-btn" data-tip-title={t('nav.progress')} data-tip-sub={t('nav.progress.sub')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          <span className="lbl">{t('nav.progress')}</span>
          <div className="rail-tooltip"><div className="t-title">{t('nav.progress')}</div><div className="t-sub">{t('nav.progress.sub')}</div></div>
        </button>
      )}

      {/* Shared: History */}
      <button className="rail-btn" data-tip-title={t('nav.history')} data-tip-sub={t('nav.history.sub')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/><polyline points="12 7 12 12 16 14"/></svg>
        <span className="lbl">{t('nav.history')}</span>
        <div className="rail-tooltip"><div className="t-title">{t('nav.history')}</div><div className="t-sub">{t('nav.history.sub')}</div></div>
      </button>

      {/* Recent list (expanded only) */}
      <div className="rail-section-label">Recent</div>
      <nav className="rail-history">
        {recentLessons.map((lesson, i) => (
          <a key={i} className="rail-history-item">{lesson}</a>
        ))}
      </nav>

      <div className="rail-bottom">
        {/* Theme toggle */}
        <button
          className="rail-btn theme-toggle-btn"
          onClick={cycle}
          aria-label={theme === 'light' ? 'Switch to dark mode' : theme === 'dark' ? 'Switch to system theme' : 'Switch to light mode'}
          title={theme === 'light' ? 'Dark mode' : theme === 'dark' ? 'System' : 'Light mode'}
        >
          {theme === 'light' && (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          )}
          {theme === 'dark' && (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          )}
          {theme === 'system' && (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          )}
          <span className="lbl">{theme === 'light' ? 'Dark mode' : theme === 'dark' ? 'System' : 'Light mode'}</span>
        </button>

        {/* Language selector */}
        <div className="lang-selector-wrap">
          <button className="lang-selector-btn" onClick={() => setLangOpen(!langOpen)} title="Language">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            <span className="lbl">{SUPPORTED_LOCALES.find(l => l.code === locale)?.label || 'English'}</span>
          </button>
          {langOpen && (
            <div className="lang-dropdown">
              {SUPPORTED_LOCALES.map((lang) => (
                <button
                  key={lang.code}
                  className={`lang-option${locale === lang.code ? ' active' : ''}`}
                  onClick={() => { setLocale(lang.code); setLangOpen(false); }}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Upgrade pill */}
        <button className="rail-upgrade">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="16 12 12 8 8 12"/><line x1="12" y1="16" x2="12" y2="8"/></svg>
          <span className="lbl">{t(`upgrade.${mode}`)}</span>
        </button>

        {/* Footer */}
        <div className="rail-footer">
          <div className="rail-avatar">J</div>
          <span className="rail-footer-name">Jane Doe</span>
          <div className="rail-bell">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </div>
        </div>
      </div>
    </aside>
  );
}
