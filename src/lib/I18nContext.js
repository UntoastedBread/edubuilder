'use client';

import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { detectLocale, getTranslator } from './i18n/index';

const STORAGE_KEY = 'edubuilder_locale';

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState('en');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setLocaleState(stored);
    } else {
      const detected = detectLocale();
      setLocaleState(detected);
      localStorage.setItem(STORAGE_KEY, detected);
    }
    setLoaded(true);
  }, []);

  function setLocale(code) {
    setLocaleState(code);
    localStorage.setItem(STORAGE_KEY, code);
  }

  const t = useMemo(() => getTranslator(locale), [locale]);

  if (!loaded) return null;

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
