'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_KEY = 'edubuilder_mode';
const VALID_MODES = ['teacher', 'learner', 'explorer'];

const ModeContext = createContext(null);

export function ModeProvider({ children }) {
  const [mode, setModeState] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && VALID_MODES.includes(stored)) {
      setModeState(stored);
    } else {
      setShowOnboarding(true);
    }
    setLoaded(true);
  }, []);

  function setMode(newMode) {
    if (!VALID_MODES.includes(newMode)) return;
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
    setShowOnboarding(false);
  }

  if (!loaded) return null;

  return (
    <ModeContext.Provider value={{
      mode: mode || 'explorer',
      setMode,
      isTeacher: mode === 'teacher',
      isLearner: mode === 'learner',
      showOnboarding,
    }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error('useMode must be used within ModeProvider');
  return ctx;
}
