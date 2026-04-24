'use client';

import { useState, useEffect } from 'react';

export default function AppRail() {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('railOpen');
    if (saved === 'false') setOpen(false);
  }, []);

  const toggle = () => {
    setOpen(prev => {
      localStorage.setItem('railOpen', String(!prev));
      return !prev;
    });
  };

  return (
    <aside className={`app-rail${open ? ' rail-open' : ''}`}>

      {/* Logo / toggle */}
      <div className="rail-logo-row" onClick={toggle} title={open ? 'Collapse sidebar' : 'Expand sidebar'}>
        <span className="logo-glyph">E</span>
        <span className="logo-toggle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2"/>
            <line x1="9" y1="4" x2="9" y2="20"/>
          </svg>
        </span>
      </div>

      {/* Primary nav */}
      <button className="rail-btn" data-tip-title="New lesson" data-tip-sub="Start a blank build">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        <span className="lbl">New</span>
        <div className="rail-tooltip"><div className="t-title">New lesson</div><div className="t-sub">Start a blank build</div></div>
      </button>

      <button className="rail-btn active" data-tip-title="Build" data-tip-sub="Current lesson">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        <span className="lbl">Build</span>
        <div className="rail-tooltip"><div className="t-title">Build</div><div className="t-sub">Current lesson</div></div>
      </button>

      <button className="rail-btn" data-tip-title="Library" data-tip-sub="42 lessons · 3 drafts">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
        <span className="lbl">Library</span>
        <div className="rail-tooltip"><div className="t-title">Library</div><div className="t-sub">42 lessons · 3 drafts</div></div>
      </button>

      <button className="rail-btn" data-tip-title="Classes" data-tip-sub="4 classes · 112 students">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <span className="lbl">Classes</span>
        <div className="rail-tooltip"><div className="t-title">Classes</div><div className="t-sub">4 classes · 112 students</div></div>
      </button>

      <button className="rail-btn" data-tip-title="Insights" data-tip-sub="2 struggling students this week">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        <span className="lbl">Insights</span>
        <div className="rail-tooltip"><div className="t-title">Insights</div><div className="t-sub">2 struggling students this week</div></div>
      </button>

      <button className="rail-btn" data-tip-title="History" data-tip-sub="Recent lesson drafts">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/><polyline points="12 7 12 12 16 14"/></svg>
        <span className="lbl">History</span>
        <div className="rail-tooltip"><div className="t-title">History</div><div className="t-sub">Recent lesson drafts</div></div>
      </button>

      {/* Recent list (expanded only) */}
      <div className="rail-section-label">Recent</div>
      <nav className="rail-history">
        <a className="rail-history-item">Photosynthesis — the essentials</a>
        <a className="rail-history-item">Cell respiration quick check</a>
        <a className="rail-history-item">NCEA 1.3 practice exam</a>
        <a className="rail-history-item">Mitosis vs meiosis recap</a>
        <a className="rail-history-item">Genetics — Punnett squares</a>
        <a className="rail-history-item">Ecology food webs intro</a>
        <a className="rail-history-item">DNA structure worksheet</a>
        <a className="rail-history-item">Year 10 biology diagnostic</a>
        <a className="rail-history-item">Homeostasis lesson plan</a>
        <a className="rail-history-item">Animal cells lab writeup</a>
        <a className="rail-history-item">Plant transport recap</a>
        <a className="rail-history-item">Evolution intro slides</a>
      </nav>

      <div className="rail-spacer" />

      {/* Upgrade pill */}
      <button className="rail-upgrade">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="16 12 12 8 8 12"/><line x1="12" y1="16" x2="12" y2="8"/></svg>
        <span className="lbl">Upgrade plan</span>
      </button>

      {/* Footer */}
      <div className="rail-footer">
        <div className="rail-avatar">J</div>
        <span className="rail-footer-name">Jane Doe</span>
        <div className="rail-bell">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        </div>
      </div>
    </aside>
  );
}
